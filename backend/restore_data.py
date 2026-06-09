import asyncio
import uuid
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient

async def restore():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client.durgashaktifoils_db
    
    print("--- Restoring Products ---")
    products = [
        {
            "name": "Premium Aluminum Foil - 72m",
            "description": "High-quality 11 micron foil, perfect for home and commercial use.",
            "size": "72m", "thickness": "11 micron", "price": 199.0, "image_url": "/uploads/foil_72m.webp",
            "features": ["11 Micron Thickness", "Food Grade", "Easy Dispenser"],
            "stock_quantity": 500, "in_stock": True, "category": "Premium"
        },
        {
            "name": "Heavy Duty Catering Foil - 1KG",
            "description": "Extra thick 18 micron foil for heavy-duty catering and industrial wrapping.",
            "size": "1KG", "thickness": "18 micron", "price": 499.0, "image_url": "/uploads/foil_1kg.webp",
            "features": ["18 Micron Thickness", "Commercial Grade", "High Heat Resistance"],
            "stock_quantity": 200, "in_stock": True, "category": "Catering"
        },
        {
            "name": "Kitchen Foil - 9m",
            "description": "Compact and convenient 9m foil for daily kitchen needs.",
            "size": "9m", "thickness": "11 micron", "price": 129.0, "image_url": "/uploads/foil_9m.webp",
            "features": ["Daily Use", "Travel Friendly", "Eco-friendly Packaging"],
            "stock_quantity": 1000, "in_stock": True, "category": "Standard"
        },
        {
            "name": "Premium Foil - 18m",
            "description": "Standard length premium foil for everyday wrapping and freshness.",
            "size": "18m", "thickness": "11 micron", "price": 169.0, "image_url": "/uploads/foil_18m.webp",
            "features": ["Strong & Flexible", "Moisture Proof", "Preserves Freshness"],
            "stock_quantity": 750, "in_stock": True, "category": "Premium"
        },
        {
            "name": "Standard Foil - 25m",
            "description": "Reliable 25m foil roll for general household applications.",
            "size": "25m", "thickness": "11 micron", "price": 229.0, "image_url": "/uploads/foil_25m.webp",
            "features": ["Long Lasting", "Multipurpose", "Odorless"],
            "stock_quantity": 600, "in_stock": True, "category": "Standard"
        },
        {
            "name": "Bulk Catering Foil - 10KG",
            "description": "Giant 10kg industrial roll for large restaurants and bulk packing.",
            "size": "10KG", "thickness": "18 micron", "price": 3499.0, "image_url": "/uploads/foil_10kg.webp",
            "features": ["Massive Quantity", "Professional Grade", "Maximum Strength"],
            "stock_quantity": 50, "in_stock": True, "category": "Catering"
        }
    ]

    for p_data in products:
        existing = await db.products.find_one({"size": p_data["size"]})
        if existing:
            await db.products.update_one({"id": existing["id"]}, {"$set": p_data})
            print(f"Updated: {p_data['name']}")
        else:
            p_data["id"] = str(uuid.uuid4())
            p_data["created_at"] = datetime.now(timezone.utc).isoformat()
            await db.products.insert_one(p_data)
            print(f"Inserted: {p_data['name']}")

    print("\n--- Backfilling Customer Names in Orders ---")
    orders = await db.orders.find({"customer_name": "Guest User"}).to_list(None)
    print(f"Found {len(orders)} orders with 'Guest User'")
    for order in orders:
        user = await db.users.find_one({"id": order["user_id"]})
        if user and user.get("full_name"):
            await db.orders.update_one({"id": order["id"]}, {"$set": {"customer_name": user["full_name"]}})
            print(f"Backfilled order {order['order_number']} with name: {user['full_name']}")

    await client.close()

if __name__ == "__main__":
    asyncio.run(restore())
