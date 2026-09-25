import secrets
from datetime import UTC, datetime

from fastapi import APIRouter, Header, HTTPException
from psycopg.types.json import Jsonb

from hatim.core.db import connect
from hatim.core.models import Acknowledged

from .models import (
    InvitationChange,
    InvitationDetails,
    InvitationEditor,
    InvitationRevoke,
    PublicInvitation,
    SourceKind,
)
from .service import COLUMNS, authorize, editor, invitation_row, project

router = APIRouter(tags=["Plan invitations"])


@router.get("/api/plan-invitations/{kind}/{source_id}", response_model=InvitationEditor)
def get_editor(kind: SourceKind, source_id: str, authorization: str | None = Header(default=None)):
    with connect(read_only=True) as db:
        authorize(db, kind, source_id, authorization)
        return editor(db, kind, source_id)


@router.put("/api/plan-invitations/{kind}/{source_id}", response_model=InvitationEditor)
def save(
    kind: SourceKind,
    source_id: str,
    body: InvitationChange,
    authorization: str | None = Header(default=None),
):
    with connect() as db:
        authorize(db, kind, source_id, authorization, lock=True)
        row = invitation_row(db, kind, source_id)
        if body.expected_revision != (row["revision"] if row else None):
            raise HTTPException(409, "تغيّرت الدعوة من جهاز آخر. أعد فتحها لمراجعة آخر نسخة.")
        if row:
            db.execute(
                "UPDATE plan_invitations SET details=%s,revision=nextval('plan_invitation_revision'),updated_at=CURRENT_TIMESTAMP WHERE code=%s",
                (Jsonb(body.details.model_dump()), row["code"]),
            )
        else:
            db.execute(
                f"INSERT INTO plan_invitations(code,{COLUMNS[kind]},details) VALUES(%s,%s,%s)",
                (secrets.token_urlsafe(24), source_id, Jsonb(body.details.model_dump())),
            )
        return editor(db, kind, source_id)


@router.delete("/api/plan-invitations/{kind}/{source_id}", response_model=Acknowledged)
def revoke(
    kind: SourceKind,
    source_id: str,
    body: InvitationRevoke,
    authorization: str | None = Header(default=None),
):
    with connect() as db:
        authorize(db, kind, source_id, authorization, lock=True)
        row = invitation_row(db, kind, source_id)
        if row and row["revision"] != body.expected_revision:
            raise HTTPException(409, "تغيّرت الدعوة. أعد فتحها قبل إلغاء الرابط.")
        if row:
            db.execute("DELETE FROM plan_invitations WHERE code=%s", (row["code"],))
    return Acknowledged()


@router.get("/api/shared-plans/{code}", response_model=PublicInvitation)
def public_invitation(code: str):
    with connect(read_only=True) as db:
        row = db.execute("SELECT * FROM plan_invitations WHERE code=%s", (code,)).fetchone()
        if row is None:
            raise HTTPException(404, "الدعوة غير متاحة أو أُلغي رابطها. اطلب رابطًا جديدًا من المنظّم.")
        kind = "plan" if row["plan_id"] else "outing"
        try:
            _, plan = project(db, kind, row[COLUMNS[kind]])
        except HTTPException as error:
            if error.status_code in (404, 409):
                raise HTTPException(404, "هذه الدعوة لم تعد متاحة. اطلب رابطًا جديدًا.") from None
            raise
        return PublicInvitation(
            details=InvitationDetails.model_validate(row["details"]),
            plan=plan,
            created_at=row["created_at"].isoformat(),
            read_at=datetime.now(UTC).isoformat(),
        )
