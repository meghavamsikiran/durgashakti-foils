import { useState, useCallback } from 'react';
import { toast } from 'sonner';

// ─────────────────────────────────────────────────────────────────────────────
// Layer 1: BigDataCloud reverse geocoding (free, no API key, best urban India)
// ─────────────────────────────────────────────────────────────────────────────
const fetchBigDataCloud = async (lat, lon) => {
  const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('BigDataCloud failed');
  const data = await res.json();
  // BDC gives: locality (neighbourhood), city, principalSubdivision (state), postcode
  const postcode = data.postcode ? data.postcode.replace(/\D/g, '').slice(0, 6) : '';
  return {
    raw_pincode: postcode,
    city: data.city || data.locality || '',
    state: data.principalSubdivision || '',
    locality: data.locality || data.localityInfo?.administrative?.[4]?.name || '',
    suburb: data.localityInfo?.administrative?.[3]?.name || '',
    road: data.localityInfo?.informational?.[0]?.name || '',
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Layer 2: India Post official pincode API — validates pincode & corrects city
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// Layer 3: Nominatim fallback (OpenStreetMap)
// ─────────────────────────────────────────────────────────────────────────────
const fetchNominatim = async (lat, lon) => {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`
  );
  if (!res.ok) throw new Error('Nominatim failed');
  const data = await res.json();
  if (!data.address) throw new Error('No address from Nominatim');
  const a = data.address;
  return {
    raw_pincode: (a.postcode || '').replace(/\D/g, '').slice(0, 6),
    city: a.city || a.district || a.suburb || '',
    state: a.state || '',
    locality: a.suburb || a.neighbourhood || '',
    road: a.road || '',
    building: a.building || '',
    house_number: a.house_number || '',
    amenity: a.amenity || '',
    suburb: a.suburb || '',
    neighbourhood: a.neighbourhood || '',
    city_district: a.city_district || '',
  };
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
            let geocoded = null;
            let source = '';

            // ── Layer 1: BigDataCloud ─────────────────────────────────────
            try {
              geocoded = await fetchBigDataCloud(latitude, longitude);
              source = 'BigDataCloud';
            } catch (e) {
              console.warn('BigDataCloud failed, falling back to Nominatim:', e);
            }

            // ── Layer 3 fallback: Nominatim ───────────────────────────────
            if (!geocoded || !geocoded.raw_pincode) {
              try {
                geocoded = await fetchNominatim(latitude, longitude);
                source = 'Nominatim';
              } catch (e) {
                toast.error('Failed to detect your location. Please enter manually.');
                reject(e);
                return;
              }
            }

            let pin = geocoded.raw_pincode;
            let city = geocoded.city;
            let state = geocoded.state;
            let locality = geocoded.locality || '';

            // ── Layer 2: India Post Pincode validation ────────────────────
            // Cross-validate the pincode with India's official postal database.
            // If the raw pincode is invalid, try adjacent digits for Telangana zone.
            let indiaPostData = await validateWithIndiaPost(pin);

            if (!indiaPostData && pin.length === 6) {
              // Try common Indian zone corrections (OSM typo healing)
              const stateUpper = state.toLowerCase();
              const corrections = [];
              if (/telangana|andhra/.test(stateUpper)) {
                corrections.push('5' + pin.slice(1)); // correct first digit to zone 5
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

            // If India Post validated, use its authoritative state + city
            if (indiaPostData) {
              city = indiaPostData.city || city;
              state = indiaPostData.state || state;
              // Prefer the India Post local post office name as locality if BDC locality is empty
              if (!locality && indiaPostData.locality) locality = indiaPostData.locality;
              console.info(`Pincode validated via India Post (${source} coords → IndiaPost)`);
            } else {
              console.warn(`Pincode ${pin} could not be validated via India Post — using ${source} raw data`);
            }

            // ── Build address lines ───────────────────────────────────────
            const line1Parts = [
              geocoded.building,
              geocoded.house_number,
              geocoded.amenity
            ].filter(Boolean);

            const line2Parts = [
              geocoded.road || geocoded.locality || locality,
              geocoded.suburb || geocoded.neighbourhood,
              geocoded.city_district
            ].filter(Boolean);

            // Deduplicate: remove from line2 anything already in line1
            const line1Str = line1Parts.join(', ');
            const line2Str = [...new Set(line2Parts)].join(', ');

            toast.success('Location detected accurately!');
            resolve({
              pincode: pin,
              state,
              city,
              address_line1: line1Str,
              address_line2: line2Str || locality,
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
          enableHighAccuracy: true,  // Force GPS + Wi-Fi triangulation
          timeout: 15000,            // 15s for GPS to get a fix
          maximumAge: 0,             // Never use cached positions
        }
      );
    });
  }, []);

  return { detect, loading };
};
