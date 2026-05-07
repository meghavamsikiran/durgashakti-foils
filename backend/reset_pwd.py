import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')

async def update_pwd():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client.durgashaktifoils_db
    hashed = pwd_context.hash('123456')
    await db.users.update_one({'email': 'superadmin@durgashakti.com'}, {'$set': {'password': hashed}})
    print('Updated superadmin password to 123456')

asyncio.run(update_pwd())
