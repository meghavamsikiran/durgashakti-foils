import asyncio
import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import select

env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)

import database
from models import ProductModel

async def main():
    database.init_engine()
    async with database.async_session_factory() as session:
        stmt = select(ProductModel)
        result = await session.execute(stmt)
        products = result.scalars().all()
        print(f"Found {len(products)} products:")
        for p in products:
            print(f"- ID: {p.id}")
            print(f"  Name: {p.name}")
            print(f"  Size: {p.size}")
            print(f"  Thickness: {p.thickness}")
            print(f"  Image URL: {p.image_url}")
            print(f"  Media URLs: {p.media_urls}")
            print("-" * 40)

if __name__ == "__main__":
    asyncio.run(main())
