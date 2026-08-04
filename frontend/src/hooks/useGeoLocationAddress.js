import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '../services/core/apiClient';

export const useGeoLocationAddress = () => {
  const [loading, setLoading] = useState(false);

  const detect = useCallback(async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return null;
    }

    setLoading(true);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            console.info(`GPS location received: lat=${latitude}, lon=${longitude}`);

            const res = await apiClient.get(`/geolocation/reverse-geocode?lat=${latitude}&lon=${longitude}`);
            const data = res.data || {};

            if (data.pincode || data.city || data.state) {
              const { pincode, city, state, locality, address_line1, address_line2 } = data;
              const locationName = locality || city || 'Current Location';
              toast.success(`Location detected: ${locationName}, ${city}`);
              
              resolve({
                pincode: pincode || '',
                state: state || '',
                city: city || '',
                address_line1: address_line1 || locality || '',
                address_line2: address_line2 || '',
              });
            } else {
              toast.error('Could not determine address from GPS coordinates. Please enter manually.');
              resolve(null);
            }
          } catch (err) {
            console.error('Reverse geocoding API error:', err);
            toast.error('Failed to resolve address. Please enter your address details manually.');
            resolve(null);
          } finally {
            setLoading(false);
          }
        },
        (error) => {
          console.error('Browser Geolocation Error:', error);
          setLoading(false);

          if (error.code === 1) {
            toast.error('Location permission denied. Please click the Lock icon in your browser address bar to allow location access.');
          } else if (error.code === 2) {
            toast.error('Location signal unavailable. Please check your device location settings.');
          } else if (error.code === 3) {
            toast.error('GPS request timed out. Please click "Use My Current Location" again.');
          } else {
            toast.error('Location detection failed. Please enter your address details manually.');
          }
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 0,
        }
      );
    });
  }, []);

  return { detect, loading };
};
