from __future__ import annotations

import hashlib
import random
from datetime import datetime, timedelta, timezone

import httpx
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError, PyMongoError
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.v1.customer_auth import require_user
from app.api.v1.schemas import (
    GoogleLoginRequest,
    PhoneOtpRequest,
    RequestOtpResponse,
    UserLoginRequest,
    UserProfile,
    UserProfileUpdateRequest,
    UserRegisterRequest,
    UserTokenResponse,
)
from app.core.config import settings
from app.core.security import create_customer_token, create_password_hash, verify_password
from app.db.mongo import ensure_indexes, get_db

router = APIRouter(prefix="/auth", tags=["customer-auth"])


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _hash_code(code: str) -> str:
    return hashlib.sha256(code.encode("utf-8")).hexdigest()


def _generate_otp() -> str:
    return f"{random.randint(0, 999_999):06d}"


async def _issue_token(phone: str) -> UserTokenResponse:
    token, expires_at = create_customer_token(phone)
    return UserTokenResponse(access_token=token, expires_at=expires_at, phone_verified=False)


async def _send_otp_sms(phone: str, code: str) -> None:
    if not settings.sms_provider_url:
        return
    payload = {
        "to": phone,
        "message": f"Ma xac thuc InAnh24h: {code}",
    }
    if settings.sms_sender_id:
        payload["sender_id"] = settings.sms_sender_id
    headers = {"Content-Type": "application/json"}
    if settings.sms_provider_token:
        headers["Authorization"] = f"Bearer {settings.sms_provider_token}"
    async with httpx.AsyncClient(timeout=6) as client:
        await client.post(settings.sms_provider_url, json=payload, headers=headers)


@router.post("/register", response_model=UserTokenResponse, status_code=status.HTTP_201_CREATED)
async def register_user(payload: UserRegisterRequest, db: AsyncIOMotorDatabase = Depends(get_db)) -> UserTokenResponse:
    phone = payload.phone.strip()
    email = payload.email.strip() if payload.email else None
    full_name = payload.full_name.strip() if payload.full_name else None
    address = payload.address.strip() if payload.address else None

    existing_user = await db["users"].find_one({"phone": phone})
    if existing_user:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Số điện thoại đã tồn tại.")
    salt, password_hash = create_password_hash(payload.password)
    user_doc = {
        "_id": phone,
        "phone": phone,
        "email": email,
        "full_name": full_name,
        "address": address,
        "password_salt": salt,
        "password_hash": password_hash,
        "phone_verified": False,
        "is_active": True,
        "created_at": _now(),
    }

    try:
        await db["users"].insert_one(user_doc)
    except DuplicateKeyError as exc:
        detail = "Số điện thoại đã tồn tại."
        try:
            key = exc.details.get("keyValue") if hasattr(exc, "details") and exc.details else None
            if key:
                if "phone" in key:
                    detail = "Số điện thoại đã tồn tại."
                elif "google_sub" in key:
                    detail = "Tài khoản Google đã tồn tại."
        except Exception:
            pass
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=detail)
    except PyMongoError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database is not reachable.") from exc

    token, expires_at = create_customer_token(phone)
    return UserTokenResponse(access_token=token, expires_at=expires_at, phone_verified=False)


@router.post("/login", response_model=UserTokenResponse)
async def login_user(payload: UserLoginRequest, db: AsyncIOMotorDatabase = Depends(get_db)) -> UserTokenResponse:
    identifier = payload.phone.strip()
    # Allow login by phone OR email.
    user = await db["users"].find_one({
        "$or": [
            {"phone": identifier, "is_active": {"$ne": False}},
            {"email": identifier, "is_active": {"$ne": False}},
        ]
    })
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sai thông tin đăng nhập.")
    if not verify_password(payload.password, user.get("password_salt", ""), user.get("password_hash", "")):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sai thông tin đăng nhập.")
    resolved_phone = user.get("phone") or identifier
    token = await _issue_token(resolved_phone)
    token.phone_verified = bool(user.get("phone_verified"))
    if settings.phone_otp_debug and not user.get("phone_verified"):
        otp_doc = await db["phone_otps"].find_one({"phone": resolved_phone, "consumed": False})
        if otp_doc and otp_doc.get("expires_at") and otp_doc["expires_at"] > _now():
            token.debug_otp = "***"
    return token


async def _verify_google_token(id_token: str) -> dict:
    if not settings.google_client_id:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Google login chưa được cấu hình.")
    async with httpx.AsyncClient(timeout=6) as client:
        resp = await client.get("https://oauth2.googleapis.com/tokeninfo", params={"id_token": id_token})
    if resp.status_code != 200:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token Google không hợp lệ.")
    data = resp.json()
    if data.get("aud") != settings.google_client_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Google client_id không khớp.")
    return data


