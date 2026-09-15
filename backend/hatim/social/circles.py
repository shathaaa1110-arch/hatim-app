import secrets

from fastapi import APIRouter, HTTPException
from psycopg.types.json import Jsonb

from ..models import Experience, Preferences
from ..store import connect, digest
from .auth import User
from .domain import circle_access, circle_view, ensure_open, invalidate_member, owner_only
from .models import (
    CircleCreate,
    CircleJoin,
    CircleSummary,
    CircleView,
    LegacyClaim,
    MemberSelection,
    MembershipOptions,
    PublicCircle,
    TitleChange,
)

router = APIRouter(prefix="/api/v2", tags=["Circles"])


def add_participation(db, circle_id, member_id):
    db.execute(
        "INSERT INTO outing_participants(outing_id,member_id,circle_id) "
        "SELECT id,%s,circle_id FROM outings WHERE circle_id=%s AND status='open' "
        "ON CONFLICT(outing_id,member_id) DO UPDATE SET attendance='pending',budget_override=NULL",
        (member_id, circle_id),
    )


def capacity(db, circle_id):
    count = db.execute(
        "SELECT count(*) AS n FROM circle_members WHERE circle_id=%s AND status='active'",
        (circle_id,),
    ).fetchone()["n"]
    if count >= 12:
        raise HTTPException(409, "القروب ممتلئ؛ الحد ١٢ شخصًا.")


@router.get("/experiences")
def experiences() -> list[Experience]:
    from .domain import catalog

    with connect(read_only=True) as db:
        return catalog(db)


@router.get("/groups", response_model=list[CircleSummary])
def groups(user: User):
    with connect(read_only=True) as db:
        rows = db.execute(
            "SELECT c.*,m.pinned,(SELECT count(*) FROM circle_members x WHERE x.circle_id=c.id AND x.status='active') AS n "
            "FROM circles c JOIN circle_members m ON m.circle_id=c.id "
            "WHERE m.account_id=%s AND m.status='active' ORDER BY c.archived,m.pinned DESC,c.created_at DESC,c.id",
            (user.id,),
        )
        return [
            CircleSummary(
                id=r["id"],
                title=r["title"],
                member_count=r["n"],
                pinned=r["pinned"],
                is_owner=r["owner_id"] == user.id,
                archived=r["archived"],
            )
            for r in rows
        ]


@router.post("/groups", response_model=CircleView, status_code=201)
def create_circle(body: CircleCreate, user: User):
    circle_id, member_id = secrets.token_urlsafe(12), secrets.token_urlsafe(12)
    with connect() as db:
        db.execute(
            "INSERT INTO circles(id,title,owner_id,invite_code) VALUES(%s,%s,%s,%s)",
            (circle_id, body.title, user.id, secrets.token_urlsafe(18)),
        )
        db.execute(
            "INSERT INTO circle_members(id,circle_id,account_id,preferences) VALUES(%s,%s,%s,%s)",
            (member_id, circle_id, user.id, Jsonb(body.preferences.model_dump())),
        )
        return circle_view(db, *circle_access(db, circle_id, user.id))


@router.post("/legacy/claim", response_model=CircleView)
def claim_legacy(body: LegacyClaim, user: User):
    with connect() as db:
        old = db.execute(
            "SELECT * FROM groups WHERE id=%s AND owner_hash=%s FOR UPDATE",
            (body.group_id, digest(body.owner_token.get_secret_value())),
        ).fetchone()
        if not old:
            raise HTTPException(404, "تعذّر إثبات ملكية القروب السابق.")
        existing = db.execute(
            "SELECT id FROM circles WHERE legacy_group_id=%s", (old["id"],)
        ).fetchone()
        if existing:
            return circle_view(db, *circle_access(db, existing["id"], user.id))
        circle_id = secrets.token_urlsafe(12)
        db.execute(
            "INSERT INTO circles(id,title,owner_id,invite_code,legacy_group_id) VALUES(%s,%s,%s,%s,%s)",
            (circle_id, old["title"], user.id, old["invite_code"], old["id"]),
        )
        members = db.execute(
            "SELECT * FROM members WHERE group_id=%s ORDER BY created_at,sequence", (old["id"],)
        ).fetchall()
        owner_id = None
        for member in members:
            db.execute(
                "INSERT INTO circle_members(id,circle_id,account_id,legacy_hash,preferences,joined_at) VALUES(%s,%s,%s,%s,%s,%s)",
                (
                    member["id"],
                    circle_id,
                    user.id if member["organizer"] else None,
                    None if member["organizer"] else member["token_hash"],
                    Jsonb(member["preferences"]),
                    member["created_at"],
                ),
            )
            if member["organizer"]:
                owner_id = member["id"]
        if not owner_id:
            raise HTTPException(409, "القروب القديم يحتاج مراجعة عضوية المنظّم.")
        outing_id = secrets.token_urlsafe(12)
        db.execute(
            "INSERT INTO outings(id,circle_id,title,coordinator_id,settings) VALUES(%s,%s,%s,%s,%s)",
            (outing_id, circle_id, "خطّتنا الأولى", owner_id, Jsonb(old["settings"])),
        )
        for member in members:
            db.execute(
                "INSERT INTO outing_participants(outing_id,member_id,circle_id,attendance) VALUES(%s,%s,%s,'going')",
                (outing_id, member["id"], circle_id),
            )
        return circle_view(db, *circle_access(db, circle_id, user.id))


