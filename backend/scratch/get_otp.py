import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

async def find_otp():
    load_dotenv(Path('d:/archive/backend/.env'))
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    email = "vamsikiranklu@gmail.com"
    record = await db.password_resets.find_one({"email": email})
    if record:
        print(f"OTP for {email}: {record['otp']}")
    else:
        print(f"No OTP record found for {email}")

if __name__ == "__main__":
    asyncio.run(find_otp())
