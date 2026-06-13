from fastapi import APIRouter, Depends, Query, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
from database import get_db
from models import ContactModel, utcnow
from datetime import datetime, timezone
from deps import require_permission, UserSchema, ContactCreate, send_email, get_current_user
from email_templates import (
    contact_acknowledgement_email,
    contact_reply_email,
    contact_resolved_email
)
from storage_service import upload_image

router = APIRouter(prefix="/api")

# ── Public Endpoints ─────────────────────────────────────────────────────
@router.post("/contacts/upload")
async def upload_contact_image(
    file: UploadFile = File(...),
    current_user: UserSchema = Depends(get_current_user)
):
    # Verify it is an image and not video
    ct = (file.content_type or "").lower()
    if not ct.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are supported")
    if ct.startswith("video/") or "video" in ct:
        raise HTTPException(status_code=400, detail="Video files are not supported")

    raw = await file.read()
    url = await upload_image(raw, ct, prefix="ticket")
    return {"url": url}

@router.get("/contacts/my")
async def list_my_contacts(
    current_user: UserSchema = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    q = select(ContactModel).where(ContactModel.email == current_user.email).order_by(ContactModel.created_at.desc())
    res = await db.execute(q)
    rows = res.scalars().all()
    items = [
        {
            "id": str(c.id),
            "ticket_id": f"DS-TKT-{str(c.id)[:8].upper()}",
            "name": c.name,
            "email": c.email,
            "phone": c.phone,
            "message": c.message,
            "status": c.status,
            "reply_message": c.reply_message,
            "replied_at": c.replied_at.isoformat() if c.replied_at else None,
            "created_at": c.created_at.isoformat()
        }
        for c in rows
    ]
    return {"items": items}

@router.post("/contact")
async def submit_contact(payload: ContactCreate, db: AsyncSession = Depends(get_db)):
    final_message = payload.message
    if payload.attachment_urls:
        attachments_text = "\n\n[Attachments]\n" + "\n".join(payload.attachment_urls)
        final_message += attachments_text

    contact = ContactModel(
        name=payload.name,
        email=payload.email,
        message=final_message,
        phone=payload.phone
    )
    db.add(contact)
    await db.flush()

    ticket_id = f"DS-TKT-{str(contact.id)[:8].upper()}"

    # Send auto-acknowledgement email
    subj, email_body = contact_acknowledgement_email(payload.name, payload.message, ticket_id)
    import asyncio
    asyncio.create_task(send_email(payload.email, subj, email_body))

    return {"message": "Message submitted successfully", "id": str(contact.id), "ticket_id": ticket_id}

# ── Admin Endpoints ──────────────────────────────────────────────────────
@router.get("/admin/contacts")
async def list_contacts(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    admin: UserSchema = Depends(require_permission("view_inquiries")),
    db: AsyncSession = Depends(get_db)
):
    q = select(ContactModel, func.count(ContactModel.id).over().label('total_count'))

    # apply optional filters
    if status:
        q = q.where(ContactModel.status == status)
    if start_date:
        try:
            sd = start_date.rstrip('Z')
            sd_dt = datetime.fromisoformat(sd)
            if sd_dt.tzinfo is None:
                sd_dt = sd_dt.replace(tzinfo=timezone.utc)
        except Exception:
            sd_dt = None
        if sd_dt:
            q = q.where(ContactModel.created_at >= sd_dt)
    if end_date:
        try:
            ed = end_date.rstrip('Z')
            ed_dt = datetime.fromisoformat(ed)
            if ed_dt.tzinfo is None:
                ed_dt = ed_dt.replace(tzinfo=timezone.utc)
        except Exception:
            ed_dt = None
        if ed_dt:
            q = q.where(ContactModel.created_at <= ed_dt)

    offset = (page - 1) * limit
    res = await db.execute(q.order_by(ContactModel.created_at.desc()).offset(offset).limit(limit))
    rows = res.all()
    
    total = 0
    if rows:
        total = rows[0][1]
    elif page > 1:
        total = (await db.execute(select(func.count(ContactModel.id)))).scalar() or 0

    items = [
        {
            "id": str(c.id),
            "ticket_id": f"DS-TKT-{str(c.id)[:8].upper()}",
            "name": c.name,
            "email": c.email,
            "phone": c.phone,
            "message": c.message,
            "status": c.status,
            "reply_message": c.reply_message,
            "replied_at": c.replied_at.isoformat() if c.replied_at else None,
            "created_at": c.created_at.isoformat()
        }
        for c, _ in rows
    ]
    return {"items": items, "total": total, "page": page, "limit": limit}

@router.put("/admin/contacts/{contact_id}/status")
async def update_contact_status(
    contact_id: str,
    data: dict,
    admin: UserSchema = Depends(require_permission("update_inquiry_status")),
    db: AsyncSession = Depends(get_db)
):
    status = data.get("status")
    if not status:
        raise HTTPException(status_code=400, detail="Status is required")
    if status == "closed":
        status = "resolved"
        
    res = await db.execute(select(ContactModel).where(ContactModel.id == contact_id))
    contact = res.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact inquiry not found")
        
    contact.status = status
    await db.flush()

    if status == "resolved":
        date_str = contact.created_at.strftime('%Y-%m-%d %H:%M:%S')
        ticket_id = f"DS-TKT-{str(contact.id)[:8].upper()}"
        subj, resolve_email_body = contact_resolved_email(contact.name, contact.message, date_str, ticket_id)
        import asyncio
        asyncio.create_task(send_email(contact.email, subj, resolve_email_body))

    return {"message": f"Status updated to {status} successfully", "status": contact.status}

@router.post("/admin/contacts/{contact_id}/reply")
async def reply_contact(
    contact_id: str,
    data: dict,
    admin: UserSchema = Depends(require_permission("reply_inquiry")),
    db: AsyncSession = Depends(get_db)
):
    reply_body = data.get("reply_message")
    if not reply_body:
        raise HTTPException(status_code=400, detail="Reply message is required")

    res = await db.execute(select(ContactModel).where(ContactModel.id == contact_id))
    contact = res.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact inquiry not found")

    if contact.status == "resolved":
        raise HTTPException(
            status_code=400, 
            detail="Cannot reply to a resolved/closed inquiry. Please re-open it (change status to Pending or In Progress) before replying."
        )

    contact.reply_message = reply_body
    contact.replied_at = utcnow()
    contact.status = "replied"
    await db.flush()

    date_str = contact.created_at.strftime('%Y-%m-%d %H:%M:%S')
    ticket_id = f"DS-TKT-{str(contact.id)[:8].upper()}"
    subj, customer_email_body = contact_reply_email(contact.name, contact.message, reply_body, date_str, ticket_id)
    sent, err_msg = await send_email(contact.email, subj, customer_email_body)

    return {
        "message": "Reply sent successfully" if sent else "Reply saved, but email delivery failed",
        "status": "replied",
        "email_sent": sent,
        "email_error": None if sent else err_msg
    }
