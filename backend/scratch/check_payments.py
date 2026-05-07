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
        print("User not found")
        return

    orders = await db.orders.find({"user_id": user["id"]}).to_list(None)
    print(f"User: {user['email']}")
    print("\nOrder Details:")
    for o in orders:
        print(f"  - {o.get('order_number')}: PaymentStatus={o.get('payment_status')}, Amount={o.get('total_amount')}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(check())
