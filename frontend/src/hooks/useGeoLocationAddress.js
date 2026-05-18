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
            const pin = data.address.postcode.replace(/\D/g, '').slice(0, 6);
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
              state: data.address.state,
              city: data.address.city || data.address.district || data.address.suburb,
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
      });
    });
  }, []);

  return { detect, loading };
};
