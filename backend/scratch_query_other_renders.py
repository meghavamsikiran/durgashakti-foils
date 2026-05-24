import urllib.request
import json
import ssl
import sys

# Force UTF-8 output on Windows
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

domains = [
    "https://durgashakti-foils-1.onrender.com",
    "https://durgashakti-foils.onrender.com",
    "https://durgashakti-api.onrender.com"
]

for base in domains:
    url = f"{base}/api/settings/public"
    print(f"\nRequesting {url}...")
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, context=ctx, timeout=5) as response:
            status = response.getcode()
            body = response.read().decode('utf-8')
            print(f"  Status: {status}")
            data = json.loads(body)
            print("  Keys:", list(data.keys()))
            if "popup_banner" in data:
                print("  popup_banner:", json.dumps(data["popup_banner"]))
            else:
                print("  popup_banner: MISSING")
    except Exception as e:
        print(f"  Error: {e}")
