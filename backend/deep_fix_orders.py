import asyncio
import uuid
import time
from motor.motor_asyncio import AsyncIOMotorClient

async def fix():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client.durgashaktifoils_db
    
    print("--- Deep Fixing Orders ---")
    
    # 1. Fetch all orders
    orders = await db.orders.find({}).to_list(None)
    print(f"Found {len(orders)} total orders")
    
    for order in orders:
        updates = {}
        
        # A. Fix missing order_number
        if not order.get('order_number'):
            # Generate a consistent order number from ID if possible, or timestamp
            short_id = order['id'][:8]
            ts = int(time.time())
            new_number = f"ORD-OLD-{short_id.upper()}"
            updates['order_number'] = new_number
            print(f"Assigned order_number {new_number} to order {order['id']}")
            
        # B. Fix Guest User
        current_name = order.get('customer_name', '').strip()
        if not current_name or current_name.lower() == 'guest user':
            user = await db.users.find_one({"id": order["user_id"]})
            if user and user.get("full_name"):
                updates['customer_name'] = user["full_name"]
                print(f"Updated Guest User to: {user['full_name']} for order {order.get('order_number') or order['id']}")
            else:
                # Fallback to email prefix if full_name is missing
                if user and user.get("email"):
                    name_from_email = user["email"].split('@')[0]
                    updates['customer_name'] = name_from_email
                    print(f"Updated Guest User to email-prefix: {name_from_email}")
        
        if updates:
            await db.orders.update_one({"id": order["id"]}, {"$set": updates})

    print("\n--- Fix Complete ---")
    await client.close()

if __name__ == "__main__":
    asyncio.run(fix())
