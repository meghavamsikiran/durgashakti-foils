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

  const detect = useCallback(async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return null;
    }

    setLoading(true);

    try {
      let position = null;

      // 1. Request real GPS coordinates directly from browser
      try {
        position = await getPosition({
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      } catch (err1) {
        console.warn("High accuracy geolocation failed/timed out, trying standard accuracy:", err1);
        try {
          position = await getPosition({
            enableHighAccuracy: false,
            timeout: 8000,
            maximumAge: 60000,
          });
        } catch (err2) {
          if (err2.code === 1) {
            toast.error("Location permission denied. Please allow location access in your browser settings.");
          } else if (err2.code === 2) {
            toast.error("Location position unavailable. Please enter your address manually.");
          } else if (err2.code === 3) {
            toast.error("Location request timed out. Please enter your address manually.");
          } else {
            toast.error("Could not fetch location. Please enter address manually.");
          }
          return null;
        }
      }

      if (!position || !position.coords) {
        toast.error("Unable to obtain GPS coordinates from browser.");
        return null;
      }

      const { latitude, longitude } = position.coords;
      console.log(`REAL GPS Coords acquired: Lat ${latitude}, Lon ${longitude}`);

      // 2. Query backend reverse-geocoding service (which proxies BigDataCloud & OpenStreetMap Nominatim)
      try {
        const res = await apiClient.get(`/geolocation/reverse-geocode?lat=${latitude}&lon=${longitude}`, { silent: true });
        const data = res.data || {};

        if (data.city || data.state || data.locality || data.pincode) {
          const pincode = data.pincode || '';
          const state = data.state || '';
          const city = data.city || '';
          const locality = data.locality || '';
          const address_line1 = data.address_line1 || '';
          const address_line2 = data.address_line2 || locality;

          const locationName = locality || city || state || 'Current Location';
          toast.success(`Location detected: ${locationName}`);

          return {
            pincode,
            state,
            city,
            address_line1: address_line1 !== locality ? address_line1 : '',
            address_line2: address_line2,
          };
        }
      } catch (backendErr) {
        console.warn("Backend reverse-geocode failed, attempting client-side Nominatim:", backendErr);
      }

      // 3. Direct client-side OpenStreetMap Nominatim fallback
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
          const address = osmData.address || {};

          const pincode = address.postcode || '';
          const state = address.state || '';
          let city = address.city || address.town || address.village || address.municipality || address.district || address.state_district || address.county || '';
          let locality = address.suburb || address.neighbourhood || address.residential || address.subdistrict || address.quarter || address.commercial || address.industrial || '';
          let road = [address.house_number, address.building, address.road].filter(Boolean).join(', ');

          if (city || state || locality || pincode) {
            const locationName = locality || city || state || 'Current Location';
            toast.success(`Location detected: ${locationName}`);

            return {
              pincode,
              state,
              city,
              address_line1: road,
              address_line2: locality,
            };
          }
        }
      } catch (osmErr) {
        console.warn("Client-side Nominatim reverse geocode failed:", osmErr);
      }

      // 4. Direct client-side BigDataCloud fallback
      try {
        const bdcRes = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
        );
        if (bdcRes.ok) {
          const bdcData = await bdcRes.json();
          const city = bdcData.city || bdcData.locality || bdcData.principalSubdivision || '';
          const state = bdcData.principalSubdivision || '';
          const locality = bdcData.locality || '';
          const pincode = bdcData.postcode || '';

          if (city || state || locality) {
            const locationName = locality || city || state || 'Current Location';
            toast.success(`Location detected: ${locationName}`);
            return {
              pincode,
              state,
              city,
              address_line1: '',
              address_line2: locality,
            };
          }
        }
      } catch (bdcErr) {
        console.warn("Client-side BigDataCloud reverse geocode failed:", bdcErr);
      }

      toast.error("Could not fetch address details for your GPS coordinates. Please fill manually.");
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
