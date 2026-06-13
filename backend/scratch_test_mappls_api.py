import requests

def test_mappls():
    lat = 16.5062
    lng = 80.6480
    mappls_api_key = "oewjoirgyxbhtfasqwnkahawwodaowwicufh"

    # New endpoint (post-Aug 2025)
    url = f"https://search.mappls.com/search/address/rev-geocode?lat={lat}&lng={lng}&access_token={mappls_api_key}"
    print(f"[New Endpoint] Requesting URL: {url}")
    try:
        res = requests.get(url, timeout=10)
        print(f"Status Code: {res.status_code}")
        print("Response JSON:")
        print(res.json())
    except Exception as e:
        print(f"Request failed: {e}")

    print("\n---\n")

    # Legacy endpoint fallback
    legacy_url = f"https://apis.mappls.com/advancedmaps/v1/{mappls_api_key}/rev_geocode?lat={lat}&lng={lng}"
    print(f"[Legacy Endpoint] Requesting URL: {legacy_url}")
    try:
        res = requests.get(legacy_url, timeout=10, verify=False)
        print(f"Status Code: {res.status_code}")
        print("Response JSON:")
        print(res.json())
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == '__main__':
    test_mappls()
