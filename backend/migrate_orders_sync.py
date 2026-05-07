from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

def migrate():
    client = MongoClient(os.getenv("MONGO_URL", "mongodb://localhost:27017"))
    db = client[os.getenv("DB_NAME", "durgashaktifoils_db")]
    
    # Update orders that don't have customer_name or have it as Guest User
    orders = list(db.orders.find({}))
    print(f"Checking {len(orders)} orders...")
    
    for order in orders:
        user_id = order.get("user_id")
        user = db.users.find_one({"id": user_id})
        if not user:
            user = db.users.find_one({"email": user_id})
            
        name = user.get("full_name", "Guest User") if user else "Guest User"
        db.orders.update_one({"id": order["id"]}, {"$set": {"customer_name": name}})
        print(f"Order {order.get('order_number')} -> {name}")

if __name__ == "__main__":
    migrate()
