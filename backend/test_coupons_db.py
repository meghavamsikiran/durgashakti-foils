import asyncio
from dotenv import load_dotenv
load_dotenv()
from database import init_engine, create_tables, get_db
from models import CouponModel
from sqlalchemy import select, text
import logging

logging.basicConfig(level=logging.INFO)

async def main():
    print("Initializing engine...")
    init_engine()
    
    from database import engine
    async with engine.begin() as conn:
        print("Dropping old coupons table...")
        await conn.execute(text("DROP TABLE IF EXISTS coupons CASCADE;"))
        
    print("Running create_tables to recreate table with correct columns...")
    await create_tables()
    print("Tables created/verified.")
    
    print("Querying coupons table...")
    async for db in get_db():
        res = await db.execute(select(CouponModel))
        print("Coupons queried successfully:", res.scalars().all())

if __name__ == "__main__":
    asyncio.run(main())
