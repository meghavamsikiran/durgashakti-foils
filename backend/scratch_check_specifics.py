import os
import asyncio
from dotenv import load_dotenv
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

load_dotenv()
DATABASE_URL_RAW = os.environ.get('DATABASE_URL', '')

import re
from urllib.parse import unquote
from sqlalchemy.engine import URL

_m = re.match(r'postgresql(?:\+asyncpg)?://([^:@]+):(.+)@([^:/]+):(\d+)/(.+)', DATABASE_URL_RAW)
if _m:
    _user, _enc_pw, _host, _port, _db = _m.groups()
    _password = unquote(_enc_pw)
    _async_url = URL.create(
        drivername="postgresql+asyncpg",
        username=_user,
        password=_password,
        host=_host,
        port=int(_port),
        database=_db.split("?")[0],
    )
else:
    _async_url = DATABASE_URL_RAW.replace("postgresql://", "postgresql+asyncpg://", 1)

from models import OrderModel

async def test():
    engine = create_async_engine(_async_url, connect_args={"ssl": "require"})
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as db:
        numbers = ["ORD-1779481623-4892748c", "ORD-1779479919-c185b5aa", "ORD-1779479775-15b18cf2", "ORD-1779396059-713b99ef"]
        for num in numbers:
            res = await db.execute(select(OrderModel).where(OrderModel.order_number == num))
            order = res.scalar_one_or_none()
            if order:
                print(f"Order {num} found: ID={order.id}")
            else:
                print(f"Order {num} NOT FOUND in database!")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(test())
