import secrets

from fastapi import HTTPException
from psycopg.types.json import Jsonb

from hatim.core.db import connect, digest
from hatim.core.models import Acknowledged, TitleChange
from hatim.domain.models import Member, Preferences, Settings
from hatim.domain.planner import build_plan, context_match
from hatim.features import accounts
from hatim.features.experiences import catalog
from hatim.integrations.legacy_plans import reject_upgraded_write

from .models import (
    CreateGroup,
    GroupCreated,
    GroupView,
    InviteView,
    MemberCreated,
    PlanSettingsChange,
    PlanSummary,
    SaveToAccount,
)


def bearer(authorization: str | None) -> str:
    return authorization[7:] if authorization and authorization.startswith("Bearer ") else ""


def require_owner(db, group_id: str, authorization: str | None, *, lock=False):
    row = db.execute(
        "SELECT * FROM groups WHERE id=%s" + (" FOR UPDATE" if lock else ""), (group_id,)
    ).fetchone()
    token_hash = digest(bearer(authorization))
    allowed = False
    if row and row["owner_account_id"]:
        allowed = accounts.session_owns(db, row["owner_account_id"], token_hash)
    elif row:
        allowed = secrets.compare_digest(row["owner_hash"], token_hash)
    if not allowed:
        raise HTTPException(404, "الخطة غير متاحة لك أو انتهت صلاحية الوصول.")
    if lock:
        reject_upgraded_write(db, group_id)
    return row


def require_invite(db, code: str, *, lock=False):
    row = db.execute(
        "SELECT * FROM groups WHERE invite_code=%s" + (" FOR UPDATE" if lock else ""), (code,)
    ).fetchone()
    if row is None:
        raise HTTPException(404, "دعوة غير صالحة. اطلب رابطًا جديدًا من المنظّم.")
    if lock:
        reject_upgraded_write(db, row["id"])
    return row


def member_model(row) -> Member:
    return Member(
        id=row["id"],
        preferences=Preferences.model_validate(row["preferences"]),
        organizer=bool(row["organizer"]),
    )


def group_model(db, row) -> GroupView:
    members = [
        member_model(m)
        for m in db.execute(
            "SELECT * FROM members WHERE group_id=%s ORDER BY created_at, sequence", (row["id"],)
        )
    ]
    settings = Settings.model_validate(row["settings"])
    return GroupView(
        id=row["id"],
        title=row["title"],
        owner_account_id=row["owner_account_id"],
        invite_code=row["invite_code"],
        settings=settings,
        members=members,
        plan=build_plan(catalog(db), members, settings),
    )


def validate_settings(db, body: Settings):
    ids = set(
        body.pocket_ids
        + body.completed_ids
        + ([body.anchor_id] if body.anchor_id is not None else [])
    )
    if not ids <= {e.id for e in catalog(db)}:
        raise HTTPException(422, "تجربة غير موجودة.")


def require_member(db, code: str, authorization: str | None, *, lock=False):
    group = require_invite(db, code, lock=lock)
    member = db.execute(
        "SELECT * FROM members WHERE group_id=%s AND token_hash=%s AND organizer=FALSE",
        (group["id"], digest(bearer(authorization))),
    ).fetchone()
    if member is None:
        raise HTTPException(404, "تعذّر الوصول لملفك. يمكنك الانضمام من جديد.")
    return member


def create_group(body: CreateGroup, authorization: str | None = None):
    # Supplying an invalid account session must never create an anonymous plan.
    user = accounts.current_account(bearer(authorization)) if authorization else None
    group_id, owner_token, code = (
        secrets.token_urlsafe(12),
        secrets.token_urlsafe(32),
        secrets.token_urlsafe(18),
    )
    with connect() as db:
        validate_settings(db, body.settings)
        db.execute(
            "INSERT INTO groups(id,title,invite_code,owner_hash,settings,owner_account_id) "
            "VALUES(%s,%s,%s,%s,%s,%s)",
            (
                group_id,
                body.title,
                code,
                digest(owner_token),
                Jsonb(body.settings.model_dump()),
                user.id if user else None,
            ),
        )
        db.execute(
            "INSERT INTO members(id,group_id,token_hash,preferences,organizer) "
            "VALUES(%s,%s,%s,%s,TRUE)",
            (
                secrets.token_urlsafe(12),
                group_id,
                digest(secrets.token_urlsafe(32)),
                Jsonb(body.preferences.model_dump()),
            ),
        )
        row = require_owner(db, group_id, authorization if user else f"Bearer {owner_token}")
        return GroupCreated(
            organizer_token=None if user else owner_token, group=group_model(db, row)
        )


def account_plans(user: accounts.Account):
    with connect(read_only=True) as db:
        return [
            PlanSummary(
                id=r["id"],
                title=r["title"],
                slots=r["settings"]["slots"],
                consumed=len(r["settings"].get("completed_ids", [])),
            )
            for r in db.execute(
                "SELECT id,title,settings FROM groups WHERE owner_account_id=%s "
                "ORDER BY created_at DESC,id",
                (user.id,),
            )
        ]


