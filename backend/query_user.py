import asyncio
import os
import re
from urllib.parse import unquote
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()

async def main():
    DATABASE_URL_RAW = os.environ.get('DATABASE_URL', '')
    _m = re.match(r'postgresql(?:\+asyncpg)?://([^:@]+):(.+)@([^:/]+):(\d+)/(.+)', DATABASE_URL_RAW)
    _user, _enc_pw, _host, _port, _db = _m.groups()
    _password = unquote(_enc_pw)
    url = f'postgresql+asyncpg://{_user}:{_password}@{_host}:{_port}/{_db.split("?")[0]}'
    
    engine = create_async_engine(url, connect_args={"ssl": "require"})
    
    async with engine.connect() as conn:
        result = await conn.execute(text("SELECT email, password, full_name FROM users WHERE email = 'example@gmail.com'"))
        user = result.fetchone()
        if user:
            print(f"Email: {user[0]}")
            print(f"Password hash: {user[1]}")
            print(f"Full Name: {user[2]}")
        else:
            print("User not found.")
            
    await engine.dispose()

if __name__ == '__main__':
    asyncio.run(main())
