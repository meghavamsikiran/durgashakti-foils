import requests
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

KEY = "oewjoirgyxbhtfasqwnkahawwodaowwicufh"
LAT = 16.5062
LNG = 80.6480

print("=" * 60)
print("Testing Mappls API key with multiple approaches")
print("=" * 60)

# Approach 1: Key in URL path (legacy)
print("\n[1] Key in URL path (legacy endpoint)")
try:
    url = f"https://apis.mappls.com/advancedmaps/v1/{KEY}/rev_geocode?lat={LAT}&lng={LNG}"
    res = requests.get(url, timeout=10, verify=False)
    print(f"  Status: {res.status_code}")
    print(f"  Response: {res.text[:400]}")
except Exception as e:
    print(f"  Error: {e}")

# Approach 2: Key as Bearer token
print("\n[2] Key as Bearer token in Authorization header")
try:
    url = f"https://apis.mappls.com/advancedmaps/v1/rev_geocode?lat={LAT}&lng={LNG}"
    headers = {"Authorization": f"Bearer {KEY}"}
    res = requests.get(url, headers=headers, timeout=10, verify=False)
    print(f"  Status: {res.status_code}")
    print(f"  Response: {res.text[:400]}")
except Exception as e:
    print(f"  Error: {e}")

# Approach 3: Key as access_token query param on new endpoint  
print("\n[3] Key as access_token on search.mappls.com (new endpoint)")
try:
    url = f"https://search.mappls.com/search/address/rev-geocode?lat={LAT}&lng={LNG}&access_token={KEY}"
    res = requests.get(url, timeout=10, verify=False)
    print(f"  Status: {res.status_code}")
    print(f"  Response: {res.text[:400]}")
except Exception as e:
    print(f"  Error: {e}")

# Approach 4: Key as query param 'key'
print("\n[4] Key as 'key' query param")
try:
    url = f"https://apis.mappls.com/advancedmaps/v1/rev_geocode?lat={LAT}&lng={LNG}&key={KEY}"
    res = requests.get(url, timeout=10, verify=False)
    print(f"  Status: {res.status_code}")
    print(f"  Response: {res.text[:400]}")
except Exception as e:
    print(f"  Error: {e}")

# Approach 5: Key as rest_key query param
print("\n[5] Key as 'rest_key' query param")
try:
    url = f"https://apis.mappls.com/advancedmaps/v1/rev_geocode?lat={LAT}&lng={LNG}&rest_key={KEY}"
    res = requests.get(url, timeout=10, verify=False)
    print(f"  Status: {res.status_code}")
    print(f"  Response: {res.text[:400]}")
except Exception as e:
    print(f"  Error: {e}")

# Approach 6: Try using it as OAuth client_id with empty secret
print("\n[6] Try OAuth token with key as client_id (no secret)")
try:
    token_url = "https://outpost.mappls.com/api/security/oauth/token"
    payload = {
        "grant_type": "client_credentials",
        "client_id": KEY,
        "client_secret": KEY,
    }
    res = requests.post(token_url, data=payload, timeout=10, verify=False)
    print(f"  Status: {res.status_code}")
    print(f"  Response: {res.text[:400]}")
except Exception as e:
    print(f"  Error: {e}")

print("\n" + "=" * 60)
print("Done")
