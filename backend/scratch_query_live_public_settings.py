import urllib.request
import json
import ssl
import sys

# Force UTF-8 output on Windows
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = "https://durgashakti-foils-1.onrender.com/api/settings/public"
print(f"Requesting {url}...")
try:
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, context=ctx, timeout=10) as response:
        status = response.getcode()
        body = response.read().decode('utf-8')
        print(f"Response Status: {status}")
        data = json.loads(body)
        print("Keys in response:", list(data.keys()))
        if "popup_banner" in data:
            print("popup_banner value:", json.dumps(data["popup_banner"], indent=2))
        else:
            print("popup_banner is missing from response!")
except Exception as e:
    print(f"Error requesting: {e}")
