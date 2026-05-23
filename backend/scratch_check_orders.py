import os
import asyncio
from dotenv import load_dotenv
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

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

async def check():
    engine = create_async_engine(_async_url, connect_args={"ssl": "require"})
    async with engine.begin() as conn:
        res = await conn.execute(text("SELECT id, order_number, user_id, order_status, payment_status FROM orders LIMIT 10;"))
        print("ORDERS:")
        for r in res.fetchall():
            print(f"ID={r[0]} | Type={type(r[0])} | Number={r[1]} | UserID={r[2]} | Status={r[3]} | Payment={r[4]}")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check())
