import asyncio
import uuid
import time
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client.durgashaktifoils_db
    
    # Fix the rejected order - add admin message
    result = await db.orders.update_one(
        {'order_number': 'ORD-1778105502-e9f14d27'},
        {'$set': {'admin_message': 'After reviewing your return request, we found that the product does not meet our return eligibility criteria. The product appears to have been used, which is outside our return policy. We apologize for any inconvenience.'}}
    )
    print(f'Updated rejected order with admin message: {result.modified_count} modified')
    
    # Get a product to use for the orders
    product = await db.products.find_one({}, {'_id': 0})
    if not product:
        print('No products found!')
        return
    
    # Get user
    user = await db.users.find_one({'email': 'example@gmail.com'}, {'_id': 0})
    if not user:
        print('User not found!')
        return
    
    user_id = user['id']
    
    # Create 3 delivered + paid orders
    for i in range(3):
        order_id = str(uuid.uuid4())
        order_number = f"ORD-{int(time.time()) + i}-{user_id[:8]}"
        now = datetime.now(timezone.utc).isoformat()
        
        order = {
            'id': order_id,
            'order_number': order_number,
            'user_id': user_id,
            'items': [{
                'product_id': product['id'],
                'product_name': product.get('name', 'DurgaShakti Foil'),
                'quantity': 1,
                'price': float(product.get('discount_price') or product.get('price', 299))
            }],
            'total_amount': float(product.get('discount_price') or product.get('price', 299)),
            'payment_method': 'razorpay',
            'payment_status': 'completed',
            'order_status': 'DELIVERED',
            'stock_applied': True,
            'razorpay_payment_id': f'pay_test_{order_id[:12]}',
            'shipping_address': {
                'full_name': user.get('full_name', 'Vamsi Kiran'),
                'phone': user.get('phone', '1234567890'),
                'address_line1': '123 Main Street',
                'address_line2': '',
                'city': 'Hyderabad',
                'state': 'Telangana',
                'pincode': '500001'
            },
            'created_at': now,
            'updated_at': now
        }
        
        await db.orders.insert_one(order)
        print(f'Created order {i+1}: {order_number} | Status: DELIVERED | Payment: completed')

asyncio.run(main())
