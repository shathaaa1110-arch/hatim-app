import secrets

from fastapi import APIRouter, HTTPException
from psycopg.types.json import Jsonb

from hatim.core.db import connect
from hatim.domain.models import Settings
from hatim.features.accounts import User

from .domain import (
    catalog,
    circle_access,
    coordinator_target,
    ensure_open,
    invalidate,
    manage_outing,
    outing_access,
    outing_view,
    participant_rows,
    planning,
    preferences_for,
)
from .models import AttendanceChange, MemberSelection, OutingCreate, OutingView, SettingsChange

router = APIRouter(prefix="/api/v2", tags=["Outings"])


@router.post("/groups/{circle_id}/outings", response_model=OutingView, status_code=201)
def create(circle_id: str, body: OutingCreate, user: User):
    with connect() as db:
        circle, me = circle_access(db, circle_id, user.id, lock=True)
        ensure_open(circle)
        coordinator_id = coordinator_target(db, circle_id, body.coordinator_id or me["id"])
        outing_id = secrets.token_urlsafe(12)
        db.execute(
            "INSERT INTO outings(id,circle_id,title,coordinator_id,settings) VALUES(%s,%s,%s,%s,%s)",
            (
                outing_id,
                circle_id,
                body.title,
                coordinator_id,
                Jsonb(Settings(slots=body.slots, anchor_id=None).model_dump()),
            ),
        )
        db.execute(
            "INSERT INTO outing_participants(outing_id,member_id,circle_id,attendance) "
            "SELECT %s,id,circle_id,CASE WHEN id=%s THEN 'going' ELSE 'pending' END "
            "FROM circle_members WHERE circle_id=%s AND status='active'",
            (outing_id, me["id"], circle_id),
        )
        return outing_view(db, *outing_access(db, outing_id, user.id))


@router.get("/outings/{outing_id}", response_model=OutingView)
def get(outing_id: str, user: User):
    with connect(read_only=True) as db:
        return outing_view(db, *outing_access(db, outing_id, user.id))


@router.put("/outings/{outing_id}/me/attendance", response_model=OutingView)
def attendance(outing_id: str, body: AttendanceChange, user: User):
    with connect() as db:
        circle, me, outing = outing_access(db, outing_id, user.id, lock=True)
        ensure_open(circle, outing)
        previous = db.execute(
            "SELECT * FROM outing_participants WHERE outing_id=%s AND member_id=%s",
            (outing_id, me["id"]),
        ).fetchone()
        if not previous:
            raise HTTPException(404, "لست ضمن أعضاء هذه الطلعة.")
        if (
            previous["attendance"] != body.attendance
            or previous["budget_override"] != body.budget_override
        ):
            db.execute(
                "UPDATE outing_participants SET attendance=%s,budget_override=%s WHERE outing_id=%s AND member_id=%s",
                (body.attendance, body.budget_override, outing_id, me["id"]),
            )
            if previous["attendance"] == "going" or body.attendance == "going":
                invalidate(db, outing_id)
        return outing_view(db, *outing_access(db, outing_id, user.id))


@router.put("/outings/{outing_id}/settings", response_model=OutingView)
def settings(outing_id: str, change: SettingsChange, user: User):
    with connect() as db:
        circle, me, outing = outing_access(db, outing_id, user.id, lock=True)
        ensure_open(circle, outing)
        manage_outing(circle, me, outing)
        before = Settings.model_validate(outing["settings"])
        if change.expected != before:
            raise HTTPException(
                409, "تغيّرت الخطة من جهاز آخر. حدّث الصفحة وراجع الاختيار قبل الحفظ."
            )
        body = change.settings
        ids = set(
            body.pocket_ids + body.completed_ids + ([body.anchor_id] if body.anchor_id else [])
        )
        if not ids <= {e.id for e in catalog(db)} or body.anchor_id == "":
            raise HTTPException(422, "اختر تجارب موجودة.")
        db.execute(
            "UPDATE outings SET settings=%s WHERE id=%s", (Jsonb(body.model_dump()), outing_id)
        )
        # Slots alone are deliberately excluded: shrinking time preserves the choice.
        if (before.anchor_id, before.pocket_ids, before.completed_ids) != (
            body.anchor_id,
            body.pocket_ids,
            body.completed_ids,
        ):
            invalidate(db, outing_id)
        return outing_view(db, *outing_access(db, outing_id, user.id))


@router.put("/outings/{outing_id}/coordinator", response_model=OutingView)
def coordinator(outing_id: str, body: MemberSelection, user: User):
    with connect() as db:
        circle, me, outing = outing_access(db, outing_id, user.id, lock=True)
        manage_outing(circle, me, outing)
        ensure_open(circle, outing)
        coordinator_target(db, circle["id"], body.member_id)
        db.execute("UPDATE outings SET coordinator_id=%s WHERE id=%s", (body.member_id, outing_id))
        return outing_view(db, *outing_access(db, outing_id, user.id))


@router.post("/outings/{outing_id}/close", response_model=OutingView)
def close(outing_id: str, user: User):
    with connect() as db:
        circle, me, outing = outing_access(db, outing_id, user.id, lock=True)
        manage_outing(circle, me, outing)
        if outing["status"] == "open":
            _, rows, plan, _ = planning(db, outing)
            for row in rows:
                db.execute(
                    "UPDATE outing_participants SET snapshot=%s WHERE outing_id=%s AND member_id=%s",
                    (Jsonb(preferences_for(row).model_dump()), outing_id, row["member_id"]),
                )
            db.execute(
                "UPDATE outings SET status='closed',snapshot=%s WHERE id=%s",
                (Jsonb(plan.model_dump()), outing_id),
            )
            db.execute(
                "UPDATE decision_rounds SET status='invalidated' WHERE outing_id=%s AND status IN ('open','tied')",
                (outing_id,),
            )
        return outing_view(db, *outing_access(db, outing_id, user.id))


@router.post("/outings/{outing_id}/fun/{member_id}", response_model=OutingView)
def send_fun(outing_id: str, member_id: str, user: User):
    with connect() as db:
        circle, me, outing = outing_access(db, outing_id, user.id, lock=True)
        ensure_open(circle, outing)
        rows = participant_rows(db, outing)
        participants = {
            r["member_id"]: r
            for r in rows
            if r["attendance"] == "going" and r["status"] == "active"
        }
        if (
            me["id"] not in participants
            or member_id not in participants
            or not participants[member_id]["fun_opt_in"]
            or not participants[me["id"]]["fun_opt_in"]
        ):
            raise HTTPException(403, "المزاح للحاضرين الذين فعّلوا المشاركة فيه فقط.")
        db.execute(
            "INSERT INTO outing_fun_cards(outing_id,target_id,sender_id,expires_at) VALUES(%s,%s,%s,CURRENT_TIMESTAMP+INTERVAL '30 seconds') ON CONFLICT DO NOTHING",
            (outing_id, member_id, me["id"]),
        )
        return outing_view(db, circle, me, outing)


@router.delete("/outings/{outing_id}/fun/me", response_model=OutingView)
def dismiss_fun(outing_id: str, user: User):
    with connect() as db:
        circle, me, outing = outing_access(db, outing_id, user.id, lock=True)
        db.execute(
            "UPDATE outing_fun_cards SET dismissed=TRUE WHERE outing_id=%s AND target_id=%s",
            (outing_id, me["id"]),
        )
        return outing_view(db, circle, me, outing)
