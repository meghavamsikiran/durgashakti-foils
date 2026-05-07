import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

async def fix():
    load_dotenv(Path('d:/archive/backend/.env'))
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    products = await db.products.find().to_list(100)
    for p in products:
        name = p.get('name', '')
        # Generate a simple SKU based on name if empty
        if not p.get('batch_no'):
            prefix = "DSF"
            if "72m" in name: sku = f"{prefix}-PREM-72M"
            elif "1KG" in name: sku = f"{prefix}-HD-1KG"
            elif "9m" in name: sku = f"{prefix}-KITCH-9M"
            elif "18m" in name: sku = f"{prefix}-PREM-18M"
            elif "25m" in name: sku = f"{prefix}-STD-25M"
            elif "10KG" in name: sku = f"{prefix}-BULK-10KG"
            else: sku = f"{prefix}-VAR-{p['id'][:4].upper()}"
            
            await db.products.update_one({"id": p['id']}, {"$set": {"batch_no": sku, "variant_sku": sku}})
            print(f"Updated {name} -> {sku}")

if __name__ == "__main__":
    asyncio.run(fix())
