"""Shared queries and pure view construction. Writers lock circle -> outing -> round."""

import math
from datetime import UTC, datetime

from fastapi import HTTPException

from ..experience_store import catalog
from ..models import Member, Plan, Preferences, Settings
from ..planner import build_plan, evaluate
from .models import (
    CircleMember,
    CircleView,
    FunCard,
    OutingSummary,
    OutingView,
    Participant,
    RoundOption,
    RoundView,
)


def circle_access(db, circle_id, user_id, *, lock=False):
    circle = db.execute(
        "SELECT * FROM circles WHERE id=%s" + (" FOR UPDATE" if lock else ""), (circle_id,)
    ).fetchone()
    member = db.execute(
        "SELECT * FROM circle_members WHERE circle_id=%s AND account_id=%s AND status='active'",
        (circle_id, user_id),
    ).fetchone()
    if not circle or not member:
        raise HTTPException(404, "القروب غير متاح لحسابك أو أُزيلت عضويتك.")
    return circle, member


def owner_only(circle, user_id):
    if circle["owner_id"] != user_id:
        raise HTTPException(403, "هذا الإجراء لمالك القروب فقط.")


def outing_access(db, outing_id, user_id, *, lock=False):
    lookup = db.execute("SELECT circle_id FROM outings WHERE id=%s", (outing_id,)).fetchone()
    if not lookup:
        raise HTTPException(404, "الطلعة غير موجودة.")
    circle, me = circle_access(db, lookup["circle_id"], user_id, lock=lock)
    outing = db.execute(
        "SELECT * FROM outings WHERE id=%s" + (" FOR UPDATE" if lock else ""), (outing_id,)
    ).fetchone()
    return circle, me, outing


def manage_outing(circle, me, outing):
    if circle["owner_id"] != me["account_id"] and outing["coordinator_id"] != me["id"]:
        raise HTTPException(403, "هذا الإجراء لقائد الطلعة أو مالك القروب.")


def coordinator_target(db, circle_id, member_id):
    target = db.execute(
        "SELECT id FROM circle_members WHERE circle_id=%s AND id=%s "
        "AND status='active' AND account_id IS NOT NULL",
        (circle_id, member_id),
    ).fetchone()
    if not target:
        raise HTTPException(409, "اختر عضوًا نشطًا في هذا القروب وله حساب. الحضور يُؤكَّد بشكل مستقل.")
    return target["id"]


def ensure_open(circle, outing=None):
    if circle["archived"] or (outing and outing["status"] != "open"):
        raise HTTPException(409, "هذه اللمّة مؤرشفة؛ افتح طلعة جديدة.")


def invalidate(db, outing_id):
    db.execute("UPDATE outings SET planning_revision=planning_revision+1 WHERE id=%s", (outing_id,))
    db.execute(
        "UPDATE decision_rounds SET status='invalidated' WHERE outing_id=%s AND status<>'invalidated'",
        (outing_id,),
    )


def invalidate_member(db, circle_id, member_id):
    rows = db.execute(
        "SELECT o.id FROM outings o JOIN outing_participants p ON p.outing_id=o.id "
        "WHERE o.circle_id=%s AND o.status='open' AND p.member_id=%s AND p.attendance='going' "
        "ORDER BY o.id FOR UPDATE OF o",
        (circle_id, member_id),
    ).fetchall()
    for row in rows:
        invalidate(db, row["id"])


def participant_rows(db, outing):
    return db.execute(
        "SELECT p.*,m.preferences,m.account_id,m.fun_opt_in,m.status,"
        "EXISTS(SELECT 1 FROM outing_fun_cards f WHERE f.outing_id=p.outing_id AND f.target_id=p.member_id) AS fun_used "
        "FROM outing_participants p "
        "JOIN circle_members m ON m.id=p.member_id WHERE p.outing_id=%s "
        "ORDER BY m.joined_at,m.id",
        (outing["id"],),
    ).fetchall()


def preferences_for(row, *, archived=False):
    if archived and row["snapshot"]:
        return Preferences.model_validate(row["snapshot"])
    preferences = Preferences.model_validate(row["preferences"])
    if row["budget_override"] is not None:
        preferences = preferences.model_copy(update={"budget": row["budget_override"]})
    return preferences


