import asyncio
import uuid
import time
import random
from datetime import datetime, timedelta, timezone
from motor.motor_asyncio import AsyncIOMotorClient

async def seed_proper_users_and_orders():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client.durgashaktifoils_db
    
    print("--- Seeding Proper Users & Orders ---")
    
    # 1. Clean existing orders for fresh start
    await db.orders.delete_many({})
    
    # 2. Get Products
    products = await db.products.find({}).to_list(10)
    
    # 3. Create/Ensure Diverse Users
    user_configs = [
        {"email": "example@gmail.com", "full_name": "Vamsi Kiran", "phone": "9848012345"},
        {"email": "rajesh@example.com", "full_name": "Rajesh Kumar", "phone": "9848011111"},
        {"email": "priya@example.com", "full_name": "Priya Sharma", "phone": "9988776655"},
        {"email": "amit@example.com", "full_name": "Amit Patel", "phone": "9123456789"},
        {"email": "sneha@example.com", "full_name": "Sneha Reddy", "phone": "9440055667"}
    ]
    
    users = []
    for config in user_configs:
        existing = await db.users.find_one({"email": config["email"]})
        if not existing:
            user_id = str(uuid.uuid4())
            new_user = {
                "id": user_id,
                "email": config["email"],
                "full_name": config["full_name"],
                "phone": config["phone"],
                "role": "customer",
                "password": "hashed_dummy_password", # Seeding only
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.users.insert_one(new_user)
            users.append(new_user)
            print(f"Created user: {config['email']}")
        else:
            users.append(existing)
            print(f"Found existing user: {config['email']}")

    statuses = [
        ("confirmed", "completed"), ("shipped", "completed"), ("delivered", "completed"),
        ("delivered", "completed"), ("cancelled", "pending"), ("returned", "refunded"),
        ("processing", "completed"), ("confirmed", "completed"), ("delivered", "completed")
    ]
    
    for i in range(20):
        order_id = str(uuid.uuid4())
        user = random.choice(users)
        status, p_status = random.choice(statuses)
        method = random.choice(["razorpay", "cod", "razorpay"])
        
        days_ago = random.randint(0, 20)
        dt = datetime.now(timezone.utc) - timedelta(days=days_ago, minutes=random.randint(0, 1440))
        now = dt.isoformat()
        
        order_number = f"ORD-{int(dt.timestamp())}-{order_id[:4].upper()}"
        
        order_items = []
        total = 0
        for _ in range(random.randint(1, 2)):
            p = random.choice(products)
            qty = random.randint(1, 4)
            order_items.append({
                "product_id": p["id"],
                "product_name": p["name"],
                "quantity": qty,
                "price": p["price"]
            })
            total += p["price"] * qty
            
        order = {
            "id": order_id,
            "order_number": order_number,
            "user_id": user["id"],
            "customer_name": user["full_name"], # Now matches the real user name
            "items": order_items,
            "total_amount": total,
            "payment_method": method,
            "payment_status": p_status,
            "order_status": status,
            "created_at": now,
            "updated_at": now,
            "shipping_address": {
                "full_name": user["full_name"],
                "phone": user["phone"],
                "address_line1": f"House No {random.randint(1, 999)}",
                "city": "Hyderabad", "state": "Telangana", "pincode": "500001"
            }
        }
        await db.orders.insert_one(order)
        print(f"Placed order {order_number} for {user['email']}")

    await client.close()

if __name__ == "__main__":
    asyncio.run(seed_proper_users_and_orders())