@router.get("/groups/{circle_id}", response_model=CircleView)
def group(circle_id: str, user: User):
    with connect(read_only=True) as db:
        return circle_view(db, *circle_access(db, circle_id, user.id))


@router.put("/groups/{circle_id}/title", response_model=CircleView)
def rename(circle_id: str, body: TitleChange, user: User):
    with connect() as db:
        circle, _me = circle_access(db, circle_id, user.id, lock=True)
        owner_only(circle, user.id)
        ensure_open(circle)
        db.execute("UPDATE circles SET title=%s WHERE id=%s", (body.title, circle_id))
        return circle_view(db, *circle_access(db, circle_id, user.id))


@router.put("/groups/{circle_id}/me/preferences", response_model=CircleView)
def preferences(circle_id: str, body: Preferences, user: User):
    with connect() as db:
        circle, me = circle_access(db, circle_id, user.id, lock=True)
        ensure_open(circle)
        if body.model_dump() != me["preferences"]:
            invalidate_member(db, circle_id, me["id"])
            db.execute(
                "UPDATE circle_members SET preferences=%s WHERE id=%s",
                (Jsonb(body.model_dump()), me["id"]),
            )
        return circle_view(db, *circle_access(db, circle_id, user.id))


@router.patch("/groups/{circle_id}/me/options", response_model=CircleView)
def options(circle_id: str, body: MembershipOptions, user: User):
    with connect() as db:
        _circle, me = circle_access(db, circle_id, user.id, lock=True)
        db.execute(
            "UPDATE circle_members SET pinned=COALESCE(%s,pinned),fun_opt_in=COALESCE(%s,fun_opt_in) WHERE id=%s",
            (body.pinned, body.fun_opt_in, me["id"]),
        )
        if body.fun_opt_in is False:
            db.execute("UPDATE outing_fun_cards SET dismissed=TRUE WHERE target_id=%s", (me["id"],))
        return circle_view(db, *circle_access(db, circle_id, user.id))


@router.get("/invites/{code}", response_model=PublicCircle)
def invite(code: str):
    with connect(read_only=True) as db:
        row = db.execute(
            "SELECT c.*, (SELECT count(*) FROM circle_members m WHERE m.circle_id=c.id AND m.status='active') AS n "
            "FROM circles c WHERE invite_code=%s AND NOT archived",
            (code,),
        ).fetchone()
        if not row:
            raise HTTPException(404, "دعوة غير متاحة.")
        return PublicCircle(id=row["id"], title=row["title"], member_count=row["n"])


@router.post("/invites/{code}/join", response_model=CircleView)
def join(code: str, body: CircleJoin, user: User):
    with connect() as db:
        circle = db.execute(
            "SELECT * FROM circles WHERE invite_code=%s FOR UPDATE", (code,)
        ).fetchone()
        if not circle:
            raise HTTPException(404, "دعوة غير متاحة.")
        ensure_open(circle)
        existing = db.execute(
            "SELECT * FROM circle_members WHERE circle_id=%s AND account_id=%s",
            (circle["id"], user.id),
        ).fetchone()
        if existing:
            if existing["status"] == "removed":
                raise HTTPException(403, "أُزيلت عضويتك؛ إعادة الانضمام تحتاج موافقة مالك القروب.")
            return circle_view(db, circle, existing)
        legacy = None
        if body.legacy_token:
            legacy = db.execute(
                "SELECT * FROM circle_members WHERE circle_id=%s AND legacy_hash=%s",
                (circle["id"], digest(body.legacy_token.get_secret_value())),
            ).fetchone()
            if legacy and (legacy["status"] == "removed" or legacy["account_id"] is not None):
                raise HTTPException(403, "العضوية السابقة غير متاحة للربط بهذا الحساب.")
        if legacy:
            member_id = legacy["id"]
            invalidate_member(db, circle["id"], member_id)
            db.execute(
                "UPDATE circle_members SET account_id=%s,legacy_hash=NULL,preferences=%s WHERE id=%s",
                (user.id, Jsonb(body.preferences.model_dump()), member_id),
            )
        else:
            capacity(db, circle["id"])
            member_id = secrets.token_urlsafe(12)
            db.execute(
                "INSERT INTO circle_members(id,circle_id,account_id,preferences) VALUES(%s,%s,%s,%s)",
                (member_id, circle["id"], user.id, Jsonb(body.preferences.model_dump())),
            )
            add_participation(db, circle["id"], member_id)
        return circle_view(db, *circle_access(db, circle["id"], user.id))


