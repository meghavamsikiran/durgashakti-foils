import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

async def main():
    engine = create_async_engine('postgresql+asyncpg://postgres:NxdsId4xaXIBp17y@db.vddtkiefzhcihdzxxlgp.supabase.co:6543/postgres', connect_args={'ssl': 'require'})
    async with engine.connect() as conn:
        res = await conn.execute(text('select name, image_url from products limit 5'))
        for row in res.fetchall():
            print(row)
    await engine.dispose()

if __name__ == '__main__':
    asyncio.run(main())
