"""Analytics + Financial Reports routes."""
import asyncio
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, case
from typing import Optional
import database
from database import get_db
from models import OrderModel, ProductModel, UserModel, AuditLogModel
from deps import UserSchema, require_permission, sanitize_search_term, row_to_dict, get_admin_user
from datetime import datetime, timezone, timedelta

router = APIRouter(prefix="/api")

REVENUE_ORDER_STATUSES = [
    "processing", "placed", "confirmed", "packaging", "shipped",
    "out_for_delivery", "delivered", "return_requested", "return_rejected"
]
REVENUE_PAYMENT_STATUSES = ["completed", "Paid"]


@router.get("/admin/payments")
async def list_payments(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    admin: UserSchema = Depends(require_permission("view_transactions")),
    db: AsyncSession = Depends(get_db)
):
    search = sanitize_search_term(search)
    q = select(OrderModel, func.count(OrderModel.id).over().label('total_count'))

    clause = None
    if search:
        like_term = f"%{search}%"
        clause = or_(
            OrderModel.order_number.ilike(like_term),
            OrderModel.razorpay_payment_id.ilike(like_term),
            OrderModel.razorpay_order_id.ilike(like_term)
        )
        q = q.where(clause)

    offset = (page - 1) * limit
    res = await db.execute(q.order_by(OrderModel.created_at.desc()).offset(offset).limit(limit))
    rows = res.all()
    
    total = 0
    if rows:
        total = rows[0][1]
    elif page > 1:
        fallback_q = select(func.count(OrderModel.id))
        if clause is not None:
            fallback_q = fallback_q.where(clause)
        total = (await db.execute(fallback_q)).scalar() or 0

    items = []
    for row in rows:
        o = row[0]
        items.append({
            "id": str(o.id),
            "order_number": o.order_number,
            "transaction_id": o.razorpay_payment_id or o.razorpay_order_id or "COD",
            "amount": float(o.total_amount),
            "status": o.payment_status,
            "provider": o.payment_method or "Razorpay",
            "created_at": o.created_at.isoformat() if o.created_at else None
        })
    return {"items": items, "total": total, "page": page, "limit": limit}


