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
        maximumAge: 600000, // 10 min cache for instant response
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

      // 1. Try standard Wi-Fi positioning first (enableHighAccuracy: false - instant on desktop Chrome without macOS GPS blocks)
      try {
        position = await tryGetPosition(false, 6000);
      } catch (err1) {
        console.warn("Standard Wi-Fi location failed/timed out, trying high accuracy...", err1);
        // 2. Try high accuracy
        try {
          position = await tryGetPosition(true, 6000);
        } catch (err2) {
          console.warn("High accuracy location also failed/timed out:", err2);
        }
      }

      if (position?.coords) {
        const { latitude, longitude } = position.coords;
        console.info(`Coordinates received: lat=${latitude}, lon=${longitude}`);

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
              address_line2: address_line2 || '',
            };
          }
        } catch (apiErr) {
          console.warn("Reverse geocoding API error:", apiErr);
        }
      }

      // 3. Fallback: If browser location permission is blocked or timed out, detect City via freeipapi
      try {
        const ipRes = await fetch('https://freeipapi.com/api/json');
        if (ipRes.ok) {
          const ipData = await ipRes.json();
          if (ipData && (ipData.cityName || ipData.regionName)) {
            toast.success(`Location detected: ${ipData.cityName}, ${ipData.regionName}`);
            return {
              pincode: ipData.zipCode || '',
              state: ipData.regionName || '',
              city: ipData.cityName || '',
              address_line1: ipData.cityName ? `${ipData.cityName}, ${ipData.regionName}` : '',
              address_line2: '',
            };
          }
        }
      } catch (e) {
        console.warn("City IP fallback error:", e);
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
