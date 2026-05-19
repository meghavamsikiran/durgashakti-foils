"""Auth routes: register, login, profile, password management."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from database import get_db
from models import UserModel, PasswordResetModel
from deps import (
    UserSchema, UserRegister, UserLogin, UserProfileUpdate,
    ChangePasswordRequest, ForgotPasswordRequest, ResetPasswordRequest,
    get_current_user, hash_password, verify_password, create_token,
    write_audit_log, send_email, row_to_dict,
)
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
import os, random, uuid, re, httpx

router = APIRouter(prefix="/api")

class GoogleLoginRequest(BaseModel):
    access_token: str

def is_valid_gmail(email: str) -> bool:
    # Match standard valid gmail format: alphanumeric + dots/pluses before @gmail.com
    pattern = r"^[a-zA-Z0-9._%+-]+@gmail\.com$"
    return bool(re.match(pattern, email, re.IGNORECASE))

@router.post("/auth/register")
async def register(user_data: UserRegister, db: AsyncSession = Depends(get_db)):
    if not is_valid_gmail(user_data.email):
        raise HTTPException(
            status_code=400,
            detail="Only valid @gmail.com accounts are permitted to register."
        )
    existing = await db.execute(select(UserModel).where(UserModel.email == user_data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = str(uuid.uuid4())
    new_user = UserModel(
        id=user_id,
        email=user_data.email,
        password=hash_password(user_data.password),
        full_name=user_data.full_name,
        phone=user_data.phone,
        role="customer",
        is_active=True,
    )
    db.add(new_user)
    await db.flush()
    token = create_token(user_id, user_data.email, "customer")
    d = row_to_dict(new_user)
    d.pop('password', None)
    # Send welcome email (fire-and-forget)
    try:
        from email_templates import welcome_email
        subj, body = welcome_email(user_data.full_name or user_data.email)
        import asyncio
        asyncio.create_task(send_email(user_data.email, subj, body))
    except Exception:
        pass
    return {"token": token, "user": UserSchema(**d)}


@router.post("/auth/login")
async def login(credentials: UserLogin, db: AsyncSession = Depends(get_db)):
    if not is_valid_gmail(credentials.email):
        raise HTTPException(
            status_code=400,
            detail="Only valid @gmail.com accounts are permitted to login."
        )
    result = await db.execute(select(UserModel).where(UserModel.email == credentials.email))
    user_row = result.scalar_one_or_none()
    if not user_row:
        raise HTTPException(status_code=401, detail="Account doesnot exists with given username, you want to create ?")
    if not verify_password(credentials.password, user_row.password):
        raise HTTPException(status_code=401, detail="Wrong username/password")
    if user_row.is_active is False:
        raise HTTPException(status_code=403, detail="Account is disabled. Please contact support.")
    d = row_to_dict(user_row)
    d.pop('password', None)
    user = UserSchema(**d)
    if user.role in {'admin', 'SUPER_ADMIN'}:
        await write_audit_log(db, "ADMIN_LOGIN", str(user_row.id), "user", str(user_row.id))
    token = create_token(str(user_row.id), user.email, user.role)
    return {"token": token, "user": user}


@router.post("/auth/google")
async def google_login(payload: GoogleLoginRequest, db: AsyncSession = Depends(get_db)):
    # 1. Fetch user information from Google OAuth2 API
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                params={"access_token": payload.access_token}
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=400, detail="Invalid Google access token")
            google_user = resp.json()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Google authentication failed: {str(e)}")

    email = google_user.get("email")
    name = google_user.get("name", "Google User")
    
    if not email:
        raise HTTPException(status_code=400, detail="Google account did not return a valid email address.")
        
    if not is_valid_gmail(email):
        raise HTTPException(
            status_code=400,
            detail="Only valid @gmail.com accounts are permitted to authenticate."
        )

    # 2. Check if user already exists
    result = await db.execute(select(UserModel).where(UserModel.email == email))
    user_row = result.scalar_one_or_none()

    if not user_row:
        # Create a new user automatically
        user_id = str(uuid.uuid4())
        # Generate a highly secure random password hash for Google-based registration
        random_pwd = os.urandom(24).hex()
        user_row = UserModel(
            id=user_id,
            email=email,
            password=hash_password(random_pwd),
            full_name=name,
            phone="",
            role="customer",
            is_active=True,
        )
        db.add(user_row)
        await db.flush()
        
        # Send dynamic welcome email (fire-and-forget)
        try:
            from email_templates import welcome_email
            subj, body = welcome_email(name)
            import asyncio
            asyncio.create_task(send_email(email, subj, body))
        except Exception:
            pass
    else:
        if user_row.is_active is False:
            raise HTTPException(status_code=403, detail="Account is disabled. Please contact support.")

    d = row_to_dict(user_row)
    d.pop('password', None)
    user = UserSchema(**d)
    
    if user.role in {'admin', 'SUPER_ADMIN'}:
        await write_audit_log(db, "ADMIN_LOGIN", str(user_row.id), "user", str(user_row.id))
        
    token = create_token(str(user_row.id), user.email, user.role)
    return {"token": token, "user": user}


@router.get("/auth/me")
async def get_me(current_user: UserSchema = Depends(get_current_user)):
    return current_user


@router.put("/auth/me")
async def update_profile(data: UserProfileUpdate, current_user: UserSchema = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    update_data = {}
    if data.full_name is not None:
        update_data['full_name'] = data.full_name
    if data.phone is not None:
        update_data['phone'] = data.phone
    if data.email is not None and data.email != current_user.email:
        dup = await db.execute(select(UserModel).where(UserModel.email == data.email, UserModel.id != current_user.id))
        if dup.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Email already in use")
        update_data['email'] = data.email
    if not update_data:
        return current_user
    await db.execute(update(UserModel).where(UserModel.id == current_user.id).values(**update_data))
    result = await db.execute(select(UserModel).where(UserModel.id == current_user.id))
    row = result.scalar_one()
    d = row_to_dict(row)
    d.pop('password', None)
    return UserSchema(**d)


@router.delete("/auth/me")
async def delete_account(current_user: UserSchema = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # This deletes the user and cascades to carts, addresses, notifications.
    # Orders have ondelete="SET NULL", so they are retained for accounting.
    res = await db.execute(select(UserModel).where(UserModel.id == current_user.id))
    u = res.scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    if u.role == "SUPER_ADMIN":
        raise HTTPException(status_code=400, detail="Cannot delete Super Admin account")
        
    user_email = u.email
    user_name = u.full_name

    await db.delete(u)
    await db.flush()

    # Send account deletion email
    try:
        from email_templates import account_deleted_email
        import asyncio
        sub, html = account_deleted_email(user_name or "Valued Customer")
        asyncio.create_task(send_email(user_email, sub, html))
    except Exception:
        pass
        
    return {"message": "Account deleted permanently"}


@router.post("/auth/change-password")
async def change_password(data: ChangePasswordRequest, current_user: UserSchema = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UserModel).where(UserModel.id == current_user.id))
    user_row = result.scalar_one()
    if not verify_password(data.current_password, user_row.password):
        raise HTTPException(status_code=400, detail="Invalid current password")
    await db.execute(update(UserModel).where(UserModel.id == current_user.id).values(password=hash_password(data.new_password)))
    await write_audit_log(db, "PASSWORD_CHANGED", current_user.id, "user", current_user.id)
    return {"message": "Password changed successfully"}


@router.post("/auth/forgot-password")
async def forgot_password(data: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UserModel).where(UserModel.email == data.email))
    user = result.scalar_one_or_none()
    if not user:
        return {"message": "If an account exists with this email, an OTP has been sent."}

    otp = str(random.randint(100000, 999999))
    expiry = datetime.now(timezone.utc) + timedelta(minutes=15)

    if os.environ.get('ENVIRONMENT') != 'production':
        print(f"\n[DEV] PASSWORD RESET OTP FOR {data.email}: {otp}\n")

    # Upsert password reset
    existing = await db.execute(select(PasswordResetModel).where(PasswordResetModel.email == data.email))
    row = existing.scalar_one_or_none()
    if row:
        row.otp = otp
        row.expiry = expiry
        row.failed_attempts = 0
    else:
        db.add(PasswordResetModel(email=data.email, otp=otp, expiry=expiry))
    await db.flush()

    email_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 10px;">
        <h2 style="color: #4f46e5; text-align: center;">DurgaShakti Foils</h2>
        <hr style="border: 0; border-top: 1px solid #e1e1e1; margin: 20px 0;">
        <p>Hello,</p>
        <p>Use the following OTP to reset your password:</p>
        <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1e293b; background: #f1f5f9; padding: 10px 20px; border-radius: 5px;">{otp}</span>
        </div>
        <p style="color: #64748b; font-size: 14px;">Valid for 15 minutes.</p>
    </div>
    """
    sent, err_msg = await send_email(data.email, "Password Reset OTP - DurgaShakti Foils", email_body)
    if not sent:
        raise HTTPException(status_code=500, detail=f"SMTP Deliverability Error: {err_msg}")
    return {"message": "If an account exists with this email, an OTP has been sent."}


@router.post("/auth/reset-password")
async def reset_password(data: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PasswordResetModel).where(PasswordResetModel.email == data.email))
    reset_record = result.scalar_one_or_none()
    if not reset_record or reset_record.otp != data.otp:
        if reset_record:
            reset_record.failed_attempts = (reset_record.failed_attempts or 0) + 1
            if reset_record.failed_attempts >= 5:
                await db.delete(reset_record)
                await db.flush()
                raise HTTPException(status_code=429, detail="Too many failed attempts. Please request a new OTP.")
            await db.flush()
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")

    if (reset_record.failed_attempts or 0) >= 5:
        raise HTTPException(status_code=429, detail="Too many failed attempts.")

    expiry = reset_record.expiry
    if expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=timezone.utc)
    if datetime.now(timezone.utc) > expiry:
        raise HTTPException(status_code=400, detail="OTP has expired")

    await db.execute(update(UserModel).where(UserModel.email == data.email).values(password=hash_password(data.new_password)))
    await db.delete(reset_record)
    return {"message": "Password reset successful. You can now login with your new password."}
