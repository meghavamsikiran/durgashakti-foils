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

from models import AuditLogModel

async def test():
    engine = create_async_engine(_async_url, connect_args={"ssl": "require"})
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as db:
        # Get last 20 audit logs containing "refund" or "payout"
        res = await db.execute(
            select(AuditLogModel)
            .where(AuditLogModel.action.like("%REFUND%") | AuditLogModel.action.like("%PAYOUT%"))
            .order_by(AuditLogModel.created_at.desc())
            .limit(20)
        )
        logs = res.scalars().all()
        print(f"Total matching audit logs: {len(logs)}")
        for l in logs:
            print("-" * 80)
            print(f"Created: {l.created_at}")
            print(f"Action: {l.action}")
            print(f"Target: {l.target_type} ({l.target_id})")
            print(f"Meta: {l.metadata_}")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(test())
