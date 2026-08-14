import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '../services/core/apiClient';

export const useGeoLocationAddress = () => {
  const [loading, setLoading] = useState(false);

  /**
   * Use watchPosition instead of getCurrentPosition — much more reliable on
   * desktops because it keeps listening for a position fix from WiFi/cell
   * triangulation instead of making a single attempt that often times out.
   * Resolves with the first position received, or rejects on timeout/error.
   */
  const watchForPosition = (timeoutMs = 30000) => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        return reject(new Error('Geolocation not supported'));
      }

      let resolved = false;
      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          navigator.geolocation.clearWatch(watchId);
          reject(new Error('Location watch timed out'));
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
          // Permission denied is a hard error — stop immediately
          if (err.code === 1) {
            resolved = true;
            clearTimeout(timer);
            navigator.geolocation.clearWatch(watchId);
            reject(err);
          }
          // For timeout/unavailable, let watchPosition keep trying until our timer expires
          console.warn('watchPosition interim error (still waiting):', err.message);
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
   * Reverse geocode lat/lon coordinates using multiple providers.
   * Returns { pincode, state, city, address_line1, address_line2 } or null.
   */
  const reverseGeocode = async (latitude, longitude) => {
    // A. Try backend reverse-geocode (proxies BigDataCloud + Nominatim)
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

    // B. Direct client-side Nominatim
    try {
      const osmRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=en`,
        {
          headers: {
            'User-Agent': 'DurgaShaktiFoils/1.0 (contact@durgashakti.com)',
            'Accept-Language': 'en',
          },
        }
      );
      if (osmRes.ok) {
        const osmData = await osmRes.json();
        const addr = osmData.address || {};
        const pincode = addr.postcode || '';
        const state = addr.state || '';
        const city = addr.city || addr.town || addr.village || addr.municipality
          || addr.district || addr.state_district || addr.county || '';
        const locality = addr.suburb || addr.neighbourhood || addr.residential
          || addr.subdistrict || addr.quarter || '';
        const road = [addr.house_number, addr.building, addr.road].filter(Boolean).join(', ');

        if (city || state || locality || pincode) {
          return { pincode, state, city, address_line1: road, address_line2: locality };
        }
      }
    } catch (err) {
      console.warn("Client Nominatim failed:", err);
    }

    // C. Direct client-side BigDataCloud
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

  const detect = useCallback(async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return null;
    }

    setLoading(true);

    try {
      let position = null;
      let gpsPermissionDenied = false;

      // ──────────────────────────────────────────────
      // STEP 1: Try browser GPS via watchPosition (30s window)
      // ──────────────────────────────────────────────
      try {
        position = await watchForPosition(30000);
      } catch (err) {
        console.warn("watchPosition failed:", err.message);
        if (err.code === 1 || err.message?.includes('denied')) {
          gpsPermissionDenied = true;
        }
      }

      // If GPS succeeded, reverse-geocode the real coordinates
      if (position?.coords) {
        const { latitude, longitude, accuracy } = position.coords;
        console.log(`GPS coordinates: ${latitude}, ${longitude} (accuracy: ${accuracy}m)`);

        const result = await reverseGeocode(latitude, longitude);
        if (result) {
          const locationName = result.address_line2 || result.city || result.state || 'Current Location';
          toast.success(`📍 Location detected: ${locationName}`);
          return result;
        }
        toast.error("Got GPS position but couldn't resolve address. Please fill manually.");
        return null;
      }

      // ──────────────────────────────────────────────
      // STEP 2: GPS failed — try IP-based geolocation
      // (less precise — city-level only)
      // ──────────────────────────────────────────────
      if (gpsPermissionDenied) {
        toast.error(
          "Location permission denied. Please enable Location in your browser settings (click the lock icon in the address bar → Site settings → Location → Allow), then try again."
        );
        return null;
      }

      console.log("GPS unavailable, trying IP-based location (less precise)...");

      // A. Backend IP lookup (uses real client IP from X-Forwarded-For)
      try {
        const ipRes = await apiClient.get('/geolocation/ip-lookup', { silent: true });
        const ipData = ipRes.data || {};

        if (ipData.city || ipData.state) {
          // Use lat/lon from IP to get better address details
          if (ipData.latitude && ipData.longitude) {
            const detailed = await reverseGeocode(ipData.latitude, ipData.longitude);
            if (detailed) {
              const locationName = detailed.address_line2 || detailed.city || detailed.state || 'Current Location';
              toast.success(`📍 Approximate location: ${locationName}`);
              toast.info("Tip: Enable browser location permission for a more precise address.", { duration: 5000 });
              return detailed;
            }
          }

          const locationName = ipData.city || ipData.state || 'Current Location';
          toast.success(`📍 Approximate location: ${locationName}`);
          toast.info("Tip: Enable browser location permission for a more precise address.", { duration: 5000 });
          return {
            pincode: ipData.pincode || '',
            state: ipData.state || '',
            city: ipData.city || '',
            address_line1: '',
            address_line2: '',
          };
        }
      } catch (ipErr) {
        console.warn("Backend IP lookup failed:", ipErr);
      }

      // B. Client-side IP lookup fallback
      try {
        const ipApiRes = await fetch('https://ipapi.co/json/', {
          headers: { 'User-Agent': 'DurgaShaktiFoils/1.0' },
        });
        if (ipApiRes.ok) {
          const d = await ipApiRes.json();
          if (d.city || d.region) {
            if (d.latitude && d.longitude) {
              const detailed = await reverseGeocode(d.latitude, d.longitude);
              if (detailed) {
                const locationName = detailed.address_line2 || detailed.city || detailed.state || 'Current Location';
                toast.success(`📍 Approximate location: ${locationName}`);
                toast.info("Tip: Enable browser location permission for a more precise address.", { duration: 5000 });
                return detailed;
              }
            }

            const locationName = d.city || d.region || 'Current Location';
            toast.success(`📍 Approximate location: ${locationName}`);
            toast.info("Tip: Enable browser location permission for a more precise address.", { duration: 5000 });
            return {
              pincode: d.postal || '',
              state: d.region || '',
              city: d.city || '',
              address_line1: '',
              address_line2: '',
            };
          }
        }
      } catch (err) {
        console.warn("Client ipapi.co failed:", err);
      }

      // ──────────────────────────────────────────────
      // ALL METHODS FAILED
      // ──────────────────────────────────────────────
      toast.error("Could not detect your location. Please enter your address manually.");
      return null;
    } catch (err) {
      console.error('Location detection overall error:', err);
      toast.error("Location detection failed. Please enter your address manually.");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { detect, loading };
};
