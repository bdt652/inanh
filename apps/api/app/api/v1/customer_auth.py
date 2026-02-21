from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.security import verify_customer_token
from app.db.mongo import get_db

bearer_scheme = HTTPBearer(auto_error=False)


async def require_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncIOMotorDatabase = Depends(get_db),
    require_verified_phone: bool = False,
) -> dict:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Thiếu bearer token.")
    try:
        payload = verify_customer_token(credentials.credentials)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc

    user_id = str(payload.get("sub", ""))
    user_doc = await db["users"].find_one({"_id": user_id, "is_active": {"$ne": False}})
    if user_doc is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tài khoản không hợp lệ.")
    if require_verified_phone and not user_doc.get("phone_verified"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cần xác thực số điện thoại để tiếp tục.")
    return {"id": user_id, "phone_verified": bool(user_doc.get("phone_verified")), "phone": user_doc.get("phone")}
