import urllib.request, json, ssl, sys
from datetime import datetime, timezone

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

# Check what the public endpoint returns and compare linked_coupons expiry vs real coupon
url = "https://durgashakti-foils-1.onrender.com/api/settings/public"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
resp = urllib.request.urlopen(req, context=ctx, timeout=15)
data = json.loads(resp.read().decode('utf-8'))

banner = data.get('popup_banner', {})
now = datetime.now(timezone.utc)
print(f"Current UTC time: {now.isoformat()}")

for b in banner.get('custom_banners', []):
    print(f"\nBanner: {b.get('title')}")
    print(f"  is_active: {b.get('is_active')}")
    for lc in b.get('linked_coupons', []):
        exp = lc.get('expiry_date')
        is_expired = False
        if exp:
            exp_dt = datetime.fromisoformat(exp)
            is_expired = now >= exp_dt
        print(f"  linked_coupon: code={lc.get('code')}, is_active={lc.get('is_active')}, "
              f"expiry_date={exp}, IS_EXPIRED_NOW={is_expired}")
    
    # The key insight: if the DB coupon was updated with new expiry, 
    # but the linked_coupons snapshot in settings JSON was NOT updated,
    # then the linked_coupons show old (expired) expiry_date while the real coupon 
    # in the DB might be active+not expired, causing it to pass the backend filter
    # but fail the frontend expiry check.
    
print("\n--- Analysis ---")
print("If the banner shows in API response but linked_coupons have expired dates,")
print("it means the DB coupon is active+unexpired (new expiry) BUT the linked_coupons")
print("snapshot stored in popup_banner setting has STALE expiry_date.")
print("Frontend filters by linked_coupons.expiry_date -> sees expired -> shows nothing.")
