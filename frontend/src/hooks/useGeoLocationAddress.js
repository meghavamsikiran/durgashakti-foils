import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '../services/core/apiClient';

export const useGeoLocationAddress = () => {
  const [loading, setLoading] = useState(false);

  const fetchIpLocationFallback = async () => {
    try {
      const res = await fetch('https://ipapi.co/json/');
      if (!res.ok) throw new Error('IP location service unavailable');
      const data = await res.json();
      if (data && (data.postal || data.city || data.region)) {
        toast.success("Location auto-detected via IP network!");
        return {
          pincode: data.postal || '',
          state: data.region || '',
          city: data.city || '',
          address_line1: data.org || '',
          address_line2: data.city ? `${data.city}, ${data.region}` : '',
        };
      }
    } catch (e) {
      console.warn("IP Geolocation fallback failed:", e);
    }
    return null;
  };

  const getPositionPromise = (options) => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        return reject(new Error('Geolocation not supported'));
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
  };

  const detect = useCallback(async () => {
    setLoading(true);
    try {
      let position = null;
      
      // Step 1: Fast Low-accuracy positioning (instant response on macOS / Chrome)
      try {
        position = await getPositionPromise({
          enableHighAccuracy: false,
          timeout: 8000,
          maximumAge: 300000, // Accept cached location up to 5 mins
        });
      } catch (firstErr) {
        console.warn("Fast location positioning timed out or denied, trying high accuracy...", firstErr);
        // Step 2: High-accuracy retry if low accuracy failed
        try {
          position = await getPositionPromise({
            enableHighAccuracy: true,
            timeout: 8000,
            maximumAge: 300000,
          });
        } catch (secondErr) {
          console.warn("High accuracy positioning also failed:", secondErr);
        }
      }

      if (position?.coords) {
        const { latitude, longitude } = position.coords;
        const res = await apiClient.get(`/geolocation/reverse-geocode?lat=${latitude}&lon=${longitude}`);
        if (res.data && (res.data.pincode || res.data.city || res.data.state)) {
          const { source, pincode, city, state, locality, address_line1, address_line2 } = res.data;
          console.info(`Location detected via ${source}`);
          toast.success("Location auto-detected successfully!");
          setLoading(false);
          return {
            pincode: pincode || '',
            state: state || '',
            city: city || '',
            address_line1: address_line1 || '',
            address_line2: address_line2 || locality || '',
          };
        }
      }

      // Step 3: Seamless IP Geolocation Fallback
      console.info("Using IP Geolocation fallback...");
      const ipData = await fetchIpLocationFallback();
      if (ipData) {
        setLoading(false);
        return ipData;
      }

      toast.error('Could not auto-detect location. Please fill in your address manually.');
    } catch (err) {
      console.error('Location detection error:', err);
      toast.error('Location detection failed. Please enter your address manually.');
    } finally {
      setLoading(false);
    }
  }, []);

  return { detect, loading };
};
