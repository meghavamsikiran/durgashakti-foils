import os
import asyncio
import bcrypt
from dotenv import load_dotenv
from sqlalchemy import select, update
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
        res = await db.execute(select(UserModel).where(UserModel.email == 'durgashaktifoils@gmail.com'))
        u = res.scalar_one_or_none()
        if u:
            print("Found user:", u.email)
            print("Current hash:", u.password)
            # Try verification with "123456"
            try:
                matches = bcrypt.checkpw("123456".encode('utf-8'), u.password.encode('utf-8'))
                print("Does password match '123456'?", matches)
                if not matches:
                    new_hash = bcrypt.hashpw("123456".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
                    await db.execute(update(UserModel).where(UserModel.email == 'durgashaktifoils@gmail.com').values(password=new_hash))
                    await db.commit()
                    print("Updated password of durgashaktifoils@gmail.com to 123456")
            except Exception as ex:
                print("Bcrypt check failed:", ex)
                # Just update it anyway
                new_hash = bcrypt.hashpw("123456".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
                await db.execute(update(UserModel).where(UserModel.email == 'durgashaktifoils@gmail.com').values(password=new_hash))
                await db.commit()
                print("Force updated password of durgashaktifoils@gmail.com to 123456")
        else:
            print("User durgashaktifoils@gmail.com not found!")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(test())
