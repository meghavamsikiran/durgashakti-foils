import requests, json, uuid
r = requests.post('http://localhost:8001/api/auth/login', json={'email': 'superadmin@durgashakti.com', 'password': 'Admin@123'})
token = r.json().get('token')
headers = {'Authorization': f'Bearer {token}'}

r = requests.get('http://localhost:8001/api/products', headers=headers)
p = r.json()[0]
pid = p['id']
pname = p['name']
old_stock = p.get('stock_quantity')
old_sold = p.get('units_sold')

print(f'Before Order: stock={old_stock}, sold={old_sold}')

order_payload = {
    'items': [{'product_id': pid, 'product_name': pname, 'quantity': 10, 'price': 100}],
    'total_amount': 1000,
    'payment_method': 'cod',
    'shipping_address': {'full_name': 'Test', 'phone': '123', 'address_line1': '1', 'city': 'c', 'state': 's', 'pincode': '1'}
}
r = requests.post('http://localhost:8001/api/orders', json=order_payload, headers=headers)
print('Create order:', r.status_code)

r = requests.get('http://localhost:8001/api/products', headers=headers)
p = next(x for x in r.json() if x['id'] == pid)
print(f'After Order (products): stock={p.get("stock_quantity")}, sold={p.get("units_sold")}')

r = requests.get('http://localhost:8001/api/admin/analytics/summary', headers=headers)
inv = next(x for x in r.json().get('inventory', []) if x['id'] == pid)
print(f'After Order (analytics): stock_left={inv.get("stock_left")}, units_sold={inv.get("units_sold")}')

top = next((x for x in r.json().get('best_products', []) if x['name'] == pname), None)
print(f'Top Selling: {top}')
