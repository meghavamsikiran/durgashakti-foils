import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

async def check_all_logs():
    load_dotenv(Path('d:/archive/backend/.env'))
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    logs = await db.audit_logs.find({}, {"_id": 0}).sort("created_at", -1).limit(20).to_list(20)
    for log in logs:
        print(f"{log.get('created_at')} - {log.get('action')}")

if __name__ == "__main__":
    asyncio.run(check_all_logs())
