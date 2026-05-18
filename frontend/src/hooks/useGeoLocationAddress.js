import { useState, useCallback } from 'react';
import { toast } from 'sonner';

export const useGeoLocationAddress = () => {
  const [loading, setLoading] = useState(false);

  const detect = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        toast.error("Geolocation is not supported by your browser");
        return reject("Not supported");
      }

      setLoading(true);
      navigator.geolocation.getCurrentPosition(async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`);
          const data = await res.json();
          
          if (data.address && data.address.postcode) {
            let pin = data.address.postcode.replace(/\D/g, '').slice(0, 6);
            const state = data.address.state || '';
            const city = data.address.city || data.address.district || data.address.suburb || '';

            // Smart Indian Pincode Typo Correction (OSM Wiki database typos)
            if (pin.length === 6) {
              const isTelanganaAP = /telangana|andhra/i.test(state) || /hyderabad|guntur|vijayawada|secunderabad|madhapur/i.test(city);
              if (isTelanganaAP && !pin.startsWith('5')) {
                // If it starts with '8' or another typo digit but maps to Telangana/AP, correct first digit to '5'
                pin = '5' + pin.slice(1);
              }
            }

            const line1 = [
              data.address.building,
              data.address.house_number,
              data.address.amenity
            ].filter(Boolean).join(', ');

            const line2 = [
              data.address.road,
              data.address.suburb,
              data.address.neighbourhood,
              data.address.city_district
            ].filter(Boolean).join(', ');
            
            toast.success("Location detected successfully!");
            resolve({
              pincode: pin,
              state: state,
              city: city || data.address.city || data.address.district || data.address.suburb,
              address_line1: line1,
              address_line2: line2
            });
          } else {
            toast.error("Could not detect pincode for this location");
            reject("Pincode not found");
          }
        } catch (err) {
          console.error("Location detection failed:", err);
          toast.error("Failed to detect location");
          reject(err);
        } finally {
          setLoading(false);
        }
      }, (error) => {
        console.error("Geolocation error:", error);
        toast.error("Location access denied or unavailable");
        setLoading(false);
        reject(error);
      }, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      });
    });
  }, []);

  return { detect, loading };
};