def planning(db, outing):
    entries = catalog(db)
    rows = participant_rows(db, outing)
    people = [
        Member(id=r["member_id"], preferences=preferences_for(r))
        for r in rows
        if r["attendance"] == "going" and r["status"] == "active"
    ]
    settings = Settings.model_validate(outing["settings"])
    if outing["status"] == "closed" and outing["snapshot"]:
        plan = Plan.model_validate(outing["snapshot"])
    elif people:
        plan = build_plan(entries, people, settings)
    else:
        plan = Plan(
            selected=[],
            pocket=[],
            consumed=len(settings.completed_ids),
            available=settings.slots - len(settings.completed_ids),
            unfilled=settings.slots - len(settings.completed_ids),
            anchor_issue="أكدوا الحضور أولًا حتى نحسب خطة تناسبكم.",
        )
    eligible = [
        e.id
        for e in entries
        if people
        and not evaluate(e, people)[0]
        and e.id not in settings.completed_ids
        and e.id not in settings.pocket_ids
    ]
    return entries, rows, plan, eligible


def member_view(row, circle, me):
    return CircleMember(
        id=row["id"],
        name=row["preferences"]["name"],
        is_owner=row["account_id"] == circle["owner_id"],
        is_me=row["id"] == me["id"],
        claimed=row["account_id"] is not None,
        status=row["status"],
        fun_opt_in=row["fun_opt_in"],
        preferences=Preferences.model_validate(row["preferences"])
        if me["account_id"] == circle["owner_id"] or row["id"] == me["id"]
        else None,
    )


def circle_view(db, circle, me):
    rows = db.execute(
        "SELECT * FROM circle_members WHERE circle_id=%s ORDER BY joined_at,id", (circle["id"],)
    ).fetchall()
    outings = db.execute(
        "SELECT o.*, (SELECT count(*) FROM outing_participants p JOIN circle_members m ON m.id=p.member_id "
        "WHERE p.outing_id=o.id AND p.attendance='going' AND (o.status='closed' OR m.status='active')) AS going "
        "FROM outings o WHERE circle_id=%s ORDER BY created_at DESC,id",
        (circle["id"],),
    ).fetchall()
    return CircleView(
        id=circle["id"],
        title=circle["title"],
        invite_code=circle["invite_code"],
        is_owner=circle["owner_id"] == me["account_id"],
        archived=circle["archived"],
        pinned=me["pinned"],
        me=member_view(me, circle, me),
        members=[
            member_view(r, circle, me)
            for r in rows
            if r["status"] == "active" or circle["owner_id"] == me["account_id"]
        ],
        outings=[
            OutingSummary(
                id=o["id"],
                title=o["title"],
                status=o["status"],
                going=o["going"],
                slots=o["settings"]["slots"],
                coordinator_name=next(
                    r["preferences"]["name"] for r in rows if r["id"] == o["coordinator_id"]
                ),
            )
            for o in outings
        ],
    )


def round_view(db, row, me, outing):
    if row is None:
        return None
    votes = db.execute("SELECT * FROM votes WHERE round_id=%s", (row["id"],)).fetchall()
    options = db.execute(
        "SELECT experience_id FROM round_options WHERE round_id=%s ORDER BY position", (row["id"],)
    ).fetchall()
    return RoundView(
        id=row["id"],
        mode=row["mode"],
        status=row["status"],
        options=[
            RoundOption(
                experience_id=o["experience_id"],
                votes=sum(v["experience_id"] == o["experience_id"] for v in votes),
            )
            for o in options
        ],
        my_vote=next((v["experience_id"] for v in votes if v["member_id"] == me["id"]), None),
        voter_count=len(row["voter_ids"]),
        voted_count=len(votes),
        can_vote=row["mode"] == "vote"
        and row["status"] == "open"
        and me["id"] in row["voter_ids"]
        and outing["status"] == "open",
        result_id=row["result_id"],
        resolved_by=row["resolved_by"],
        resolved_at=row["resolved_at"].isoformat() if row["resolved_at"] else None,
    )


