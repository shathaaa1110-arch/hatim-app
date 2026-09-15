import logging
import os
import secrets
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Header, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from psycopg import Error as DatabaseError
from psycopg.types.json import Jsonb

from .catalog import CATALOG, CATALOG_IDS
from .middleware import ResponsePolicyMiddleware
from .models import (
    CreateGroup,
    ErrorResponse,
    Experience,
    GroupCreated,
    GroupView,
    InviteView,
    Member,
    MemberCreated,
    Preferences,
    Settings,
)
from .planner import build_plan
from .store import connect, digest, initialize


@asynccontextmanager
async def lifespan(app: FastAPI):
    initialize()
    yield


app = FastAPI(
    title="Hatim API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
    redoc_url=None,
    responses={422: {"model": ErrorResponse, "description": "Invalid request"}},
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip()
        for origin in os.getenv(
            "HATIM_CORS_ORIGINS", "http://localhost:8081,http://localhost:19006"
        ).split(",")
        if origin.strip()
    ],
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)
app.add_middleware(ResponsePolicyMiddleware)


@app.exception_handler(RequestValidationError)
async def invalid_request(request, error):
    return JSONResponse({"detail": "راجع البيانات وحاول مرة ثانية."}, status_code=422)


@app.exception_handler(DatabaseError)
async def database_unavailable(request, error):
    logging.getLogger(__name__).error("Database request failed: %s", type(error).__name__)
    return JSONResponse({"detail": "حاتم غير متاح مؤقتًا. حاول مرة ثانية بعد شوي."}, status_code=503)


def bearer(authorization: str | None) -> str:
    return authorization[7:] if authorization and authorization.startswith("Bearer ") else ""


def require_owner(db, group_id: str, authorization: str | None, *, lock=False):
    row = db.execute(
        "SELECT * FROM groups WHERE id=%s AND owner_hash=%s" + (" FOR UPDATE" if lock else ""),
        (group_id, digest(bearer(authorization))),
    ).fetchone()
    if row is None:
        raise HTTPException(404, "المجموعة غير متاحة أو الرابط غير صالح.")
    return row


def require_invite(db, code: str, *, lock=False):
    row = db.execute(
        "SELECT * FROM groups WHERE invite_code=%s" + (" FOR UPDATE" if lock else ""), (code,)
    ).fetchone()
    if row is None:
        raise HTTPException(404, "دعوة غير صالحة. اطلب رابطًا جديدًا من المنظّم.")
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
        invite_code=row["invite_code"],
        settings=settings,
        members=members,
        plan=build_plan(CATALOG, members, settings),
    )


@app.get("/api/health")
def health():
    with connect(read_only=True) as db:
        db.execute("SELECT 1")
    return {
        "status": "ok",
        "version": "1.0.0",
        "catalog_mode": "fictional-demo",
        "backend": "python",
        "database": "postgresql",
    }


@app.get("/api/experiences", response_model=list[Experience])
def experiences():
    return CATALOG


