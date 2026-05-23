import urllib.request
import json
import ssl
import sys

# Force UTF-8 output on Windows
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

base_url = "https://durgashakti-foils-1.onrender.com/api"

print("Logging in to live Render backend...")
login_url = f"{base_url}/auth/login"
login_data = json.dumps({
    "email": "durgashaktifoils@gmail.com",
    "password": "123456"
}).encode('utf-8')

req = urllib.request.Request(
    login_url,
    data=login_data,
    headers={'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'}
)

try:
    with urllib.request.urlopen(req, context=ctx) as response:
        res_data = json.loads(response.read().decode('utf-8'))
        token = res_data.get("token")
        print(f"Login successful! Token acquired (role: {res_data.get('user', {}).get('role', 'unknown')})")
except Exception as e:
    print("Login failed:", e)
    exit(1)

# Now fetch the order list
print("\nFetching orders list from live backend...")
orders_url = f"{base_url}/admin/orders?page=1&limit=10"
req = urllib.request.Request(
    orders_url,
    headers={'Authorization': f'Bearer {token}', 'User-Agent': 'Mozilla/5.0'}
)

try:
    with urllib.request.urlopen(req, context=ctx) as response:
        res_data = json.loads(response.read().decode('utf-8'))
        items = res_data.get("items", [])
        total = res_data.get("total", 0)
        print(f"Successfully fetched orders. Total: {total}, showing {len(items)} items.")
        
        success_count = 0
        fail_count = 0
        for idx, item in enumerate(items):
            order_id = item.get("id")
            order_number = item.get("order_number")
            
            # Fetch details for this order using UUID
            detail_url = f"{base_url}/admin/orders/{order_id}"
            req_detail = urllib.request.Request(
                detail_url,
                headers={'Authorization': f'Bearer {token}', 'User-Agent': 'Mozilla/5.0'}
            )
            try:
                with urllib.request.urlopen(req_detail, context=ctx) as response_detail:
                    detail_data = json.loads(response_detail.read().decode('utf-8'))
                    timeline_count = len(detail_data.get('timeline', []))
                    customer = detail_data.get('customer', {})
                    order_data = detail_data.get('order', {})
                    print(f"  [OK] {order_number} | Timeline: {timeline_count} | Customer: {customer.get('full_name', 'N/A')} | Payment: {order_data.get('payment_status', 'N/A')}")
                    success_count += 1
            except Exception as ex:
                err_body = ""
                try:
                    err_body = ex.read().decode('utf-8') if hasattr(ex, 'read') else str(ex)
                except:
                    err_body = str(ex)
                print(f"  [FAIL] {order_number} | Error: {err_body[:200]}")
                fail_count += 1
        
        print(f"\n=== Results: {success_count} succeeded, {fail_count} failed out of {len(items)} ===")
except Exception as e:
    err_body = ""
    try:
        err_body = e.read().decode('utf-8') if hasattr(e, 'read') else str(e)
    except:
        err_body = str(e)
    print("Failed to fetch orders list:", err_body[:500])
