import asyncio, motor.motor_asyncio

async def check():
    client = motor.motor_asyncio.AsyncIOMotorClient('mongodb://localhost:27017')
    db = client.durgashaktifoils_db
    users = await db.users.find().to_list(100)
    for u in users:
        print(f"{u.get('email')} - Role: {u.get('role')}")
        
asyncio.run(check())
