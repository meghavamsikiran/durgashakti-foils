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

from models import UserModel

async def test():
    engine = create_async_engine(_async_url, connect_args={"ssl": "require"})
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as db:
        try:
            # Querying using a raw string representation of a UUID
            res = await db.execute(select(UserModel).where(UserModel.id == '991dfa58-f38e-4c8d-b439-6ee05e1e4831'))
            user = res.scalar_one_or_none()
            print("Successfully queried with string! User found:", user.full_name if user else "None")
        except Exception as e:
            import traceback
            traceback.print_exc()

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(test())
