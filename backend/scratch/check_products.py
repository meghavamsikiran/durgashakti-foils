import asyncio
import os
import sys
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import database
from sqlalchemy import text

async def main():
    load_dotenv()
    database.init_engine()
    print("Connecting to DB...")
    async with database.engine.connect() as conn:
        result = await conn.execute(text("SELECT id, name, image_url, media_urls FROM products"))
        rows = result.all()
        print(f"Found {len(rows)} products:")
        for r in rows:
            print(f"ID: {r.id}")
            print(f"Name: {r.name}")
            print(f"Image URL: {r.image_url}")
            print(f"Media URLs: {r.media_urls}")
            print("-" * 40)

if __name__ == '__main__':
    asyncio.run(main())
