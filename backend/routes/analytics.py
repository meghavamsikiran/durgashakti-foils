"""Analytics + Financial Reports routes."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from typing import Optional
from database import get_db
from models import OrderModel, ProductModel, UserModel, AuditLogModel
from deps import UserSchema, require_permission, sanitize_search_term, row_to_dict
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
    admin: UserSchema = Depends(require_permission("access_financial_reports")),
    db: AsyncSession = Depends(get_db)
):
    search = sanitize_search_term(search)
    base_q = select(OrderModel)
    count_q = select(func.count(OrderModel.id))

    if search:
        like_term = f"%{search}%"
        clause = or_(
            OrderModel.order_number.ilike(like_term),
            OrderModel.razorpay_payment_id.ilike(like_term),
            OrderModel.razorpay_order_id.ilike(like_term)
        )
        base_q = base_q.where(clause)
        count_q = count_q.where(clause)

    total = (await db.execute(count_q)).scalar() or 0
    offset = (page - 1) * limit
    res = await db.execute(base_q.order_by(OrderModel.created_at.desc()).offset(offset).limit(limit))
    items = []
    for o in res.scalars().all():
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
    admin: UserSchema = Depends(require_permission("access_financial_reports")),
    db: AsyncSession = Depends(get_db)
):
    now = datetime.now(timezone.utc)
    date_filter = None
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

    # 1. Revenue
    rev_q = select(func.sum(OrderModel.total_amount)).where(
        OrderModel.order_status.in_(REVENUE_ORDER_STATUSES),
        OrderModel.payment_status.in_(REVENUE_PAYMENT_STATUSES)
    )
    if date_filter:
        rev_q = rev_q.where(OrderModel.created_at >= date_filter)
    rev_val = (await db.execute(rev_q)).scalar() or 0.0
    revenue = round(float(rev_val), 2)

    # Inventory Value
    inv_val_q = select(func.sum(ProductModel.price * ProductModel.stock_quantity))
    inv_val = (await db.execute(inv_val_q)).scalar() or 0.0
    total_inventory_value = round(float(inv_val), 2)

    # Units sold
    units_sold_val = (await db.execute(select(func.sum(ProductModel.units_sold)))).scalar() or 0
    total_units_sold = int(units_sold_val)

    # Stock alerts
    out_of_stock_count = (await db.execute(
        select(func.count(ProductModel.id))
        .where(ProductModel.stock_quantity.isnot(None), ProductModel.stock_quantity <= 0)
    )).scalar() or 0
    
    low_stock_count = (await db.execute(
        select(func.count(ProductModel.id))
        .where(
            ProductModel.stock_quantity.isnot(None),
            ProductModel.stock_quantity > 0,
            ProductModel.stock_quantity <= ProductModel.low_stock_threshold
        )
    )).scalar() or 0

    total_prods = (await db.execute(
        select(func.count(ProductModel.id))
        .where(ProductModel.stock_quantity.isnot(None))
    )).scalar() or 0
    
    in_stock_count = (await db.execute(
        select(func.count(ProductModel.id))
        .where(ProductModel.stock_quantity.isnot(None), ProductModel.stock_quantity > 0)
    )).scalar() or 0
    
    stock_health = round((in_stock_count / total_prods * 100), 1) if total_prods > 0 else 100.0

    # Top Performer
    top_p_res = await db.execute(select(ProductModel).order_by(ProductModel.units_sold.desc()).limit(1))
    top_p = top_p_res.scalar_one_or_none()
    top_performer = {"name": top_p.name if top_p else "N/A", "revenue": float((top_p.units_sold * (top_p.discount_price or top_p.price)) if top_p else 0)}

    # Fastest Mover
    fastest_mover = {"name": top_p.name if top_p else "N/A", "units_sold": int(top_p.units_sold if top_p else 0)}
    sales_velocity = round(total_units_sold / 30.0, 2)

    today_iso = now.replace(hour=0, minute=0, second=0, microsecond=0)
    orders_today_count = (await db.execute(select(func.count(OrderModel.id)).where(OrderModel.created_at >= today_iso))).scalar() or 0

    # Status counts
    st_q = select(OrderModel.order_status, func.count(OrderModel.id)).group_by(OrderModel.order_status)
    if date_filter:
        st_q = st_q.where(OrderModel.created_at >= date_filter)
    st_res = await db.execute(st_q)
    status_counts = {r[0]: r[1] for r in st_res.all()}

    # Inventory summary
    inv_res = await db.execute(select(ProductModel).order_by(ProductModel.stock_quantity.asc()).limit(50))
    inventory_summary = [{
        "id": str(p.id), "name": p.name, "sku": p.batch_no or p.variant_sku, "stock_left": p.stock_quantity, "units_sold": p.units_sold
    } for p in inv_res.scalars().all()]

    total_orders_q = select(func.count(OrderModel.id))
    if date_filter:
        total_orders_q = total_orders_q.where(OrderModel.created_at >= date_filter)
    total_orders = (await db.execute(total_orders_q)).scalar() or 0

    metrics = {
        "total_orders": total_orders,
        "orders_today": orders_today_count,
        "total_revenue": revenue,
        "total_products": total_prods,
        "total_customers": (await db.execute(select(func.count(UserModel.id)).where(UserModel.role == "customer"))).scalar() or 0,
        "total_inventory_value": total_inventory_value,
        "total_units_sold": total_units_sold,
        "out_of_stock_count": out_of_stock_count,
        "low_stock_count": low_stock_count,
        "stock_health": stock_health,
        "top_performer": top_performer,
        "fastest_mover": fastest_mover,
        "sales_velocity": sales_velocity,
        "security_events_count": (await db.execute(select(func.count(AuditLogModel.id)).where(AuditLogModel.action.in_(["ADMIN_CREATED", "ADMIN_PASSWORD_RESET"])))).scalar() or 0,
        "destructive_actions_count": (await db.execute(select(func.count(AuditLogModel.id)).where(AuditLogModel.action.ilike("%DELETE%")))).scalar() or 0
    }

    # 2. Best Sellers calculation
    best_prods_q = select(OrderModel.items).where(
        OrderModel.order_status.in_(REVENUE_ORDER_STATUSES),
        OrderModel.payment_status.in_(REVENUE_PAYMENT_STATUSES)
    )
    if date_filter:
        best_prods_q = best_prods_q.where(OrderModel.created_at >= date_filter)
    
    best_prods_res = await db.execute(best_prods_q)
    product_counts = {}
    for items_json in best_prods_res.scalars().all():
        for item in (items_json or []):
            name = item.get("product_name") or item.get("name") or "Unknown Product"
            qty = int(item.get("quantity", 0))
            if name:
                product_counts[name] = product_counts.get(name, 0) + qty
                
    best_products = [
        {"name": k, "quantity": v}
        for k, v in sorted(product_counts.items(), key=lambda x: x[1], reverse=True)[:10]
    ]

    # 3. Revenue Trend calculation
    trend_q = select(OrderModel.created_at, OrderModel.total_amount).where(
        OrderModel.order_status.in_(REVENUE_ORDER_STATUSES),
        OrderModel.payment_status.in_(REVENUE_PAYMENT_STATUSES)
    )
    if date_filter:
        trend_q = trend_q.where(OrderModel.created_at >= date_filter)
    
    trend_res = await db.execute(trend_q)
    orders_trend = trend_res.all()
    
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

    return {
        "metrics": metrics,
        "order_status_counts": status_counts,
        "best_products": best_products,
        "inventory": inventory_summary,
        "revenue_trend": revenue_trend
    }
