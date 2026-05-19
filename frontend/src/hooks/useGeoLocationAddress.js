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
            
            // ── Perform Client-Side Reverse Geocoding directly from browser IP ──
            let geocoded = null;

            // Layer 1: Nominatim (High Accuracy)
            try {
              const nomRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1&accept-language=en`);
              if (nomRes.ok) {
                const data = await nomRes.json();
                const a = data.address || {};
                const raw_pincode = (a.postcode || "").replace(" ", "").slice(0, 6);
                const city = a.city || a.district || a.suburb || "";
                const state = a.state || "";
                
                geocoded = {
                  source: "Nominatim",
                  pincode: raw_pincode,
                  city,
                  state,
                  locality: a.suburb || a.neighbourhood || "",
                  sublocality: a.neighbourhood || "",
                  route: a.road || "",
                  building: [a.building, a.house_number, a.amenity].filter(Boolean).join(", ")
                };
              }
            } catch (e) {
              console.warn("Nominatim client-side failed:", e);
            }

            // Layer 2: BigDataCloud Fallback
            if (!geocoded || !geocoded.pincode) {
              try {
                const bdcRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
                if (bdcRes.ok) {
                  const data = await bdcRes.json();
                  const raw_pincode = (data.postcode || "").replace(" ", "").slice(0, 6);
                  const city = data.city || data.locality || "";
                  const state = data.principalSubdivision || "";
                  const locality = data.locality || "";
                  
                  let sublocality = "";
                  let route = "";
                  if (data.localityInfo) {
                    if (data.localityInfo.administrative) {
                      const admin3 = data.localityInfo.administrative.find(a => a.order === 3);
                      if (admin3) sublocality = admin3.name || "";
                    }
                    if (data.localityInfo.informational) {
                      const info0 = data.localityInfo.informational.find(i => i.order === 0);
                      if (info0) route = info0.name || "";
                    }
                  }
                  
                  geocoded = {
                    source: "BigDataCloud",
                    pincode: raw_pincode,
                    city,
                    state,
                    locality,
                    sublocality,
                    route,
                    building: ""
                  };
                }
              } catch (e) {
                console.warn("BigDataCloud client-side failed:", e);
              }
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

            toast.success(`Location detected accurately via ${source}!`);
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
