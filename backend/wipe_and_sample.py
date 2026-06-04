import asyncio
import uuid
import time
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient

async def wipe_and_seed():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client.durgashaktifoils_db
    
    print("--- Wiping Transactional Data ---")
    
    # 1. Delete Orders
    order_del = await db.orders.delete_many({})
    print(f"Deleted {order_del.deleted_count} orders")
    
    # 2. Delete GST Data
    gst_rec_del = await db.gst_records.delete_many({})
    gst_imp_del = await db.gst_imports.delete_many({})
    print(f"Deleted {gst_rec_del.deleted_count} GST records and {gst_imp_del.deleted_count} imports")
    
    # 3. Insert Sample Order for example@gmail.com
    print("\n--- Inserting Sample Data ---")
    user = await db.users.find_one({"email": "example@gmail.com"})
    if not user:
        print("Error: User example@gmail.com not found!")
        return
        
    product = await db.products.find_one({"size": "72m"})
    if not product:
        print("Error: Product 72m not found!")
        return
        
    order_id = str(uuid.uuid4())
    order_number = f"ORD-{int(time.time())}-{user['id'][:8]}"
    now = datetime.now(timezone.utc).isoformat()
    
    sample_order = {
        "id": order_id,
        "order_number": order_number,
        "user_id": user["id"],
        "customer_name": user.get("full_name", "Vamsi Kiran"),
        "items": [
            {
                "product_id": product["id"],
                "product_name": product["name"],
                "quantity": 2,
                "price": product["price"]
            }
        ],
        "total_amount": product["price"] * 2,
        "payment_method": "cod",
        "payment_status": "completed",
        "order_status": "confirmed",
        "shipping_address": {
            "full_name": user.get("full_name", "Vamsi Kiran"),
            "phone": user.get("phone", "9876543210"),
            "address_line1": "Flat 402, Durga Residency",
            "address_line2": "Madhapur",
            "city": "Hyderabad",
            "state": "Telangana",
            "pincode": "500081"
        },
        "created_at": now,
        "updated_at": now
    }
    
    await db.orders.insert_one(sample_order)
    print(f"Inserted sample order: {order_number} for {user['email']}")
    
    await client.close()

if __name__ == "__main__":
    asyncio.run(wipe_and_seed())