def outing_view(db, circle, me, outing):
    entries, rows, plan, eligible = planning(db, outing)
    manage = circle["owner_id"] == me["account_id"] or outing["coordinator_id"] == me["id"]
    decision = db.execute(
        "SELECT * FROM decision_rounds WHERE outing_id=%s ORDER BY created_at DESC,id DESC LIMIT 1",
        (outing["id"],),
    ).fetchone()
    current = round_view(db, decision, me, outing)
    if (
        current
        and current.status == "resolved"
        and current.result_id == outing["settings"]["anchor_id"]
    ):
        explanation = (
            f"اختيار المجموعة: {max(o.votes for o in current.options)} من {current.voter_count} أصوات."
            if current.resolved_by == "vote"
            else "ركيزتكم حُسمت بقرعة مشتركة ومحفوظة."
            if current.resolved_by == "draw"
            else "الخيار الوحيد المناسب في الجولة."
        )
        plan = plan.model_copy(
            update={
                "selected": [
                    d.model_copy(update={"reason": explanation})
                    if d.experience_id == current.result_id
                    else d
                    for d in plan.selected
                ]
            }
        )
    if not manage:
        reasons = {e.id: e.why for e in entries}
        plan = plan.model_copy(
            update={
                "selected": [
                    d.model_copy(
                        update={
                            "adaptations": [],
                            "reason": d.reason
                            if current
                            and d.experience_id == current.result_id
                            and current.status == "resolved"
                            else "ركيزة اختارها قائد الطلعة؛ تبقى عند تقليص الخانات."
                            if d.priority == "ركيزة"
                            and (current is None or d.experience_id != current.result_id)
                            else "ركيزتكم محفوظة، وتحتاج مراجعة بعد تغيّر معطيات الاختيار."
                            if d.priority == "ركيزة" and current and current.status == "invalidated"
                            else d.reason
                            if d.priority == "ركيزة"
                            else reasons[d.experience_id],
                        }
                    )
                    for d in plan.selected
                ],
                "pocket": [
                    p.model_copy(
                        update={
                            "reason": "تحتاج مراجعة توافقها مع الحاضرين." if p.blocked else p.reason
                        }
                    )
                    for p in plan.pocket
                ],
                "anchor_issue": "قائد الطلعة يراجع توافق الركيزة. لم نستبدلها بصمت."
                if plan.anchor_issue
                else None,
            }
        )
    now = datetime.now(UTC)
    cards = (
        db.execute(
            "SELECT f.*,m.preferences->>'name' AS target_name FROM outing_fun_cards f "
            "JOIN circle_members m ON m.id=f.target_id WHERE f.outing_id=%s "
            "AND NOT f.dismissed AND f.expires_at>CURRENT_TIMESTAMP AND m.status='active' AND m.fun_opt_in",
            (outing["id"],),
        ).fetchall()
        if outing["status"] == "open"
        else []
    )
    return OutingView(
        id=outing["id"],
        circle_id=circle["id"],
        title=outing["title"],
        owner_name=db.execute(
            "SELECT preferences->>'name' AS name FROM circle_members WHERE circle_id=%s AND account_id=%s",
            (circle["id"], circle["owner_id"]),
        ).fetchone()["name"],
        coordinator_name=next(
            preferences_for(r, archived=outing["status"] == "closed").name
            for r in rows
            if r["member_id"] == outing["coordinator_id"]
        ),
        coordinator_id=outing["coordinator_id"],
        status=outing["status"],
        settings=Settings.model_validate(outing["settings"]),
        plan=plan,
        my_member_id=me["id"],
        can_manage=manage,
        is_owner=circle["owner_id"] == me["account_id"],
        eligible_ids=eligible if manage and outing["status"] == "open" else [],
        participants=[
            Participant(
                member_id=r["member_id"],
                name=preferences_for(r, archived=outing["status"] == "closed").name,
                attendance=r["attendance"],
                is_me=r["member_id"] == me["id"],
                is_coordinator=r["member_id"] == outing["coordinator_id"],
                is_owner=r["account_id"] == circle["owner_id"],
                fun_opt_in=r["fun_opt_in"],
                claimed=r["account_id"] is not None,
                fun_used=r["fun_used"],
                budget_override=r["budget_override"]
                if manage or r["member_id"] == me["id"]
                else None,
                preferences=preferences_for(r, archived=outing["status"] == "closed")
                if manage or r["member_id"] == me["id"]
                else None,
            )
            for r in rows
            if r["status"] == "active" or outing["status"] == "closed"
        ],
        round=current,
        cards=[
            FunCard(
                target_id=f["target_id"],
                target_name=f["target_name"],
                remaining_seconds=max(0, math.ceil((f["expires_at"] - now).total_seconds())),
            )
            for f in cards
        ],
        planning_revision=outing["planning_revision"],
    )
