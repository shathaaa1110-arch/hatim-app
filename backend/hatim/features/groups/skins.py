"""Self-owned cosmetic changes; never invalidate a food decision round."""

from fastapi import APIRouter, HTTPException
from psycopg.types.json import Jsonb

from hatim.core.db import connect
from hatim.features.accounts import User

from .domain import circle_access, circle_view, ensure_open, outing_access, outing_view
from .models import CircleView, OutingView, Skin, SkinChange

router = APIRouter(prefix="/api/v2", tags=["Skins"])


def checked_skin(current, body: SkinChange):
    # Compare normalized models: defaults must not create a false conflict.
    value = Skin.model_validate(current) if current is not None else None
    if value != body.expected:
        raise HTTPException(409, "تغيّرت شخصيتك من جهاز آخر. أغلق المحرر وافتحه لمراجعة آخر شكل.")
    return Jsonb(body.skin.model_dump()) if body.skin is not None else None


@router.put("/groups/{circle_id}/me/skin", response_model=CircleView)
def circle_skin(circle_id: str, body: SkinChange, user: User):
    with connect() as db:
        circle, me = circle_access(db, circle_id, user.id, lock=True)
        ensure_open(circle)
        value = checked_skin(me["skin"], body)
        db.execute("UPDATE circle_members SET skin=%s WHERE id=%s", (value, me["id"]))
        return circle_view(db, *circle_access(db, circle_id, user.id))


@router.put("/outings/{outing_id}/me/skin", response_model=OutingView)
def outing_skin(outing_id: str, body: SkinChange, user: User):
    with connect() as db:
        circle, me, outing = outing_access(db, outing_id, user.id, lock=True)
        ensure_open(circle, outing)
        participant = db.execute(
            "SELECT skin_override FROM outing_participants WHERE outing_id=%s AND member_id=%s",
            (outing_id, me["id"]),
        ).fetchone()
        if not participant:
            raise HTTPException(404, "عضويتك غير موجودة في هذه الطلعة.")
        value = checked_skin(participant["skin_override"], body)
        db.execute(
            "UPDATE outing_participants SET skin_override=%s WHERE outing_id=%s AND member_id=%s",
            (value, outing_id, me["id"]),
        )
        return outing_view(db, circle, me, outing)
