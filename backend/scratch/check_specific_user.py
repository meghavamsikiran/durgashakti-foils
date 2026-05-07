import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

async def check():
    load_dotenv()
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    user = await db.users.find_one({"email": "example@gmail.com"})
    if not user:
        print("User example@gmail.com not found")
        return

    count = await db.orders.count_documents({"user_id": user["id"]})
    print(f"User: {user['email']} (ID: {user['id']})")
    print(f"Total Orders in DB: {count}")
    
    orders = await db.orders.find({"user_id": user["id"]}).to_list(None)
    print("\nOrders:")
    for o in orders:
        print(f"  - {o.get('order_number')} (Status: {o.get('order_status')})")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(check())
