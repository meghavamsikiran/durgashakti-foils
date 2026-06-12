import os
import requests
from fastapi import APIRouter, Query, HTTPException

router = APIRouter(prefix="/api/geolocation")

PINCODE_CACHE = {}

def validate_with_india_post(pincode: str):
    """Authoritative validation and naming from Government India Post database."""
    if not pincode or len(pincode) != 6:
        return None
    if pincode in PINCODE_CACHE:
        return PINCODE_CACHE[pincode]
    try:
        url = f"https://api.postalpincode.in/pincode/{pincode}"
        res = requests.get(url, timeout=1.0)
        if res.status_code == 200:
            data = res.json()
            if data and data[0].get("Status") == "Success" and data[0].get("PostOffice"):
                po = data[0]["PostOffice"][0]
                result = {
                    "pincode": pincode,
                    "state": po.get("State", ""),
                    "city": po.get("District", ""),
                    "locality": po.get("Name", "")
                }
                PINCODE_CACHE[pincode] = result
                return result
    except Exception:
        pass
    return None

@router.get("/reverse-geocode")
def reverse_geocode(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude")
):
    geocoded = None

    # ── Layer 1: Query Mappls Reverse Geocoding API (using MAPPLS_API_KEY from environment) ──
    mappls_api_key = os.environ.get("MAPPLS_API_KEY") or "oewjoirgyxbhtfasqwnkahawwodaowwicufh"
    if mappls_api_key:
        try:
            url = f"https://apis.mappls.com/advancedmaps/v1/{mappls_api_key}/rev_geocode?lat={lat}&lng={lon}"
            res = requests.get(url, timeout=10, verify=False)
            if res.status_code == 200:
                data = res.json()
                if data and data.get("results"):
                    r = data["results"][0]
                    geocoded = {
                        "source": "Mappls",
                        "pincode": (r.get("pincode") or "").replace(" ", "")[:6],
                        "city": r.get("city") or r.get("district") or r.get("subDistrict") or "",
                        "state": r.get("state") or "",
                        "locality": r.get("locality") or r.get("subLocality") or "",
                        "sublocality": r.get("subLocality") or "",
                        "route": r.get("street") or "",
                        "building": ", ".join(filter(None, [r.get("houseNumber"), r.get("houseName")]))
                    }
        except Exception:
            pass

    # ── Layer 2: Query BigDataCloud Fallback ────────
    if not geocoded or not geocoded.get("pincode"):
        try:
            url = f"https://api.bigdatacloud.net/data/reverse-geocode-client?latitude={lat}&longitude={lon}&localityLanguage=en"
            res = requests.get(url, timeout=10)
            if res.status_code == 200:
                data = res.json()
                raw_pincode = (data.get("postcode") or "").replace(" ", "")[:6]
                city = data.get("city") or data.get("locality") or ""
                state = data.get("principalSubdivision") or ""
                locality = data.get("locality") or ""
                
                sublocality = ""
                route = ""
                loc_info = data.get("localityInfo", {})
                for admin in loc_info.get("administrative", []):
                    if admin.get("order") == 3:
                        sublocality = admin.get("name") or ""
                for info in loc_info.get("informational", []):
                    if info.get("order") == 0:
                        route = info.get("name") or ""
                
                geocoded = {
                    "source": "BigDataCloud",
                    "pincode": raw_pincode,
                    "city": city,
                    "state": state,
                    "locality": locality,
                    "sublocality": sublocality,
                    "route": route,
                    "building": ""
                }
        except Exception:
            pass

    # ── Layer 3: Nominatim Fallback if Layer 2 fails ───────────────────────────
    if not geocoded or not geocoded.get("pincode"):
        try:
            url = f"https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lon}&zoom=18&addressdetails=1"
            headers = {"User-Agent": "DurgaShaktiFoilsAPI/1.0"}
            res = requests.get(url, headers=headers, timeout=10)
            if res.status_code == 200:
                data = res.json()
                a = data.get("address", {})
                raw_pincode = (a.get("postcode") or "").replace(" ", "")[:6]
                city = a.get("city") or a.get("district") or a.get("suburb") or ""
                state = a.get("state") or ""
                
                geocoded = {
                    "source": "Nominatim",
                    "pincode": raw_pincode,
                    "city": city,
                    "state": state,
                    "locality": a.get("suburb") or a.get("neighbourhood") or "",
                    "sublocality": a.get("neighbourhood") or "",
                    "route": a.get("road") or "",
                    "building": ", ".join(filter(None, [a.get("building"), a.get("house_number"), a.get("amenity")]))
                }
        except Exception:
            pass

    if not geocoded or not geocoded.get("pincode"):
        raise HTTPException(status_code=500, detail="Geocoding services are temporarily unavailable.")

    pin = geocoded["pincode"]
    city = geocoded["city"]
    state = geocoded["state"]
    locality = geocoded["locality"]

    # ── Layer 3: Authoritative Auto-Healing and Validation via India Post ──────
    india_post_data = validate_with_india_post(pin)

    if not india_post_data and len(pin) == 6:
        # Cross-region typo auto-healing
        state_lower = state.lower()
        corrections = []
        if "telangana" in state_lower or "andhra" in state_lower:
            corrections.append("5" + pin[1:])
        elif "maharashtra" in state_lower:
            corrections.append("4" + pin[1:])
        elif "karnataka" in state_lower:
            corrections.append("5" + pin[1:])
            corrections.append("6" + pin[1:])
        elif "tamil" in state_lower or "kerala" in state_lower:
            corrections.append("6" + pin[1:])
        elif "delhi" in state_lower:
            corrections.append("1" + pin[1:])

        for candidate in corrections:
            validated = validate_with_india_post(candidate)
            if validated:
                india_post_data = validated
                pin = candidate
                break

    if india_post_data:
        city = india_post_data["city"] or city
        state = india_post_data["state"] or state
        if not locality and india_post_data["locality"]:
            locality = india_post_data["locality"]

    # ── Build beautifully parsed, deduplicated address components ──────────────
    line1_parts = [
        geocoded.get("building"),
        geocoded.get("sublocality") if geocoded.get("source") == "Nominatim" else ""
    ]
    line1 = ", ".join(filter(None, line1_parts))

    line2_parts = [
        geocoded.get("route") or geocoded.get("locality") or locality,
        geocoded.get("sublocality") if geocoded.get("source") != "Nominatim" else "",
    ]
    line2 = ", ".join(filter(None, line2_parts))

    return {
        "source": geocoded["source"],
        "pincode": pin,
        "city": city,
        "state": state,
        "address_line1": line1,
        "address_line2": line2
    }
