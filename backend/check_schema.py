import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

async def check():
    client = AsyncIOMotorClient(os.getenv("MONGO_URL"))
    db = client[os.getenv("DB_NAME", "durgashaktifoils_db")]
    user = await db.users.find_one()
    print("User Keys:", user.keys() if user else "No users found")
    if user:
        print("User ID field:", user.get("id"))
        print("User Full Name field:", user.get("full_name"))
    
    order = await db.orders.find_one()
    print("Order Keys:", order.keys() if order else "No orders found")
    if order:
        print("Order User ID field:", order.get("user_id"))

asyncio.run(check())
