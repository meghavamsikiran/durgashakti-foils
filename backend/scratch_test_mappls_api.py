import requests

def test_mappls():
    lat = 16.5062
    lng = 80.6480
    mappls_api_key = "oewjoirgyxbhtfasqwnkahawwodaowwicufh"
    url = f"https://apis.mappls.com/advancedmaps/v1/{mappls_api_key}/rev_geocode?lat={lat}&lng={lng}"
    
    print(f"Requesting URL: {url}")
    try:
        res = requests.get(url, timeout=10, verify=False)
        print(f"Status Code: {res.status_code}")
        print("Response JSON:")
        print(res.json())
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == '__main__':
    test_mappls()
