import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '../services/core/apiClient';

/**
 * Maximum GPS accuracy (meters) to consider trustworthy.
 * If GPS accuracy is worse than this, we prefer IP-based results.
 * Typical values:
 *   - Mobile GPS: 5-30m (excellent)
 *   - Desktop WiFi triangulation (good): 50-500m
 *   - Desktop WiFi triangulation (poor): 5,000-50,000m (basically city-level IP)
 */
const GPS_ACCURACY_THRESHOLD = 5000; // 5km

export const useGeoLocationAddress = () => {
  const [loading, setLoading] = useState(false);

  /**
   * watchPosition — keeps listening for up to `timeoutMs` milliseconds.
   * More reliable than getCurrentPosition on desktops.
   */
  const watchForPosition = (timeoutMs = 25000) => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        return reject(new Error('Geolocation not supported'));
      }

      let resolved = false;
      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          navigator.geolocation.clearWatch(watchId);
          reject(new Error('timeout'));
        }
      }, timeoutMs);

      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            navigator.geolocation.clearWatch(watchId);
            resolve(position);
          }
        },
        (err) => {
          if (err.code === 1) {
            // Permission denied — hard stop
            resolved = true;
            clearTimeout(timer);
            navigator.geolocation.clearWatch(watchId);
            reject(err);
          }
          // Other errors: let watchPosition keep retrying until our timer
        },
        {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 300000,
        }
      );
    });
  };

  /**
   * Reverse geocode lat/lon via multiple providers.
   */
  const reverseGeocode = async (latitude, longitude) => {
    // A. Backend (BigDataCloud + Nominatim)
    try {
      const res = await apiClient.get(
        `/geolocation/reverse-geocode?lat=${latitude}&lon=${longitude}`,
        { silent: true }
      );
      const data = res.data || {};
      if (data.city || data.state || data.locality || data.pincode) {
        return {
          pincode: data.pincode || '',
          state: data.state || '',
          city: data.city || '',
          address_line1: (data.address_line1 && data.address_line1 !== data.locality) ? data.address_line1 : '',
          address_line2: data.address_line2 || data.locality || '',
        };
      }
    } catch (err) {
      console.warn("Backend reverse-geocode failed:", err);
    }

    // B. Client Nominatim
    try {
      const osmRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=en`,
        { headers: { 'User-Agent': 'DurgaShaktiFoils/1.0', 'Accept-Language': 'en' } }
      );
      if (osmRes.ok) {
        const osmData = await osmRes.json();
        const a = osmData.address || {};
        const pincode = a.postcode || '';
        const state = a.state || '';
        const city = a.city || a.town || a.village || a.municipality || a.district || a.state_district || a.county || '';
        const locality = a.suburb || a.neighbourhood || a.residential || a.subdistrict || a.quarter || '';
        const road = [a.house_number, a.building, a.road].filter(Boolean).join(', ');
        if (city || state || locality || pincode) {
          return { pincode, state, city, address_line1: road, address_line2: locality };
        }
      }
    } catch (err) {
      console.warn("Client Nominatim failed:", err);
    }

    // C. Client BigDataCloud
    try {
      const bdcRes = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
      );
      if (bdcRes.ok) {
        const d = await bdcRes.json();
        const city = d.city || d.locality || d.principalSubdivision || '';
        const state = d.principalSubdivision || '';
        const locality = d.locality || '';
        const pincode = d.postcode || '';
        if (city || state || locality) {
          return { pincode, state, city, address_line1: '', address_line2: locality };
        }
      }
    } catch (err) {
      console.warn("Client BigDataCloud failed:", err);
    }

    return null;
  };

  /**
   * Fetch IP-based location from backend (which queries 4 providers in parallel).
   */
  const getIpLocation = async () => {
    try {
      const res = await apiClient.get('/geolocation/ip-lookup', { silent: true });
      const data = res.data || {};
      if (data.city || data.state) {
        return data;
      }
    } catch (err) {
      console.warn("Backend IP lookup failed:", err);
    }
    return null;
  };

  const detect = useCallback(async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return null;
    }

    setLoading(true);

    try {
      // ──────────────────────────────────────────────────────────
      // Run GPS and IP lookup IN PARALLEL — don't waste time
      // ──────────────────────────────────────────────────────────
      const gpsPromise = watchForPosition(25000).catch(err => ({ error: err }));
      const ipPromise = getIpLocation();

      const [gpsResult, ipResult] = await Promise.all([gpsPromise, ipPromise]);

      // Evaluate GPS result
      let gpsPosition = null;
      let gpsAccuracy = Infinity;
      let gpsPermissionDenied = false;

      if (gpsResult && !gpsResult.error && gpsResult.coords) {
        gpsPosition = gpsResult;
        gpsAccuracy = gpsResult.coords.accuracy || Infinity;
        console.log(`GPS: ${gpsResult.coords.latitude}, ${gpsResult.coords.longitude} (accuracy: ${gpsAccuracy}m)`);
      } else if (gpsResult?.error) {
        console.warn("GPS failed:", gpsResult.error.message || gpsResult.error);
        if (gpsResult.error.code === 1) gpsPermissionDenied = true;
      }

      // ──────────────────────────────────────────────────────────
      // DECISION LOGIC: Pick the most accurate result
      // ──────────────────────────────────────────────────────────

      // Case 1: GPS succeeded with GOOD accuracy (< 5km) — trust it
      if (gpsPosition && gpsAccuracy < GPS_ACCURACY_THRESHOLD) {
        console.log(`GPS accuracy ${gpsAccuracy}m < ${GPS_ACCURACY_THRESHOLD}m threshold — using GPS`);
        const result = await reverseGeocode(gpsPosition.coords.latitude, gpsPosition.coords.longitude);
        if (result) {
          const name = result.address_line2 || result.city || result.state || 'Current Location';
          toast.success(`📍 Location detected: ${name}`);
          return result;
        }
      }

      // Case 2: GPS succeeded but accuracy is POOR — compare with IP result
      if (gpsPosition && gpsAccuracy >= GPS_ACCURACY_THRESHOLD) {
        console.log(`GPS accuracy ${gpsAccuracy}m >= ${GPS_ACCURACY_THRESHOLD}m threshold — comparing with IP`);

        // If IP result available, reverse-geocode IP coordinates for detail
        if (ipResult && ipResult.latitude && ipResult.longitude) {
          const ipDetailResult = await reverseGeocode(ipResult.latitude, ipResult.longitude);
          const gpsDetailResult = await reverseGeocode(gpsPosition.coords.latitude, gpsPosition.coords.longitude);

          // If both have results, prefer whichever has a more specific pincode
          if (ipDetailResult && gpsDetailResult) {
            // If they agree on city, use GPS result (more detail)
            if (ipDetailResult.city && gpsDetailResult.city && 
                ipDetailResult.city.toLowerCase() === gpsDetailResult.city.toLowerCase()) {
              const name = gpsDetailResult.address_line2 || gpsDetailResult.city || 'Current Location';
              toast.success(`📍 Location detected: ${name}`);
              return gpsDetailResult;
            }
            // They disagree — use IP result (IP consensus from 4 providers is more reliable than poor GPS)
            const name = ipDetailResult.address_line2 || ipDetailResult.city || ipDetailResult.state || 'Current Location';
            toast.success(`📍 Location detected: ${name}`);
            toast.info("Location may not be exact — please verify and correct if needed.", { duration: 5000 });
            return ipDetailResult;
          }

          if (ipDetailResult) {
            const name = ipDetailResult.address_line2 || ipDetailResult.city || ipDetailResult.state || 'Current Location';
            toast.success(`📍 Location detected: ${name}`);
            toast.info("Location may not be exact — please verify and correct if needed.", { duration: 5000 });
            return ipDetailResult;
          }

          if (gpsDetailResult) {
            const name = gpsDetailResult.address_line2 || gpsDetailResult.city || 'Current Location';
            toast.success(`📍 Location detected: ${name}`);
            toast.info("Location may not be exact — please verify and correct if needed.", { duration: 5000 });
            return gpsDetailResult;
          }
        }

        // IP has no coordinates — use GPS result even though accuracy is poor
        const gpsResult2 = await reverseGeocode(gpsPosition.coords.latitude, gpsPosition.coords.longitude);
        if (gpsResult2) {
          const name = gpsResult2.address_line2 || gpsResult2.city || gpsResult2.state || 'Current Location';
          toast.success(`📍 Location detected: ${name}`);
          toast.info("Location may not be exact — please verify and correct if needed.", { duration: 5000 });
          return gpsResult2;
        }
      }

      // Case 3: GPS failed entirely — use IP result
      if (!gpsPosition && ipResult) {
        console.log("GPS unavailable, using IP-based location");

        if (ipResult.latitude && ipResult.longitude) {
          const detailed = await reverseGeocode(ipResult.latitude, ipResult.longitude);
          if (detailed) {
            const name = detailed.address_line2 || detailed.city || detailed.state || 'Current Location';
            toast.success(`📍 Location detected: ${name}`);
            toast.info("Location may not be exact — please verify and correct if needed.", { duration: 5000 });
            return detailed;
          }
        }

        // Use raw IP result
        const name = ipResult.city || ipResult.state || 'Current Location';
        toast.success(`📍 Location detected: ${name}`);
        toast.info("Location may not be exact — please verify and correct if needed.", { duration: 5000 });
        return {
          pincode: ipResult.pincode || '',
          state: ipResult.state || '',
          city: ipResult.city || '',
          address_line1: '',
          address_line2: '',
        };
      }

      // Case 4: Everything failed
      if (gpsPermissionDenied) {
        toast.error(
          "Location permission denied. Click the lock icon 🔒 in address bar → Site settings → Location → Allow, then try again."
        );
      } else {
        toast.error("Could not detect your location. Please enter your address manually.");
      }
      return null;
    } catch (err) {
      console.error('Location detection error:', err);
      toast.error("Location detection failed. Please enter your address manually.");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { detect, loading };
};
