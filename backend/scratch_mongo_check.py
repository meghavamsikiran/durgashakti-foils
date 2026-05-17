import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    client = AsyncIOMotorClient(os.getenv('MONGO_URL', 'mongodb://localhost:27017'))
    db = client.get_database('durgashaktifoils_db')
    collections = await db.list_collection_names()
    print("Collections:")
    for c in collections:
        count = await db[c].count_documents({})
        print(f"{c}: {count}")
    client.close()

if __name__ == "__main__":
    asyncio.run(main())
