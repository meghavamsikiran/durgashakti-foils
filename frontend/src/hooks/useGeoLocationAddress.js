import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '../services/core/apiClient';

export const useGeoLocationAddress = () => {
  const [loading, setLoading] = useState(false);

  const detect = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        toast.error('Geolocation is not supported by your browser');
        return reject('Not supported');
      }

      setLoading(true);

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            
            // All geocoding logic runs on the backend:
            // Mappls → BigDataCloud → Nominatim → India Post validation
            const res = await apiClient.get(`/geolocation/reverse-geocode?lat=${latitude}&lon=${longitude}`);
            
            if (!res.data || !res.data.pincode) {
              throw new Error('Failed to retrieve valid geocoded address.');
            }

            const { source, pincode, city, state, locality, address_line1, address_line2 } = res.data;
            console.info(`Location detected via ${source}`);

            toast.success("Location auto-detected successfully!");
            resolve({
              pincode,
              state,
              city,
              address_line1: address_line1 || '',
              address_line2: address_line2 || locality || '',
            });
          } catch (err) {
            console.error('Location detection failed:', err);
            toast.error('Failed to detect location. Please enter your address manually.');
            reject(err);
          } finally {
            setLoading(false);
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          const msg =
            error.code === 1
              ? 'Location access denied. Please allow location in browser settings.'
              : error.code === 2
              ? 'Location unavailable. Try again in a few seconds.'
              : 'Location request timed out. Please try again.';
          toast.error(msg);
          setLoading(false);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );
    });
  }, []);

  return { detect, loading };
};
