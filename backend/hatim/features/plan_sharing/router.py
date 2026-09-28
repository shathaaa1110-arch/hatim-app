import logging
import os
import secrets
from urllib.parse import urlsplit

from fastapi import APIRouter, Header, HTTPException, Request, Response
from psycopg.types.json import Jsonb
from reportlab.platypus import LayoutError

from hatim.core.db import connect
from hatim.core.models import Acknowledged, ErrorResponse

from .models import (
    InvitationChange,
    InvitationEditor,
    InvitationRevoke,
    PublicInvitation,
    SourceKind,
)
from .pdf import render_pdf
from .service import COLUMNS, authorize, editor, invitation_row, public

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
        return public(db, code)


@router.get(
    "/api/shared-plans/{code}/pdf",
    response_class=Response,
    responses={
        200: {"content": {"application/pdf": {"schema": {"type": "string", "format": "binary"}}}},
        404: {"model": ErrorResponse},
        503: {"model": ErrorResponse},
    },
)
def invitation_pdf(code: str, request: Request):
    # Read the same allowlist as the public page; close the transaction before rendering.
    with connect(read_only=True) as db:
        invitation = public(db, code)
    origin = (os.getenv("HATIM_PUBLIC_ORIGIN") or str(request.base_url)).rstrip("/")
    parsed = urlsplit(origin)
    if (
        parsed.scheme not in ("http", "https")
        or not parsed.netloc
        or parsed.query
        or parsed.fragment
        or parsed.path
        or parsed.username
        or parsed.password
    ):
        raise HTTPException(503, "تعذّر تجهيز الملف. راجع إعداد عنوان حاتم العام.")
    try:
        content = render_pdf(invitation, f"{origin}/s/{code}")
    except (ValueError, OSError, LayoutError) as error:
        # Avoid logging capability URLs or invitation text.
        logging.getLogger(__name__).error("PDF rendering failed: %s", type(error).__name__)
        raise HTTPException(503, "تعذّر تجهيز الملف. حاول مرة ثانية بعد شوي.") from None
    return Response(
        content,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="hatim-plan.pdf"'},
    )