def save_to_account(group_id: str, body: SaveToAccount, user: accounts.Account):
    with connect() as db:
        row = db.execute("SELECT * FROM groups WHERE id=%s FOR UPDATE", (group_id,)).fetchone()
        if row and row["owner_account_id"] == user.id:
            return group_model(db, row)  # Safe retry after a lost response.
        if (
            not row
            or row["owner_account_id"]
            or not secrets.compare_digest(
                row["owner_hash"], digest(body.owner_token.get_secret_value())
            )
        ):
            raise HTTPException(404, "تعذّر إثبات ملكيتك للخطة.")
        reject_upgraded_write(db, group_id)
        row = db.execute(
            "UPDATE groups SET owner_account_id=%s,owner_hash=%s WHERE id=%s RETURNING *",
            (user.id, digest(secrets.token_urlsafe(32)), group_id),
        ).fetchone()
        return group_model(db, row)


def rename_plan(group_id: str, body: TitleChange, authorization: str | None = None):
    with connect() as db:
        require_owner(db, group_id, authorization, lock=True)
        row = db.execute(
            "UPDATE groups SET title=%s WHERE id=%s RETURNING *", (body.title, group_id)
        ).fetchone()
        return group_model(db, row)


def delete_plan(group_id: str, authorization: str | None = None):
    with connect() as db:
        require_owner(db, group_id, authorization, lock=True)
        db.execute("DELETE FROM groups WHERE id=%s", (group_id,))
    return Acknowledged()


def get_group(group_id: str, authorization: str | None = None):
    with connect(read_only=True) as db:
        return group_model(db, require_owner(db, group_id, authorization))


def update_settings(group_id: str, body: PlanSettingsChange, authorization: str | None = None):
    with connect() as db:
        row = require_owner(db, group_id, authorization, lock=True)
        if body.expected is not None and body.expected != Settings.model_validate(row["settings"]):
            raise HTTPException(409, "تغيّرت الخطة من جهاز آخر. حدّثها وراجع التغيير قبل الحفظ.")
        settings = Settings.model_validate(body.model_dump(exclude={"expected"}))
        if "context" not in body.model_fields_set:
            # Older native builds must not erase the new outing preferences.
            settings.context = Settings.model_validate(row["settings"]).context
        validate_settings(db, settings)
        db.execute(
            "UPDATE groups SET settings=%s WHERE id=%s", (Jsonb(settings.model_dump()), group_id)
        )
        return group_model(db, require_owner(db, group_id, authorization))


def update_organizer(group_id: str, body: Preferences, authorization: str | None = None):
    with connect() as db:
        row = require_owner(db, group_id, authorization, lock=True)
        db.execute(
            "UPDATE members SET preferences=%s WHERE group_id=%s AND organizer=TRUE",
            (Jsonb(body.model_dump()), group_id),
        )
        return group_model(db, row)


def remove_member(group_id: str, member_id: str, authorization: str | None = None):
    with connect() as db:
        row = require_owner(db, group_id, authorization, lock=True)
        cursor = db.execute(
            "DELETE FROM members WHERE id=%s AND group_id=%s AND organizer=FALSE",
            (member_id, group_id),
        )
        if cursor.rowcount != 1:
            raise HTTPException(404, "العضو غير موجود أو هو منظّم المجموعة.")
        return group_model(db, row)


def invite(code: str):
    with connect(read_only=True) as db:
        group = group_model(db, require_invite(db, code))
        entries = catalog(db)
        # Invitations never expose other members' private constraints or workarounds.
        selected = [
            d.model_copy(
                update={
                    "adaptations": [],
                    "reason": next(
                        e.why + context_match(e, group.settings.context)[1]
                        for e in entries
                        if e.id == d.experience_id
                    ),
                }
            )
            for d in group.plan.selected
        ]
        return InviteView(
            context=group.settings.context,
            title=group.title,
            member_names=[m.preferences.name for m in group.members],
            slots=group.settings.slots,
            selected=selected,
            anchor_issue="المنظّم يراجع توافق الركيزة مع المجموعة. لم نستبدلها بصمت."
            if group.plan.anchor_issue
            else None,
            consumed=group.plan.consumed,
        )


def join_group(code: str, body: Preferences):
    with connect() as db:
        group = require_invite(db, code, lock=True)
        count = db.execute(
            "SELECT COUNT(*) AS count FROM members WHERE group_id=%s", (group["id"],)
        ).fetchone()["count"]
        if count >= 12:
            raise HTTPException(409, "المجموعة ممتلئة (١٢ شخصًا كحد أقصى).")
        member_id, token = secrets.token_urlsafe(12), secrets.token_urlsafe(32)
        db.execute(
            "INSERT INTO members(id,group_id,token_hash,preferences) VALUES(%s,%s,%s,%s)",
            (member_id, group["id"], digest(token), Jsonb(body.model_dump())),
        )
        return MemberCreated(member_token=token, member=Member(id=member_id, preferences=body))


def get_my_preferences(code: str, authorization: str | None = None):
    with connect(read_only=True) as db:
        return member_model(require_member(db, code, authorization))


def update_my_preferences(code: str, body: Preferences, authorization: str | None = None):
    with connect() as db:
        member = require_member(db, code, authorization, lock=True)
        db.execute(
            "UPDATE members SET preferences=%s WHERE id=%s",
            (Jsonb(body.model_dump()), member["id"]),
        )
        return Member(id=member["id"], preferences=body)
