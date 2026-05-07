import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

async def check():
    load_dotenv(Path('d:/archive/backend/.env'))
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    products = await db.products.find().to_list(10)
    for p in products:
        print(f"Name: {p.get('name')}, batch_no: {p.get('batch_no')}, variant_sku: {p.get('variant_sku')}")

if __name__ == "__main__":
    asyncio.run(check())
