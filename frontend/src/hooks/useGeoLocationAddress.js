import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '../services/core/apiClient';

export const useGeoLocationAddress = () => {
  const [loading, setLoading] = useState(false);

  const getPosition = (options) => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        return reject(new Error('Geolocation is not supported by your browser'));
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
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
      let gpsError = null;

      // ──────────────────────────────────────────────
      // STEP 1: Try browser GPS geolocation
      // ──────────────────────────────────────────────
      try {
        position = await getPosition({
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 300000, // accept cached positions up to 5 min old
        });
      } catch (err1) {
        console.warn("High accuracy GPS failed:", err1.message);
        try {
          position = await getPosition({
            enableHighAccuracy: false,
            timeout: 15000,
            maximumAge: 600000, // accept cached positions up to 10 min old
          });
        } catch (err2) {
          console.warn("Standard accuracy GPS also failed:", err2.message);
          gpsError = err2;
        }
      }

      // If GPS succeeded, reverse-geocode the coordinates
      if (position?.coords) {
        const { latitude, longitude } = position.coords;
        console.log(`GPS coordinates acquired: ${latitude}, ${longitude}`);

        const result = await reverseGeocode(latitude, longitude);
        if (result) {
          const locationName = result.address_line2 || result.city || result.state || 'Current Location';
          toast.success(`Location detected: ${locationName}`);
          return result;
        }
        // If reverse geocoding failed but we have coords, inform user
        toast.error("Got your GPS position but couldn't resolve address. Please fill manually.");
        return null;
      }

      // ──────────────────────────────────────────────
      // STEP 2: GPS failed — try IP-based geolocation
      // ──────────────────────────────────────────────
      console.log("GPS unavailable, attempting IP-based location...");
      
      try {
        const ipRes = await apiClient.get('/geolocation/ip-lookup', { silent: true });
        const ipData = ipRes.data || {};

        if (ipData.city || ipData.state) {
          // If the IP lookup returned lat/lon, try reverse geocoding for a more detailed address
          if (ipData.latitude && ipData.longitude) {
            const detailed = await reverseGeocode(ipData.latitude, ipData.longitude);
            if (detailed) {
              const locationName = detailed.address_line2 || detailed.city || detailed.state || 'Current Location';
              toast.success(`Location detected via network: ${locationName}`);
              return detailed;
            }
          }

          // Otherwise use the IP lookup data directly
          const locationName = ipData.city || ipData.state || 'Current Location';
          toast.success(`Location detected via network: ${locationName}`);
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

      // ──────────────────────────────────────────────
      // STEP 3: Client-side IP geolocation fallback
      // ──────────────────────────────────────────────
      try {
        const ipApiRes = await fetch('https://ipapi.co/json/', {
          headers: { 'User-Agent': 'DurgaShaktiFoils/1.0' },
        });
        if (ipApiRes.ok) {
          const d = await ipApiRes.json();
          if (d.city || d.region) {
            // If we got lat/lon from IP, try reverse geocoding for better address
            if (d.latitude && d.longitude) {
              const detailed = await reverseGeocode(d.latitude, d.longitude);
              if (detailed) {
                const locationName = detailed.address_line2 || detailed.city || detailed.state || 'Current Location';
                toast.success(`Location detected via network: ${locationName}`);
                return detailed;
              }
            }

            const locationName = d.city || d.region || 'Current Location';
            toast.success(`Location detected via network: ${locationName}`);
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
      if (gpsError?.code === 1) {
        toast.error("Location permission denied. Please allow location access in browser settings, or enter address manually.");
      } else {
        toast.error("Could not detect your location. Please enter your address manually.");
      }
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
