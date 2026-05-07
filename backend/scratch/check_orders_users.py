import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

async def check():
    load_dotenv()
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    orders = await db.orders.find({}, {"_id": 0, "user_id": 1, "customer_name": 1, "order_number": 1}).to_list(100)
    print(f"Total Orders in DB: {len(orders)}")
    
    users = await db.users.find({}, {"_id": 0, "id": 1, "email": 1, "full_name": 1}).to_list(100)
    user_map = {u['id']: u['email'] for u in users}
    
    print("\nOrder - User Mapping:")
    for o in orders:
        uid = o.get('user_id')
        u_email = user_map.get(uid, "UNKNOWN USER")
        print(f"  Order {o.get('order_number')}: UserID={uid} ({u_email}), CustomerName={o.get('customer_name')}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(check())
