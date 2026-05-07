import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

async def check_user():
    load_dotenv(Path('d:/archive/backend/.env'))
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    email = "vamsikiranklu@gmail.com"
    user = await db.users.find_one({"email": email})
    if user:
        print(f"User found: {user['email']}, ID: {user['id']}")
    else:
        print(f"User NOT found: {email}")
        all_users = await db.users.find({}, {"email": 1, "_id": 0}).to_list(100)
        print(f"Current users: {[u['email'] for u in all_users]}")

if __name__ == "__main__":
    asyncio.run(check_user())
