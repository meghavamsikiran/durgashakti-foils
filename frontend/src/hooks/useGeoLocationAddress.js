import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '../services/core/apiClient';

// Layer 2: India Post official pincode API (authoritative client-side validation)
const validateWithIndiaPost = async (pincode) => {
  if (!pincode || pincode.length !== 6) return null;
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
    const data = await res.json();
    if (data?.[0]?.Status === 'Success' && data[0].PostOffice?.length > 0) {
      const po = data[0].PostOffice[0];
      return {
        pincode,
        state: po.State,
        city: po.District,
        locality: po.Name,
      };
    }
  } catch (_) {}
  return null;
};

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
            
            // Query our Backend proxy to handle Geocoding cleanly, preventing CORS issues
            let geocoded = null;
            try {
              const res = await apiClient.get(`/geolocation/reverse-geocode?lat=${latitude}&lon=${longitude}`);
              if (res.data) {
                geocoded = {
                  source: res.data.source || "Backend Proxy",
                  pincode: res.data.pincode,
                  city: res.data.city,
                  state: res.data.state,
                  address_line1: res.data.address_line1,
                  address_line2: res.data.address_line2
                };
              }
            } catch (e) {
              console.warn("Backend proxy geocoding failed:", e);
            }

            if (!geocoded) {
              throw new Error('Failed to retrieve valid geocoded address.');
            }

            let pin = geocoded.pincode;
            let city = geocoded.city;
            let state = geocoded.state;
            let locality = geocoded.locality || '';
            const source = geocoded.source;

            // ── Cross-Validate with India Post API ───────────────────────
            let indiaPostData = await validateWithIndiaPost(pin);

            if (!indiaPostData && pin.length === 6) {
              const stateUpper = (state || '').toLowerCase();
              const corrections = [];
              if (/telangana|andhra/.test(stateUpper)) {
                corrections.push('5' + pin.slice(1));
              } else if (/maharashtra/.test(stateUpper)) {
                corrections.push('4' + pin.slice(1));
              } else if (/karnataka/.test(stateUpper)) {
                corrections.push('5' + pin.slice(1), '6' + pin.slice(1));
              } else if (/tamil|kerala/.test(stateUpper)) {
                corrections.push('6' + pin.slice(1));
              } else if (/delhi/.test(stateUpper)) {
                corrections.push('1' + pin.slice(1));
              }

              for (const candidate of corrections) {
                const validated = await validateWithIndiaPost(candidate);
                if (validated) {
                  indiaPostData = validated;
                  pin = candidate;
                  break;
                }
              }
            }

            if (indiaPostData) {
              city = indiaPostData.city || city;
              state = indiaPostData.state || state;
              if (!locality && indiaPostData.locality) locality = indiaPostData.locality;
              console.info(`Pincode validated via India Post (${source} coords → IndiaPost)`);
            }

            toast.success("Location auto-detected successfully!");
            resolve({
              pincode: pin,
              state,
              city,
              address_line1: geocoded.address_line1 || '',
              address_line2: geocoded.address_line2 || locality,
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
