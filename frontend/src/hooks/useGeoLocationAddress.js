import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '../services/core/apiClient';

export const useGeoLocationAddress = () => {
  const [loading, setLoading] = useState(false);

  const fetchIpFallback = async () => {
    try {
      const res = await fetch('https://ipapi.co/json/');
      if (!res.ok) return null;
      const data = await res.json();
      if (data && (data.postal || data.city || data.region)) {
        return {
          pincode: data.postal || '',
          state: data.region || '',
          city: data.city || '',
          address_line1: data.city ? `${data.city}, ${data.region}` : '',
          address_line2: data.org || '',
        };
      }
    } catch (e) {
      console.warn('IP fallback failed:', e);
    }
    return null;
  };

  const getCoordinates = (enableHighAcc, timeoutMs) => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error('Not supported'));
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: enableHighAcc,
        timeout: timeoutMs,
        maximumAge: 300000,
      });
    });
  };

  const detect = useCallback(async () => {
    setLoading(true);

    try {
      let position = null;

      // 1. Fast low-accuracy positioning (3.5s timeout - instant on desktop Chrome)
      try {
        position = await getCoordinates(false, 3500);
      } catch (err1) {
        console.warn('Fast low-accuracy geolocation failed, trying high-accuracy...', err1);
        // 2. High-accuracy positioning (4.5s timeout)
        try {
          position = await getCoordinates(true, 4500);
        } catch (err2) {
          console.warn('High-accuracy geolocation failed:', err2);
        }
      }

      if (position?.coords) {
        const { latitude, longitude } = position.coords;
        try {
          const res = await apiClient.get(`/geolocation/reverse-geocode?lat=${latitude}&lon=${longitude}`);
          const data = res.data || {};

          if (data.pincode || data.city || data.state) {
            const { pincode, city, state, locality, address_line1, address_line2 } = data;
            toast.success(`Location detected: ${locality || city || 'Current Location'}`);
            return {
              pincode: pincode || '',
              state: state || '',
              city: city || '',
              address_line1: address_line1 || locality || '',
              address_line2: address_line2 || '',
            };
          }
        } catch (apiErr) {
          console.warn('Reverse geocoding API error:', apiErr);
        }
      }

      // 3. Fallback to IP network location if HTML5 Geolocation timed out or failed
      console.info('HTML5 Geolocation unavailable/timed out, using IP Location fallback...');
      const ipData = await fetchIpFallback();
      if (ipData) {
        toast.success(`Location detected via network (${ipData.city || ipData.state})`);
        return ipData;
      }

      toast.error('Could not auto-detect location. Please enter your address manually.');
      return null;
    } catch (err) {
      console.error('Location detection overall error:', err);
      toast.error('Location detection failed. Please enter your address manually.');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { detect, loading };
};
