import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

async def migrate():
    client = AsyncIOMotorClient(os.getenv("MONGO_URL"))
    db = client[os.getenv("DB_NAME", "durgashaktifoils_db")]
    
    orders = await db.orders.find({"customer_name": {"$exists": False}}).to_list(10000)
    print(f"Found {len(orders)} orders to migrate.")
    
    for order in orders:
        user_id = order.get("user_id")
        # Try finding by ID
        user = await db.users.find_one({"id": user_id})
        # If not found, try finding by email (in case old orders used email as user_id)
        if not user:
            user = await db.users.find_one({"email": user_id})
            
        if user:
            name = user.get("full_name", "Guest User")
            await db.orders.update_one({"order_number": order["order_number"]}, {"$set": {"customer_name": name}})
            print(f"Updated Order {order['order_number']} with name: {name}")
        else:
            await db.orders.update_one({"order_number": order["order_number"]}, {"$set": {"customer_name": "Guest User"}})
            print(f"User not found for Order {order['order_number']}, set to Guest User.")

if __name__ == "__main__":
    asyncio.run(migrate())