@app.post("/api/groups", response_model=GroupCreated, status_code=201)
def create_group(body: CreateGroup):
    group_id, owner_token, code = (
        secrets.token_urlsafe(12),
        secrets.token_urlsafe(32),
        secrets.token_urlsafe(18),
    )
    with connect() as db:
        db.execute(
            "INSERT INTO groups(id,title,invite_code,owner_hash,settings) VALUES(%s,%s,%s,%s,%s)",
            (group_id, body.title, code, digest(owner_token), Jsonb(Settings().model_dump())),
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
        row = require_owner(db, group_id, f"Bearer {owner_token}")
        return GroupCreated(organizer_token=owner_token, group=group_model(db, row))


@app.get("/api/groups/{group_id}", response_model=GroupView)
def get_group(group_id: str, authorization: str | None = Header(default=None)):
    with connect(read_only=True) as db:
        return group_model(db, require_owner(db, group_id, authorization))


@app.put("/api/groups/{group_id}/settings", response_model=GroupView)
def update_settings(
    group_id: str, body: Settings, authorization: str | None = Header(default=None)
):
    ids = set(
        body.pocket_ids
        + body.completed_ids
        + ([body.anchor_id] if body.anchor_id is not None else [])
    )
    if not ids <= CATALOG_IDS:
        raise HTTPException(422, "تجربة غير موجودة.")
    with connect() as db:
        require_owner(db, group_id, authorization, lock=True)
        db.execute(
            "UPDATE groups SET settings=%s WHERE id=%s", (Jsonb(body.model_dump()), group_id)
        )
        return group_model(db, require_owner(db, group_id, authorization))


@app.put("/api/groups/{group_id}/profile", response_model=GroupView)
def update_organizer(
    group_id: str, body: Preferences, authorization: str | None = Header(default=None)
):
    with connect() as db:
        row = require_owner(db, group_id, authorization, lock=True)
        db.execute(
            "UPDATE members SET preferences=%s WHERE group_id=%s AND organizer=TRUE",
            (Jsonb(body.model_dump()), group_id),
        )
        return group_model(db, row)


@app.delete("/api/groups/{group_id}/members/{member_id}", response_model=GroupView)
def remove_member(group_id: str, member_id: str, authorization: str | None = Header(default=None)):
    with connect() as db:
        row = require_owner(db, group_id, authorization, lock=True)
        cursor = db.execute(
            "DELETE FROM members WHERE id=%s AND group_id=%s AND organizer=FALSE",
            (member_id, group_id),
        )
        if cursor.rowcount != 1:
            raise HTTPException(404, "العضو غير موجود أو هو منظّم المجموعة.")
        return group_model(db, row)


@app.get("/api/invites/{code}", response_model=InviteView)
def invite(code: str):
    with connect(read_only=True) as db:
        group = group_model(db, require_invite(db, code))
        # Invitations never expose other members' private constraints or workarounds.
        selected = [
            d.model_copy(
                update={
                    "adaptations": [],
                    "reason": next(e.why for e in CATALOG if e.id == d.experience_id),
                }
            )
            for d in group.plan.selected
        ]
        return InviteView(
            title=group.title,
            member_names=[m.preferences.name for m in group.members],
            slots=group.settings.slots,
            selected=selected,
            anchor_issue="المنظّم يراجع توافق الركيزة مع المجموعة. لم نستبدلها بصمت."
            if group.plan.anchor_issue
            else None,
            consumed=group.plan.consumed,
        )


@app.post("/api/invites/{code}/members", response_model=MemberCreated, status_code=201)
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


def require_member(db, code: str, authorization: str | None, *, lock=False):
    group = require_invite(db, code, lock=lock)
    member = db.execute(
        "SELECT * FROM members WHERE group_id=%s AND token_hash=%s AND organizer=FALSE",
        (group["id"], digest(bearer(authorization))),
    ).fetchone()
    if member is None:
        raise HTTPException(404, "تعذّر الوصول لملفك. يمكنك الانضمام من جديد.")
    return member


@app.get("/api/invites/{code}/me", response_model=Member)
def get_my_preferences(code: str, authorization: str | None = Header(default=None)):
    with connect(read_only=True) as db:
        return member_model(require_member(db, code, authorization))


@app.put("/api/invites/{code}/me", response_model=Member)
def update_my_preferences(
    code: str, body: Preferences, authorization: str | None = Header(default=None)
):
    with connect() as db:
        member = require_member(db, code, authorization, lock=True)
        db.execute(
            "UPDATE members SET preferences=%s WHERE id=%s",
            (Jsonb(body.model_dump()), member["id"]),
        )
        return Member(id=member["id"], preferences=body)


@app.api_route(
    "/api/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"], include_in_schema=False
)
def missing_api(path: str):
    raise HTTPException(404, "Unknown API route")


dist = Path(os.environ.get("HATIM_WEB_ROOT", Path(__file__).parents[2] / "dist"))
if dist.is_dir():

    @app.get("/join/{code}", include_in_schema=False)
    def join_page(code: str):
        return FileResponse(dist / "index.html", headers={"Cache-Control": "no-store"})

    app.mount("/", StaticFiles(directory=dist, html=True), name="web")
