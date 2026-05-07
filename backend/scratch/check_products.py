import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

async def check_products():
    load_dotenv(Path('d:/archive/backend/.env'))
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    p_count = await db.products.count_documents({})
    o_count = await db.orders.count_documents({})
    print(f"Products in DB: {p_count}")
    print(f"Orders in DB: {o_count}")
    if p_count > 0:
        p = await db.products.find_one({}, {"name": 1, "_id": 0})
        print(f"Sample product: {p['name']}")

if __name__ == "__main__":
    asyncio.run(check_products())
