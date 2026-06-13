import os
import time
import requests
from fastapi import APIRouter, Query, HTTPException

router = APIRouter(prefix="/api/geolocation")

PINCODE_CACHE = {}

# ── Mappls OAuth2 Token Cache ──────────────────────────────────────────────────
_mappls_token_cache = {"access_token": None, "expires_at": 0}

def get_mappls_access_token():
    """Generate or return cached Mappls OAuth2 access token."""
    now = time.time()
    if _mappls_token_cache["access_token"] and now < _mappls_token_cache["expires_at"]:
        return _mappls_token_cache["access_token"]

    client_id = os.environ.get("MAPPLS_CLIENT_ID", "")
    client_secret = os.environ.get("MAPPLS_CLIENT_SECRET", "")

    # Also support the legacy single API key as client_id
    if not client_id:
        client_id = os.environ.get("MAPPLS_API_KEY", "")

    if not client_id or not client_secret:
        print("[Mappls] Missing MAPPLS_CLIENT_ID / MAPPLS_CLIENT_SECRET environment variables")
        return None

    try:
        token_url = "https://outpost.mappls.com/api/security/oauth/token"
        payload = {
            "grant_type": "client_credentials",
            "client_id": client_id,
            "client_secret": client_secret,
        }
        res = requests.post(token_url, data=payload, timeout=10, verify=False)
        if res.status_code == 200:
            data = res.json()
            token = data.get("access_token")
            # Token is valid for ~24 hours, refresh 1 hour before expiry
            expires_in = data.get("expires_in", 86400)
            _mappls_token_cache["access_token"] = token
            _mappls_token_cache["expires_at"] = now + expires_in - 3600
            print(f"[Mappls] OAuth token generated successfully (expires in {expires_in}s)")
            return token
        else:
            print(f"[Mappls] Token generation failed: {res.status_code} - {res.text[:200]}")
    except Exception as e:
        print(f"[Mappls] Token generation error: {e}")

    return None

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

    # ── Layer 1: Query Mappls Reverse Geocoding API via OAuth2 ──────────────────
    mappls_token = get_mappls_access_token()
    if mappls_token:
        try:
            # Use bearer token with the Mappls reverse geocode endpoint
            rev_url = f"https://apis.mappls.com/advancedmaps/v1/{mappls_token}/rev_geocode?lat={lat}&lng={lon}"
            res = requests.get(rev_url, timeout=10, verify=False)
            print(f"[Mappls] rev_geocode status={res.status_code}")
            if res.status_code == 200:
                data = res.json()
                results = data.get("results") or []
                if results:
                    r = results[0]
                    geocoded = {
                        "source": "Mappls",
                        "pincode": (r.get("pincode") or r.get("area_code") or "").replace(" ", "")[:6],
                        "city": r.get("city") or r.get("district") or r.get("subDistrict") or "",
                        "state": r.get("state") or "",
                        "locality": r.get("locality") or r.get("subLocality") or r.get("area") or "",
                        "sublocality": r.get("subLocality") or r.get("subSubLocality") or "",
                        "route": r.get("street") or r.get("formatted_address") or "",
                        "building": ", ".join(filter(None, [r.get("houseNumber"), r.get("houseName"), r.get("poi")]))
                    }
                    print(f"[Mappls] Success: pin={geocoded['pincode']}, city={geocoded['city']}, state={geocoded['state']}")
            else:
                print(f"[Mappls] rev_geocode failed: {res.text[:300]}")
        except Exception as e:
            print(f"[Mappls] rev_geocode error: {e}")
    else:
        # Fallback: try legacy REST API key directly (for backward compatibility)
        legacy_key = os.environ.get("MAPPLS_API_KEY", "")
        if legacy_key:
            try:
                legacy_url = f"https://apis.mappls.com/advancedmaps/v1/{legacy_key}/rev_geocode?lat={lat}&lng={lon}"
                legacy_res = requests.get(legacy_url, timeout=10, verify=False)
                if legacy_res.status_code == 200:
                    data = legacy_res.json()
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
                else:
                    print(f"[Mappls Legacy] Failed: {legacy_res.status_code} - {legacy_res.text[:200]}")
            except Exception as e:
                print(f"[Mappls Legacy] Error: {e}")

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
    # Only use India Post fallback/validation if geocoding source is not Mappls to preserve Mappls' precise details
    if geocoded.get("source") != "Mappls":
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

    print(f"[Geolocation] Source: {geocoded['source']}, Pincode: {pin}, City: {city}, State: {state}, Locality: {locality}")

    return {
        "source": geocoded["source"],
        "pincode": pin,
        "city": city,
        "state": state,
        "locality": locality,
        "address_line1": line1,
        "address_line2": line2
    }