@router.post("/groups/{circle_id}/members/{member_id}/remove", response_model=CircleView)
def remove(circle_id: str, member_id: str, user: User):
    with connect() as db:
        circle, me = circle_access(db, circle_id, user.id, lock=True)
        owner_only(circle, user.id)
        ensure_open(circle)
        target = db.execute(
            "SELECT * FROM circle_members WHERE circle_id=%s AND id=%s", (circle_id, member_id)
        ).fetchone()
        if not target or target["account_id"] == user.id:
            raise HTTPException(409, "لا يمكن إزالة مالك القروب؛ انقل الملكية أولًا.")
        if target["status"] != "removed":
            invalidate_member(db, circle_id, member_id)
            db.execute("UPDATE circle_members SET status='removed' WHERE id=%s", (member_id,))
            db.execute(
                "UPDATE outing_participants SET attendance='declined' WHERE member_id=%s AND outing_id IN (SELECT id FROM outings WHERE status='open')",
                (member_id,),
            )
            db.execute(
                "UPDATE outings SET coordinator_id=%s WHERE circle_id=%s AND coordinator_id=%s AND status='open'",
                (me["id"], circle_id, member_id),
            )
            db.execute(
                "UPDATE outing_fun_cards SET dismissed=TRUE WHERE target_id=%s OR sender_id=%s",
                (member_id, member_id),
            )
        return circle_view(db, circle, me)


@router.post("/groups/{circle_id}/members/{member_id}/restore", response_model=CircleView)
def restore(circle_id: str, member_id: str, user: User):
    with connect() as db:
        circle, me = circle_access(db, circle_id, user.id, lock=True)
        owner_only(circle, user.id)
        ensure_open(circle)
        target = db.execute(
            "SELECT * FROM circle_members WHERE circle_id=%s AND id=%s", (circle_id, member_id)
        ).fetchone()
        if not target:
            raise HTTPException(404, "العضو غير موجود.")
        if target["status"] == "removed":
            capacity(db, circle_id)
            db.execute("UPDATE circle_members SET status='active' WHERE id=%s", (member_id,))
            add_participation(db, circle_id, member_id)
        return circle_view(db, circle, me)


@router.post("/groups/{circle_id}/transfer", response_model=CircleView)
def transfer(circle_id: str, body: MemberSelection, user: User):
    with connect() as db:
        circle, _me = circle_access(db, circle_id, user.id, lock=True)
        owner_only(circle, user.id)
        ensure_open(circle)
        target = db.execute(
            "SELECT account_id FROM circle_members WHERE circle_id=%s AND id=%s AND status='active' AND account_id IS NOT NULL",
            (circle_id, body.member_id),
        ).fetchone()
        if not target:
            raise HTTPException(409, "اختر عضوًا فعّالًا مرتبطًا بحساب.")
        db.execute("UPDATE circles SET owner_id=%s WHERE id=%s", (target["account_id"], circle_id))
        return circle_view(db, *circle_access(db, circle_id, user.id))


@router.post("/groups/{circle_id}/archive", response_model=CircleView)
def archive(circle_id: str, user: User):
    with connect() as db:
        circle, _me = circle_access(db, circle_id, user.id, lock=True)
        owner_only(circle, user.id)
        if db.execute(
            "SELECT 1 FROM outings WHERE circle_id=%s AND status='open'", (circle_id,)
        ).fetchone():
            raise HTTPException(409, "أغلق الطلعات المفتوحة قبل أرشفة القروب.")
        db.execute("UPDATE circles SET archived=TRUE WHERE id=%s", (circle_id,))
        return circle_view(db, *circle_access(db, circle_id, user.id))
