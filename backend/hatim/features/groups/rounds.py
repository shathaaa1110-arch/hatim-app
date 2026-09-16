import secrets

from fastapi import APIRouter, HTTPException
from psycopg.types.json import Jsonb

from hatim.core.db import connect
from hatim.domain.models import Settings
from hatim.features.accounts import User

from .domain import (
    ensure_open,
    manage_outing,
    outing_access,
    outing_view,
    planning,
)
from .models import OutingView, RoundCreate, VoteChange

router = APIRouter(prefix="/api/v2", tags=["Shared decisions"])


def access(db, round_id, user_id):
    lookup = db.execute("SELECT outing_id FROM decision_rounds WHERE id=%s", (round_id,)).fetchone()
    if not lookup:
        raise HTTPException(404, "الجولة غير موجودة.")
    circle, me, outing = outing_access(db, lookup["outing_id"], user_id, lock=True)
    row = db.execute("SELECT * FROM decision_rounds WHERE id=%s FOR UPDATE", (round_id,)).fetchone()
    return circle, me, outing, row


@router.post("/outings/{outing_id}/rounds", response_model=OutingView, status_code=201)
def create(outing_id: str, body: RoundCreate, user: User):
    with connect() as db:
        circle, me, outing = outing_access(db, outing_id, user.id, lock=True)
        ensure_open(circle, outing)
        manage_outing(circle, me, outing)
        _, people, plan, eligible = planning(db, outing)
        if plan.available < 1 or not set(body.experience_ids) <= set(eligible):
            raise HTTPException(409, "اختر تجارب تناسب الحاضرين وخانة لم تُستهلك بعد.")
        voters = [
            r["member_id"] for r in people if r["attendance"] == "going" and r["status"] == "active"
        ]
        if not voters:
            raise HTTPException(409, "أكدوا حضور شخص واحد على الأقل.")
        if any(r["account_id"] is None for r in people if r["member_id"] in voters):
            raise HTTPException(
                409,
                "الحاضرون من القروب القديم يحتاجون ربط عضويتهم بحساب، أو الاعتذار عن الطلعة، قبل التصويت.",
            )
        current = db.execute(
            "SELECT status FROM decision_rounds WHERE outing_id=%s AND status IN ('open','tied')",
            (outing_id,),
        ).fetchone()
        if current:
            raise HTTPException(409, "ألغِ الجولة الحالية بوضوح قبل فتح جولة جديدة.")
        db.execute(
            "UPDATE decision_rounds SET status='invalidated' WHERE outing_id=%s AND status='resolved'",
            (outing_id,),
        )
        round_id = secrets.token_urlsafe(12)
        db.execute(
            "INSERT INTO decision_rounds(id,outing_id,mode,planning_revision,voter_ids) VALUES(%s,%s,%s,%s,%s)",
            (round_id, outing_id, body.mode, outing["planning_revision"], Jsonb(voters)),
        )
        for position, experience_id in enumerate(body.experience_ids):
            db.execute(
                "INSERT INTO round_options(round_id,experience_id,position) VALUES(%s,%s,%s)",
                (round_id, experience_id, position),
            )
        return outing_view(db, circle, me, outing)


@router.put("/rounds/{round_id}/my-vote", response_model=OutingView)
def vote(round_id: str, body: VoteChange, user: User):
    with connect() as db:
        circle, me, outing, row = access(db, round_id, user.id)
        ensure_open(circle, outing)
        if (
            row["status"] != "open"
            or row["mode"] != "vote"
            or row["planning_revision"] != outing["planning_revision"]
        ):
            raise HTTPException(409, "التصويت مغلق أو يحتاج مراجعة.")
        if me["id"] not in row["voter_ids"]:
            raise HTTPException(403, "التصويت للحاضرين عند فتح الجولة فقط.")
        if not db.execute(
            "SELECT 1 FROM round_options WHERE round_id=%s AND experience_id=%s",
            (round_id, body.experience_id),
        ).fetchone():
            raise HTTPException(422, "الخيار ليس ضمن هذه الجولة.")
        db.execute(
            "INSERT INTO votes(round_id,outing_id,member_id,experience_id) VALUES(%s,%s,%s,%s) "
            "ON CONFLICT(round_id,member_id) DO UPDATE SET experience_id=EXCLUDED.experience_id",
            (round_id, outing["id"], me["id"], body.experience_id),
        )
        return outing_view(db, circle, me, outing)


