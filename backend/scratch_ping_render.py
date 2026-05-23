import urllib.request
import json

urls = [
    "https://durgashakti-foils-1.onrender.com/api/settings/public",
    "https://durgashakti-foils-1.onrender.com/api/products"
]

for url in urls:
    print(f"Requesting {url}...")
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as response:
            status = response.getcode()
            body = response.read().decode('utf-8')
            print(f"Response Status: {status}")
            print(f"Response Body (truncated): {body[:200]}")
    except Exception as e:
        print(f"Error requesting {url}: {e}")
