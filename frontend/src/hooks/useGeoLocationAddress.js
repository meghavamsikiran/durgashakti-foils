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

      // 2. Reverse geocode if GPS coords obtained
      if (position?.coords) {
        const { latitude, longitude } = position.coords;
        console.log("GPS Coordinates acquired:", latitude, longitude);

        // A. Try backend reverse-geocode service first
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
          console.warn("Backend reverse-geocode API failed or non-responsive, trying direct client fetch...", apiErr);
        }

        // B. Direct client-side fetch from BigDataCloud API
        try {
          const bdcRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
          if (bdcRes.ok) {
            const bdcData = await bdcRes.json();
            const city = bdcData.city || bdcData.locality || bdcData.principalSubdivision || '';
            const state = bdcData.principalSubdivision || '';
            const locality = bdcData.locality || bdcData.localityInfo?.informative?.[0]?.name || '';
            const pincode = bdcData.postcode || '';

            if (city || state) {
              const locationName = locality || city;
              toast.success(`Location detected: ${locationName}`);
              return {
                pincode: pincode || '',
                state: state || '',
                city: city || '',
                address_line1: locality || city || '',
                address_line2: locality ? city : '',
              };
            }
          }
        } catch (bdcErr) {
          console.warn("Direct BigDataCloud fetch error:", bdcErr);
        }

        // C. Direct client-side fetch from OpenStreetMap Nominatim
        try {
          const osmRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=en`);
          if (osmRes.ok) {
            const osmData = await osmRes.json();
            const address = osmData.address || {};
            const pincode = address.postcode || '';
            const state = address.state || '';
            let city = address.city || address.town || address.municipality || address.district || address.state_district || '';
            let locality = address.suburb || address.neighbourhood || address.residential || address.quarter || '';
            let road = address.road || '';

            if (city || state || locality) {
              const locationName = locality || city || 'Current Location';
              toast.success(`Location detected: ${locationName}`);
              return {
                pincode: pincode || '',
                state: state || '',
                city: city || '',
                address_line1: locality ? (road ? `${road}, ${locality}` : locality) : (road || city),
                address_line2: locality || '',
              };
            }
          }
        } catch (osmErr) {
          console.warn("Direct OpenStreetMap fetch error:", osmErr);
        }
      }

      toast.error('Unable to fetch address details for your coordinates. Please enter your address details manually.');
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