@router.get("/admin/analytics/summary")
async def get_analytics_summary(
    timeframe: Optional[str] = None,
    admin: UserSchema = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    has_analytics = admin.role == "SUPER_ADMIN" or (
        admin.permissions and (
            admin.permissions.get("view_analytics") is True or
            admin.permissions.get("access_financial_reports") is True
        )
    )
    if not has_analytics:
        return {
            "metrics": {},
            "order_status_counts": {},
            "best_products": [],
            "inventory": [],
            "revenue_trend": []
        }

    # Determine permissions
    has_financial = admin.role == "SUPER_ADMIN" or (
        admin.permissions and (
            admin.permissions.get("access_financial_reports") is True or
            any(admin.permissions.get(p) is True for p in ["view_transactions", "update_payment_status", "export_payment_reports", "view_analytics"])
        )
    )
    has_orders = admin.role == "SUPER_ADMIN" or (
        admin.permissions and (
            admin.permissions.get("manage_orders") is True or
            any(admin.permissions.get(p) is True for p in ["view_orders", "update_order_status", "cancel_orders", "view_order_details"])
        )
    )
    has_products = admin.role == "SUPER_ADMIN" or (
        admin.permissions and (
            admin.permissions.get("manage_products") is True or
            admin.permissions.get("manage_inventory") is True or
            any(admin.permissions.get(p) is True for p in ["view_products", "create_products", "edit_products", "delete_products", "view_inventory", "update_stock"])
        )
    )
    has_customers = admin.role == "SUPER_ADMIN" or (
        admin.permissions and (
            admin.permissions.get("manage_customers") is True or
            any(admin.permissions.get(p) is True for p in ["view_customers", "view_customer_history"])
        )
    )
    has_audit = admin.role == "SUPER_ADMIN" or (
        admin.permissions and (
            admin.permissions.get("access_gst_reports") is True or
            admin.permissions.get("view_audit_logs") is True
        )
    )

    now = datetime.now(timezone.utc)
    date_filter = None
    if not timeframe:
        timeframe = "All Time"

    if timeframe == "Today":
        date_filter = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif timeframe == "This Month":
        date_filter = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    elif timeframe == "Fiscal Year":
        fy = now.year if now.month >= 4 else now.year - 1
        date_filter = datetime(fy, 4, 1, 0, 0, 0, tzinfo=timezone.utc)
    elif timeframe == "Last 7 Days":
        date_filter = (now - timedelta(days=7)).replace(hour=0, minute=0, second=0, microsecond=0)
    elif timeframe == "All Time":
        date_filter = None

    tasks = {}

    if has_orders or has_financial:
        async def fetch_orders_metrics():
            async with database.async_session_factory() as session:
                today_iso = now.replace(hour=0, minute=0, second=0, microsecond=0)
                selects = []
                selects.append(func.sum(case(((OrderModel.created_at >= today_iso), 1), else_=0)))
                selects.append(func.sum(case(((OrderModel.created_at >= date_filter) if date_filter else (OrderModel.id.isnot(None)), 1), else_=0)))
                selects.append(func.sum(case((
                    (OrderModel.order_status.in_(REVENUE_ORDER_STATUSES)) &
                    (OrderModel.payment_status.in_(REVENUE_PAYMENT_STATUSES)) &
                    ((OrderModel.created_at >= date_filter) if date_filter else True),
                    OrderModel.total_amount
                ), else_=0.0)))
                
                q = select(*selects)
                res = await session.execute(q)
                return res.tuples().first()
        tasks["orders_metrics"] = fetch_orders_metrics()

    if has_orders:
        async def fetch_status_counts():
            async with database.async_session_factory() as session:
                st_q = select(OrderModel.order_status, func.count(OrderModel.id)).group_by(OrderModel.order_status)
                if date_filter:
                    st_q = st_q.where(OrderModel.created_at >= date_filter)
                st_res = await session.execute(st_q)
                return {r[0]: r[1] for r in st_res.all()}
        tasks["status_counts"] = fetch_status_counts()

    if has_products or has_financial:
        async def fetch_product_metrics():
            async with database.async_session_factory() as session:
                selects = []
                selects.append(func.sum(ProductModel.price * ProductModel.stock_quantity))
                selects.append(func.sum(ProductModel.units_sold))
                selects.append(func.sum(case((ProductModel.stock_quantity <= 0, 1), else_=0)))
                selects.append(func.sum(case(((ProductModel.stock_quantity > 0) & (ProductModel.stock_quantity <= ProductModel.low_stock_threshold), 1), else_=0)))
                selects.append(func.count(ProductModel.id))
                selects.append(func.sum(case((ProductModel.stock_quantity > 0, 1), else_=0)))
                
                q = select(*selects)
                res = await session.execute(q)
                return res.tuples().first()
        tasks["product_metrics"] = fetch_product_metrics()

    if has_financial and has_products:
        async def fetch_top_product():
            async with database.async_session_factory() as session:
                top_p_res = await session.execute(select(ProductModel).order_by(ProductModel.units_sold.desc()).limit(1))
                return top_p_res.scalar_one_or_none()
        tasks["top_product"] = fetch_top_product()

    if has_customers:
        async def fetch_customer_count():
            async with database.async_session_factory() as session:
                return (await session.execute(select(func.count(UserModel.id)).where(UserModel.role == "customer"))).scalar() or 0
        tasks["customer_count"] = fetch_customer_count()

    if has_products:
        async def fetch_inventory():
            async with database.async_session_factory() as session:
                inv_res = await session.execute(select(ProductModel).order_by(ProductModel.stock_quantity.asc()).limit(50))
                return inv_res.scalars().all()
        tasks["inventory"] = fetch_inventory()

    if has_audit:
        async def fetch_audit_metrics():
            async with database.async_session_factory() as session:
                audit_q = select(
                    func.sum(case((AuditLogModel.action.in_(["ADMIN_CREATED", "ADMIN_PASSWORD_RESET"]), 1), else_=0)),
                    func.sum(case((AuditLogModel.action.ilike("%DELETE%"), 1), else_=0))
                )
                res = await session.execute(audit_q)
                return res.tuples().first()
        tasks["audit_metrics"] = fetch_audit_metrics()

    if has_financial:
        async def fetch_best_sellers():
            async with database.async_session_factory() as session:
                best_prods_q = select(OrderModel.items).where(
                    OrderModel.order_status.in_(REVENUE_ORDER_STATUSES),
                    OrderModel.payment_status.in_(REVENUE_PAYMENT_STATUSES)
                )
                if date_filter:
                    best_prods_q = best_prods_q.where(OrderModel.created_at >= date_filter)
                best_prods_res = await session.execute(best_prods_q)
                return best_prods_res.scalars().all()
        tasks["best_sellers"] = fetch_best_sellers()

        async def fetch_revenue_trend():
            async with database.async_session_factory() as session:
                trend_q = select(OrderModel.created_at, OrderModel.total_amount).where(
                    OrderModel.order_status.in_(REVENUE_ORDER_STATUSES),
                    OrderModel.payment_status.in_(REVENUE_PAYMENT_STATUSES)
                )
                if date_filter:
                    trend_q = trend_q.where(OrderModel.created_at >= date_filter)
                trend_res = await session.execute(trend_q)
                return trend_res.all()
        tasks["revenue_trend"] = fetch_revenue_trend()

    task_keys = list(tasks.keys())
    task_futures = list(tasks.values())
    results = {}
    if task_futures:
        raw_results = await asyncio.gather(*task_futures)
        for k, val in zip(task_keys, raw_results):
            results[k] = val

    orders_val = results.get("orders_metrics")
    orders_today_count = int(orders_val[0]) if (orders_val and orders_val[0] is not None) else 0
    total_orders = int(orders_val[1]) if (orders_val and orders_val[1] is not None) else 0
    revenue = round(float(orders_val[2]), 2) if (orders_val and orders_val[2] is not None) else 0.0

    prod_val = results.get("product_metrics")
    if prod_val:
        total_inventory_value = round(float(prod_val[0]), 2) if prod_val[0] is not None else 0.0
        total_units_sold = int(prod_val[1]) if prod_val[1] is not None else 0
        out_of_stock_count = int(prod_val[2]) if prod_val[2] is not None else 0
        low_stock_count = int(prod_val[3]) if prod_val[3] is not None else 0
        total_prods = int(prod_val[4]) if prod_val[4] is not None else 0
        in_stock_count = int(prod_val[5]) if prod_val[5] is not None else 0
        stock_health = round((in_stock_count / total_prods * 100), 1) if total_prods > 0 else 100.0
    else:
        total_inventory_value = 0.0
        total_units_sold = 0
        out_of_stock_count = 0
        low_stock_count = 0
        total_prods = 0
        in_stock_count = 0
        stock_health = 100.0

    top_performer = None
    fastest_mover = None
    sales_velocity = 0.0
    top_p = results.get("top_product")
    if top_p:
        top_performer = {"name": top_p.name, "revenue": float((top_p.units_sold * (top_p.discount_price or top_p.price)))}
        fastest_mover = {"name": top_p.name, "units_sold": int(top_p.units_sold)}
        sales_velocity = round(total_units_sold / 30.0, 2)

    status_counts = results.get("status_counts", {})

    inventory_summary = []
    inv_scalars = results.get("inventory")
    if inv_scalars:
        inventory_summary = [{
            "id": str(p.id), "name": p.name, "sku": p.batch_no or p.variant_sku, "stock_left": p.stock_quantity, "units_sold": p.units_sold
        } for p in inv_scalars]

    total_customers = results.get("customer_count", 0)

    audit_val = results.get("audit_metrics")
    if audit_val:
        security_events_count = int(audit_val[0]) if audit_val[0] is not None else 0
        destructive_actions_count = int(audit_val[1]) if audit_val[1] is not None else 0
    else:
        security_events_count = 0
        destructive_actions_count = 0

    best_products = []
    best_prods_items = results.get("best_sellers")
    if best_prods_items is not None:
        product_counts = {}
        for items_json in best_prods_items:
            for item in (items_json or []):
                name = item.get("product_name") or item.get("name") or "Unknown Product"
                qty = int(item.get("quantity", 0))
                if name:
                    product_counts[name] = product_counts.get(name, 0) + qty
        best_products = [
            {"name": k, "quantity": v}
            for k, v in sorted(product_counts.items(), key=lambda x: x[1], reverse=True)[:10]
        ]

    revenue_trend = []
    orders_trend = results.get("revenue_trend")
    if orders_trend is not None:
        trend_map = {}
        if timeframe == "Today":
            for dt, amt in orders_trend:
                if dt:
                    hr_str = dt.strftime("%H:00")
                    trend_map[hr_str] = trend_map.get(hr_str, 0.0) + float(amt)
            sorted_keys = sorted(trend_map.keys())
            revenue_trend = [{"name": k, "value": round(trend_map[k], 2)} for k in sorted_keys]
            
        elif timeframe == "This Month":
            for dt, amt in orders_trend:
                if dt:
                    day_str = dt.strftime("%b %d")
                    trend_map[day_str] = trend_map.get(day_str, 0.0) + float(amt)
            sorted_keys = sorted(trend_map.keys(), key=lambda x: datetime.strptime(x, "%b %d"))
            revenue_trend = [{"name": k, "value": round(trend_map[k], 2)} for k in sorted_keys]
            
        elif timeframe == "Fiscal Year":
            for dt, amt in orders_trend:
                if dt:
                    m_str = dt.strftime("%b")
                    trend_map[m_str] = trend_map.get(m_str, 0.0) + float(amt)
            fy_months = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"]
            sorted_keys = [m for m in fy_months if m in trend_map]
            for m in trend_map:
                if m not in sorted_keys:
                    sorted_keys.append(m)
            revenue_trend = [{"name": k, "value": round(trend_map[k], 2)} for k in sorted_keys]
            
        elif timeframe == "All Time":
            for dt, amt in orders_trend:
                if dt:
                    m_str = dt.strftime("%b %Y")
                    trend_map[m_str] = trend_map.get(m_str, 0.0) + float(amt)
            sorted_keys = sorted(trend_map.keys(), key=lambda x: datetime.strptime(x, "%b %Y"))
            revenue_trend = [{"name": k, "value": round(trend_map[k], 2)} for k in sorted_keys]
            
        else: # Default "Last 7 Days"
            for i in range(7):
                d = (now - timedelta(days=i)).strftime("%b %d")
                trend_map[d] = 0.0
                
            for dt, amt in orders_trend:
                if dt:
                    d_str = dt.strftime("%b %d")
                    if d_str in trend_map:
                        trend_map[d_str] = trend_map.get(d_str, 0.0) + float(amt)
            sorted_keys = sorted(trend_map.keys(), key=lambda x: datetime.strptime(x, "%b %d"))
            revenue_trend = [{"name": k, "value": round(trend_map[k], 2)} for k in sorted_keys]

    metrics = {}
    if has_orders:
        metrics["total_orders"] = total_orders
        metrics["orders_today"] = orders_today_count
    if has_financial:
        metrics["total_revenue"] = revenue
    if has_products:
        metrics["total_products"] = total_prods
    if has_customers:
        metrics["total_customers"] = total_customers
    if has_financial:
        metrics["total_inventory_value"] = total_inventory_value
        metrics["total_units_sold"] = total_units_sold
    if has_products:
        metrics["out_of_stock_count"] = out_of_stock_count
        metrics["low_stock_count"] = low_stock_count
        metrics["stock_health"] = stock_health
    if has_financial and has_products:
        metrics["top_performer"] = top_performer
        metrics["fastest_mover"] = fastest_mover
        metrics["sales_velocity"] = sales_velocity
    if has_audit:
        metrics["security_events_count"] = security_events_count
        metrics["destructive_actions_count"] = destructive_actions_count

    return {
        "metrics": metrics,
        "order_status_counts": status_counts,
        "best_products": best_products,
        "inventory": inventory_summary,
        "revenue_trend": revenue_trend
    }
