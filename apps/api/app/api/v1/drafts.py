from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Response, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.v1.customer_auth import require_user
from app.api.v1.schemas import CartDraftPayload, CartDraftResponse
from app.db.mongo import get_db

router = APIRouter(prefix="/orders/drafts", tags=["orders"])


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _to_timestamp(dt: datetime) -> int:
    return int(dt.timestamp())


def _serialize_draft(doc: dict) -> CartDraftResponse:
    saved = doc.get("saved_at", _now())
    return CartDraftResponse(
        products=doc.get("products", []),
        note=doc.get("note"),
        saved_at=_to_timestamp(saved if isinstance(saved, datetime) else _now()),
    )


@router.get("", response_model=CartDraftResponse)
async def get_cart_draft(
    current_user: dict = Depends(require_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> CartDraftResponse:
    doc = await db["order_drafts"].find_one({"user_id": current_user["id"]})
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No draft found.")
    return _serialize_draft(doc)


@router.post("", response_model=CartDraftResponse)
async def save_cart_draft(
    payload: CartDraftPayload,
    current_user: dict = Depends(require_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> CartDraftResponse:
    now = _now()
    payload_data = payload.model_dump() if hasattr(payload, "model_dump") else payload.dict()
    doc = {
        "user_id": current_user["id"],
        "products": payload_data.get("products", []),
        "note": payload_data.get("note"),
        "saved_at": now,
        "updated_at": now,
    }
    await db["order_drafts"].update_one({"user_id": current_user["id"]}, {"$set": doc}, upsert=True)
    return _serialize_draft(doc)


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
async def delete_cart_draft(
    current_user: dict = Depends(require_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> Response:
    await db["order_drafts"].delete_one({"user_id": current_user["id"]})
    return Response(status_code=status.HTTP_204_NO_CONTENT)