@router.post("/google", response_model=UserTokenResponse)
async def login_google(payload: GoogleLoginRequest, db: AsyncIOMotorDatabase = Depends(get_db)) -> UserTokenResponse:
    google_data = await _verify_google_token(payload.id_token)
    sub = google_data.get("sub")
    email = google_data.get("email")
    if not sub:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Không lấy được thông tin Google.")

    user = await db["users"].find_one({"google_sub": sub})
    phone = payload.phone.strip() if payload.phone else None

    if user is None and not phone:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cần cung cấp số điện thoại.")

    if phone:
        existing_phone = await db["users"].find_one({"phone": phone, "google_sub": {"$ne": sub}})
        if existing_phone:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Số điện thoại đã được liên kết tài khoản khác.")

    if user is None:
        await ensure_indexes(db)
        doc = {
            "_id": phone,
            "phone": phone,
            "email": email,
            "password_salt": None,
            "password_hash": None,
            "google_sub": sub,
            "phone_verified": False,
            "is_active": True,
            "created_at": _now(),
        }
        await db["users"].insert_one(doc)
        user = doc
    else:
        if phone and not user.get("phone"):
            await db["users"].update_one({"_id": user["_id"]}, {"$set": {"phone": phone}})
            user["phone"] = phone

    token, expires_at = create_customer_token(user["_id"])
    return UserTokenResponse(access_token=token, expires_at=expires_at, phone_verified=bool(user.get("phone_verified")))


@router.post("/verify-phone", response_model=UserProfile)
async def verify_phone(
    payload: PhoneOtpRequest,
    current_user: dict = Depends(require_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> UserProfile:
    phone = current_user["id"]
    otp_doc = await db["phone_otps"].find_one({"phone": phone, "consumed": False})
    if otp_doc is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Không tìm thấy mã OTP.")
    if otp_doc.get("expires_at") and otp_doc["expires_at"] < _now():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Mã OTP đã hết hạn.")
    if otp_doc.get("code_hash") != _hash_code(payload.code.strip()):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Mã OTP không đúng.")

    await db["users"].update_one({"_id": phone}, {"$set": {"phone_verified": True}})
    await db["phone_otps"].update_one({"_id": otp_doc["_id"]}, {"$set": {"consumed": True}})
    user = await db["users"].find_one({"_id": phone})
    return UserProfile(
        phone=user["phone"],
        email=user.get("email"),
        full_name=user.get("full_name"),
        address=user.get("address"),
        phone_verified=bool(user.get("phone_verified")),
    )


@router.post("/request-otp", response_model=RequestOtpResponse)
async def request_otp(
    current_user: dict = Depends(require_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> RequestOtpResponse:
    phone = current_user.get("phone") or current_user["id"]
    if not phone:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tài khoản chưa có số điện thoại.")
    code = _generate_otp()
    await db["phone_otps"].insert_one(
        {
            "phone": phone,
            "code_hash": _hash_code(code),
            "created_at": _now(),
            "expires_at": _now() + timedelta(seconds=settings.phone_otp_ttl_seconds),
            "consumed": False,
        }
    )
    await _send_otp_sms(phone, code)
    debug_code = code if settings.phone_otp_debug else None
    return RequestOtpResponse(sent=True, debug_otp=debug_code)


@router.get("/me", response_model=UserProfile)
async def get_me(current_user: dict = Depends(require_user), db: AsyncIOMotorDatabase = Depends(get_db)) -> UserProfile:
    user = await db["users"].find_one({"_id": current_user["id"]})
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy tài khoản.")
    return UserProfile(
        phone=user.get("phone") or current_user["id"],
        email=user.get("email"),
        full_name=user.get("full_name"),
        address=user.get("address"),
        phone_verified=bool(user.get("phone_verified")),
    )

@router.patch("/me", response_model=UserProfile)
async def update_me(
    payload: UserProfileUpdateRequest,
    current_user: dict = Depends(require_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> UserProfile:
    update_data: dict = {}
    if payload.email is not None:
        value = payload.email.strip()
        update_data["email"] = value or None
    if payload.full_name is not None:
        value = payload.full_name.strip()
        update_data["full_name"] = value or None
    if payload.address is not None:
        value = payload.address.strip()
        update_data["address"] = value or None
    if not update_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Nothing to update.")
    doc = await db["users"].find_one_and_update(
        {"_id": current_user["id"]},
        {"$set": update_data},
        return_document=ReturnDocument.AFTER,
    )
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy tài khoản.")
    return UserProfile(
        phone=doc.get("phone") or current_user["id"],
        email=doc.get("email"),
        full_name=doc.get("full_name"),
        address=doc.get("address"),
        phone_verified=bool(doc.get("phone_verified")),
    )

