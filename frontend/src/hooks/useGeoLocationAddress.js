import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '../services/core/apiClient';

export const useGeoLocationAddress = () => {
  const [loading, setLoading] = useState(false);

  const tryGetPosition = (highAccuracy, timeoutMs) => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error('Not supported'));
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: highAccuracy,
        timeout: timeoutMs,
        maximumAge: 60000,
      });
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

      // 1. Try HTML5 Geolocation with high accuracy
      try {
        position = await tryGetPosition(true, 8000);
      } catch (geoErr) {
        console.warn("High accuracy HTML5 Geolocation failed, trying standard accuracy:", geoErr);
        try {
          position = await tryGetPosition(false, 8000);
        } catch (err2) {
          console.warn("Standard accuracy Geolocation failed:", err2);
        }
      }

      // 2. Reverse geocode via backend if GPS coords obtained
      if (position?.coords) {
        const { latitude, longitude } = position.coords;
        try {
          const res = await apiClient.get(`/geolocation/reverse-geocode?lat=${latitude}&lon=${longitude}`);
          const data = res.data || {};
          if (data.pincode || data.city || data.state) {
            const { pincode, city, state, locality, address_line1, address_line2 } = data;
            const locationName = locality || city || 'Current Location';
            toast.success(`Location detected: ${locationName}`);
            return {
              pincode: pincode || '',
              state: state || '',
              city: city || '',
              address_line1: address_line1 || locality || '',
              address_line2: address_line2 || locality || '',
            };
          }
        } catch (apiErr) {
          console.warn("Backend reverse-geocode API error:", apiErr);
        }
      }

      // 3. Fallback: Backend IP lookup
      console.info("Using backend IP-lookup fallback...");
      try {
        const ipRes = await apiClient.get('/geolocation/ip-lookup');
        const ipData = ipRes.data || {};
        if (ipData.pincode || ipData.city || ipData.state) {
          toast.success(`Location auto-detected: ${ipData.city || ipData.state}`);
          return {
            pincode: ipData.pincode || '',
            state: ipData.state || '',
            city: ipData.city || '',
            address_line1: ipData.address_line1 || '',
            address_line2: ipData.address_line2 || '',
          };
        }
      } catch (ipErr) {
        console.warn("Backend IP-lookup error:", ipErr);
      }

      toast.error('Could not auto-detect location. Please enter your address details manually.');
      return null;
    } catch (err) {
      console.error('Location detection overall error:', err);
      toast.error('Location detection failed. Please enter your address details manually.');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { detect, loading };
};
