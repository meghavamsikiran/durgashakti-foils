from pymongo import MongoClient
import sys

def migrate():
    try:
        client = MongoClient("mongodb://localhost:27017")
        db = client["durgashaktifoils_db"]
        
        # Mapping of user IDs to names
        users = list(db.users.find({}, {"id": 1, "email": 1, "full_name": 1}))
        user_map = {}
        for u in users:
            if u.get("id"): user_map[u["id"]] = u.get("full_name", "Guest User")
            if u.get("email"): user_map[u["email"]] = u.get("full_name", "Guest User")
        
        orders = list(db.orders.find({}))
        print(f"Checking {len(orders)} orders...")
        
        for order in orders:
            user_id = order.get("user_id")
            name = user_map.get(user_id, "Guest User")
            db.orders.update_one({"id": order["id"]}, {"$set": {"customer_name": name}})
            print(f"Order {order.get('order_number')} -> {name}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    migrate()
