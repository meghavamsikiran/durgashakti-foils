import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

async def list_dbs():
    load_dotenv(Path('d:/archive/backend/.env'))
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    dbs = await client.list_database_names()
    print(f"Databases: {dbs}")
    for db_name in dbs:
        if 'durgashakti' in db_name.lower():
            db = client[db_name]
            collections = await db.list_collection_names()
            print(f"DB: {db_name}, Collections: {collections}")
            for coll in collections:
                count = await db[coll].count_documents({})
                print(f"  - {coll}: {count}")

if __name__ == "__main__":
    asyncio.run(list_dbs())