@router.delete("/rounds/{round_id}/my-vote", response_model=OutingView)
def withdraw(round_id: str, user: User):
    with connect() as db:
        circle, me, outing, row = access(db, round_id, user.id)
        ensure_open(circle, outing)
        if row["status"] != "open" or row["mode"] != "vote":
            raise HTTPException(409, "التصويت مغلق.")
        if me["id"] not in row["voter_ids"]:
            raise HTTPException(403, "لست ضمن المصوتين في الجولة.")
        db.execute("DELETE FROM votes WHERE round_id=%s AND member_id=%s", (round_id, me["id"]))
        return outing_view(db, circle, me, outing)


@router.post("/rounds/{round_id}/cancel", response_model=OutingView)
def cancel(round_id: str, user: User):
    with connect() as db:
        circle, me, outing, _row = access(db, round_id, user.id)
        ensure_open(circle, outing)
        manage_outing(circle, me, outing)
        db.execute("UPDATE decision_rounds SET status='invalidated' WHERE id=%s", (round_id,))
        return outing_view(db, circle, me, outing)


def finish(round_id, user, *, draw):
    with connect() as db:
        circle, me, outing, row = access(db, round_id, user.id)
        ensure_open(circle, outing)
        manage_outing(circle, me, outing)
        if row["status"] in ("resolved", "invalidated"):
            return outing_view(db, circle, me, outing)
        _, _, plan, eligible = planning(db, outing)
        choices = [
            r["experience_id"]
            for r in db.execute(
                "SELECT experience_id FROM round_options WHERE round_id=%s ORDER BY position",
                (round_id,),
            )
        ]
        if (
            row["planning_revision"] != outing["planning_revision"]
            or not set(choices) <= set(eligible)
            or plan.available < 1
        ):
            db.execute("UPDATE decision_rounds SET status='invalidated' WHERE id=%s", (round_id,))
            return outing_view(db, circle, me, outing)
        method = "draw"
        if row["mode"] == "vote":
            counts = {id: 0 for id in choices}
            for vote in db.execute(
                "SELECT experience_id FROM votes WHERE round_id=%s", (round_id,)
            ):
                counts[vote["experience_id"]] += 1
            maximum = max(counts.values())
            if maximum == 0:
                raise HTTPException(409, "لا توجد أصوات. ألغِ الجولة وافتح قرعة معلنة إن رغبت.")
            choices = [id for id in choices if counts[id] == maximum]
            if draw and row["status"] != "tied":
                raise HTTPException(409, "أغلق التصويت أولًا؛ القرعة هنا لفك التعادل فقط.")
            if not draw and len(choices) > 1:
                db.execute("UPDATE decision_rounds SET status='tied' WHERE id=%s", (round_id,))
                return outing_view(db, circle, me, outing)
            method = "draw" if draw else "vote"
        elif not draw:
            raise HTTPException(409, "هذه جولة قرعة. استخدم إجراء القرعة المعلن.")
        if row["mode"] == "draw" and len(choices) == 1:
            method = "only_option"
        winner = secrets.choice(choices)
        settings = Settings.model_validate(outing["settings"])
        settings = Settings.model_validate(
            {
                **settings.model_dump(),
                "anchor_id": winner,
                "pocket_ids": [id for id in settings.pocket_ids if id != winner],
            }
        )
        db.execute(
            "UPDATE decision_rounds SET status='resolved',result_id=%s,resolved_by=%s,resolved_at=CURRENT_TIMESTAMP WHERE id=%s",
            (winner, method, round_id),
        )
        db.execute(
            "UPDATE outings SET settings=%s WHERE id=%s",
            (Jsonb(settings.model_dump()), outing["id"]),
        )
        return outing_view(db, *outing_access(db, outing["id"], user.id))


@router.post("/rounds/{round_id}/resolve", response_model=OutingView)
def resolve(round_id: str, user: User):
    return finish(round_id, user, draw=False)


@router.post("/rounds/{round_id}/draw", response_model=OutingView)
def draw(round_id: str, user: User):
    return finish(round_id, user, draw=True)
