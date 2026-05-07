import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

async def check_logs():
    load_dotenv(Path('d:/archive/backend/.env'))
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    logs = await db.audit_logs.find({"action": {"$in": ["PRODUCT_CREATED", "PRODUCT_DELETED", "PRODUCT_BULK_CREATED"]}}, {"_id": 0}).sort("created_at", -1).to_list(100)
    for log in logs:
        print(f"{log['created_at']} - {log['action']} - {log.get('target_id')} - {log.get('metadata')}")

if __name__ == "__main__":
    asyncio.run(check_logs())
