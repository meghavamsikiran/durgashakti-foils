import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

async def check():
    load_dotenv()
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    count = await db.orders.count_documents({})
    print(f"TOTAL_ORDERS: {count}")
    
    # Also check statuses
    pipeline = [
        {"$group": {"_id": "$order_status", "count": {"$sum": 1}}}
    ]
    results = await db.orders.aggregate(pipeline).to_list(None)
    print("STATUS_COUNTS:")
    for res in results:
        print(f"  {res['_id']}: {res['count']}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(check())
