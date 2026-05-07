import asyncio
import os
import uuid
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime, timezone

async def seed_data():
    load_dotenv(Path('d:/archive/backend/.env'))
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    # Seed Products if missing
    existing_p = await db.products.count_documents({})
    if existing_p == 0:
        now = datetime.now(timezone.utc).isoformat()
        products = [
            {"id": str(uuid.uuid4()), "name": "HOT WRAP 6m", "description": "Everyday wrapping power", "size": "6 Meters", "thickness": "11 Micron", "price": 99, "image_url": "https://images.unsplash.com/photo-1762151532995-c2e6cb6449d6?w=400", "features": [], "in_stock": True, "stock_quantity": 500, "category": "Aluminum Foil", "batch_no": "DSF6MT", "created_at": now},
            {"id": str(uuid.uuid4()), "name": "HOT WRAP 9m", "description": "Everyday wrapping power", "size": "9 Meters", "thickness": "11 Micron", "price": 129, "image_url": "https://images.unsplash.com/photo-1762151532995-c2e6cb6449d6?w=400", "features": [], "in_stock": True, "stock_quantity": 400, "category": "Aluminum Foil", "batch_no": "DSF9MT", "created_at": now},
            {"id": str(uuid.uuid4()), "name": "HOT WRAP 18m", "description": "Everyday wrapping power", "size": "18 Meters", "thickness": "11 Micron", "price": 229, "image_url": "https://images.unsplash.com/photo-1762151532995-c2e6cb6449d6?w=400", "features": [], "in_stock": True, "stock_quantity": 300, "category": "Aluminum Foil", "batch_no": "DSF18MT", "created_at": now},
        ]
        await db.products.insert_many(products)
        print(f"Seeded {len(products)} products")
    
    # Seed GST Records (the "15 records")
    existing_gst = await db.gst_records.count_documents({})
    if existing_gst == 0:
        import_id = str(uuid.uuid4())
        today = datetime.now(timezone.utc).date().isoformat()
        records = []
        for i in range(1, 16):
            records.append({
                "id": str(uuid.uuid4()),
                "import_id": import_id,
                "invoice_number": f"INV-TEST-{1000+i}",
                "invoice_date": today,
                "customer_name": f"Test Customer {i}",
                "taxable_amount": 100.0 * i,
                "gst_amount": 18.0 * i,
                "total_amount": 118.0 * i,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
        await db.gst_records.insert_many(records)
        print(f"Seeded {len(records)} GST records")

if __name__ == "__main__":
    asyncio.run(seed_data())
