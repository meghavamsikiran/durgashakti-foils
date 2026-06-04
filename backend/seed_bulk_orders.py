import asyncio
import uuid
import time
import random
from datetime import datetime, timedelta, timezone
from motor.motor_asyncio import AsyncIOMotorClient

async def seed_bulk_orders():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client.durgashaktifoils_db
    
    print("--- Seeding 15+ Diverse Orders ---")
    
    # 1. Get Products and Users
    products = await db.products.find({}).to_list(10)
    if not products:
        print("Error: No products found. Run restoration first.")
        return
        
    main_user = await db.users.find_one({"email": "example@gmail.com"})
    if not main_user:
        print("Error: User example@gmail.com not found!")
        return

    # Mock some extra users for diversity
    extra_users = [
        {"id": "user_1", "full_name": "Rajesh Kumar", "phone": "9848012345"},
        {"id": "user_2", "full_name": "Priya Sharma", "phone": "9988776655"},
        {"id": "user_3", "full_name": "Amit Patel", "phone": "9123456789"}
    ]

    statuses = [
        ("confirmed", "completed"),
        ("shipped", "completed"),
        ("delivered", "completed"),
        ("delivered", "completed"),
        ("delivered", "completed"),
        ("cancelled", "pending"),
        ("cancelled", "refunded"),
        ("return_requested", "completed"),
        ("returned", "refunded"),
        ("processing", "completed"),
        ("processing", "pending"),
        ("confirmed", "completed")
    ]
    
    methods = ["cod"]
    
    for i in range(15):
        order_id = str(uuid.uuid4())
        user = random.choice([main_user] + extra_users)
        status, p_status = random.choice(statuses)
        method = random.choice(methods)
        
        # Spread over last 15 days
        days_ago = random.randint(0, 15)
        dt = datetime.now(timezone.utc) - timedelta(days=days_ago, hours=random.randint(0, 23))
        now = dt.isoformat()
        
        order_number = f"ORD-{int(dt.timestamp())}-{order_id[:4].upper()}"
        
        # Pick 1-2 random products
        order_items = []
        total = 0
        for _ in range(random.randint(1, 2)):
            p = random.choice(products)
            qty = random.randint(1, 3)
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
            "user_id": user.get("id", user.get("_id")),
            "customer_name": user.get("full_name", "Valued Customer"),
            "items": order_items,
            "total_amount": total,
            "payment_method": method,
            "payment_status": p_status,
            "order_status": status,
            "shipping_address": {
                "full_name": user.get("full_name", "Valued Customer"),
                "phone": user.get("phone", "9000000000"),
                "address_line1": f"Plot No {random.randint(1, 500)}",
                "address_line2": "Main Road",
                "city": random.choice(["Hyderabad", "Mumbai", "Delhi", "Bangalore"]),
                "state": "India",
                "pincode": str(random.randint(100000, 999999))
            },
            "created_at": now,
            "updated_at": now
        }
        
        await db.orders.insert_one(order)
        print(f"Created {status} order: {order_number} for {user.get('full_name')}")

    print("\n--- Seeding Complete ---")
    await client.close()

if __name__ == "__main__":
    asyncio.run(seed_bulk_orders())
