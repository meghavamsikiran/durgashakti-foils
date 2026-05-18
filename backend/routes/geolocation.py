import os
import requests
from fastapi import APIRouter, Query, HTTPException

router = APIRouter(prefix="/api/geolocation")

@router.get("/reverse-geocode")
def reverse_geocode(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude")
):
    google_maps_key = os.environ.get("GOOGLE_MAPS_API_KEY")
    
    # ── Layer 1: Secure Google Maps Reverse Geocoding ─────────────────────────
    if google_maps_key:
        try:
            url = f"https://maps.googleapis.com/maps/api/geocode/json?latlng={lat},{lon}&key={google_maps_key}"
            res = requests.get(url, timeout=10)
            if res.status_code == 200:
                data = res.json()
                if data.get("status") == "OK" and data.get("results"):
                    raw_pincode = ""
                    city = ""
                    state = ""
                    locality = ""
                    sublocality = ""
                    route = ""
                    premise = ""
                    
                    components = data["results"][0].get("address_components", [])
                    for comp in components:
                        types = comp.get("types", [])
                        if "postal_code" in types:
                            raw_pincode = comp.get("long_name", "")
                        if "locality" in types:
                            city = comp.get("long_name", "")
                        if "administrative_area_level_1" in types:
                            state = comp.get("long_name", "")
                        if "sublocality_level_1" in types:
                            locality = comp.get("long_name", "")
                        if "sublocality_level_2" in types:
                            sublocality = comp.get("long_name", "")
                        if "route" in types:
                            route = comp.get("long_name", "")
                        if "premise" in types:
                            premise = comp.get("long_name", "")
                    
                    return {
                        "source": "Google Maps",
                        "pincode": raw_pincode.replace(" ", "")[:6],
                        "city": city,
                        "state": state,
                        "address_line1": premise,
                        "address_line2": ", ".join(filter(None, [route, locality, sublocality]))
                    }
        except Exception as e:
            # Fallback to the next layer on failure
            pass

    # ── Layer 2: BigDataCloud Geocoding ───────────────────────────────────────
    try:
        url = f"https://api.bigdatacloud.net/data/reverse-geocode-client?latitude={lat}&longitude={lon}&localityLanguage=en"
        res = requests.get(url, timeout=10)
        if res.status_code == 200:
            data = res.json()
            raw_pincode = data.get("postcode", "").replace(" ", "")[:6]
            city = data.get("city") or data.get("locality") or ""
            state = data.get("principalSubdivision") or ""
            locality = data.get("locality") or ""
            
            sublocality = ""
            route = ""
            loc_info = data.get("localityInfo", {})
            for admin in loc_info.get("administrative", []):
                if admin.get("order") == 3:
                    sublocality = admin.get("name", "")
            for info in loc_info.get("informational", []):
                if info.get("order") == 0:
                    route = info.get("name", "")

            return {
                "source": "BigDataCloud",
                "pincode": raw_pincode,
                "city": city,
                "state": state,
                "address_line1": "",
                "address_line2": ", ".join(filter(None, [route, locality, sublocality]))
            }
    except Exception as e:
        pass

    # ── Layer 3: Nominatim (OpenStreetMap) Fallback ───────────────────────────
    try:
        url = f"https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lon}&zoom=18&addressdetails=1"
        headers = {"User-Agent": "DurgaShaktiFoilsAPI/1.0"}
        res = requests.get(url, headers=headers, timeout=10)
        if res.status_code == 200:
            data = res.json()
            a = data.get("address", {})
            raw_pincode = a.get("postcode", "").replace(" ", "")[:6]
            city = a.get("city") or a.get("district") or a.get("suburb") or ""
            state = a.get("state") or ""
            
            line1 = ", ".join(filter(None, [a.get("building"), a.get("house_number"), a.get("amenity")]))
            line2 = ", ".join(filter(None, [a.get("road"), a.get("suburb"), a.get("neighbourhood"), a.get("city_district")]))
            
            return {
                "source": "Nominatim",
                "pincode": raw_pincode,
                "city": city,
                "state": state,
                "address_line1": line1,
                "address_line2": line2
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail="Geocoding services are temporarily unavailable.")
