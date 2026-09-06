import os
import secrets
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .catalog import CATALOG, CATALOG_IDS
from .models import (
    CreateGroup,
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
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv(
        "HATIM_CORS_ORIGINS", "http://localhost:8081,http://localhost:19006"
    ).split(","),
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.middleware("http")
async def response_policy(request, call_next):
    # Bound untrusted invitation form requests; no cookies or credentials in URLs.
    length = request.headers.get("content-length", "0")
    if not length.isdigit() or int(length) > 16384:
        from starlette.responses import JSONResponse

        return JSONResponse({"detail": "Request too large"}, status_code=413)
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer"
    if request.url.path.startswith("/api"):
        response.headers["Cache-Control"] = "no-store"
    return response


def require_owner(db, group_id: str, authorization: str | None):
    token = authorization.removeprefix("Bearer ") if authorization else ""
    row = db.execute(
        "SELECT * FROM groups WHERE id=? AND owner_hash=?", (group_id, digest(token))
    ).fetchone()
    if row is None:
        raise HTTPException(404, "المجموعة غير متاحة أو الرابط غير صالح.")
    return row


def require_invite(db, code: str):
    row = db.execute("SELECT * FROM groups WHERE invite_code=?", (code,)).fetchone()
    if row is None:
        raise HTTPException(404, "دعوة غير صالحة. اطلب رابطًا جديدًا من المنظّم.")
    return row


def member_model(row) -> Member:
    return Member(
        id=row["id"],
        preferences=Preferences.model_validate_json(row["preferences"]),
        organizer=bool(row["organizer"]),
    )


def group_model(db, row) -> GroupView:
    members = [
        member_model(m)
        for m in db.execute(
            "SELECT * FROM members WHERE group_id=? ORDER BY created_at, rowid", (row["id"],)
        )
    ]
    settings = Settings.model_validate_json(row["settings"])
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
    return {"status": "ok", "version": "1.0.0", "catalog_mode": "fictional-demo"}


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
            "INSERT INTO groups(id,title,invite_code,owner_hash,settings) VALUES(?,?,?,?,?)",
            (group_id, body.title, code, digest(owner_token), Settings().model_dump_json()),
        )
        db.execute(
            "INSERT INTO members(id,group_id,token_hash,preferences,organizer) VALUES(?,?,?,?,1)",
            (
                secrets.token_urlsafe(12),
                group_id,
                digest(secrets.token_urlsafe(32)),
                body.preferences.model_dump_json(),
            ),
        )
        row = require_owner(db, group_id, f"Bearer {owner_token}")
        return GroupCreated(organizer_token=owner_token, group=group_model(db, row))


@app.get("/api/groups/{group_id}", response_model=GroupView)
def get_group(group_id: str, authorization: str | None = Header(default=None)):
    with connect() as db:
        return group_model(db, require_owner(db, group_id, authorization))


@app.put("/api/groups/{group_id}/settings", response_model=GroupView)
def update_settings(
    group_id: str, body: Settings, authorization: str | None = Header(default=None)
):
    ids = set(body.pocket_ids + body.completed_ids + ([body.anchor_id] if body.anchor_id else []))
    if not ids <= CATALOG_IDS:
        raise HTTPException(422, "تجربة غير موجودة.")
    with connect() as db:
        db.execute("BEGIN IMMEDIATE")
        require_owner(db, group_id, authorization)
        db.execute("UPDATE groups SET settings=? WHERE id=?", (body.model_dump_json(), group_id))
        return group_model(db, require_owner(db, group_id, authorization))


@app.put("/api/groups/{group_id}/profile", response_model=GroupView)
def update_organizer(
    group_id: str, body: Preferences, authorization: str | None = Header(default=None)
):
    with connect() as db:
        row = require_owner(db, group_id, authorization)
        db.execute(
            "UPDATE members SET preferences=? WHERE group_id=? AND organizer=1",
            (body.model_dump_json(), group_id),
        )
        return group_model(db, row)


@app.delete("/api/groups/{group_id}/members/{member_id}", response_model=GroupView)
def remove_member(group_id: str, member_id: str, authorization: str | None = Header(default=None)):
    with connect() as db:
        row = require_owner(db, group_id, authorization)
        cursor = db.execute(
            "DELETE FROM members WHERE id=? AND group_id=? AND organizer=0", (member_id, group_id)
        )
        if cursor.rowcount != 1:
            raise HTTPException(404, "العضو غير موجود أو هو منظّم المجموعة.")
        return group_model(db, row)


@app.get("/api/invites/{code}", response_model=InviteView)
def invite(code: str):
    with connect() as db:
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
        db.execute("BEGIN IMMEDIATE")
        group = require_invite(db, code)
        count = db.execute(
            "SELECT COUNT(*) FROM members WHERE group_id=?", (group["id"],)
        ).fetchone()[0]
        if count >= 12:
            raise HTTPException(409, "المجموعة ممتلئة (١٢ شخصًا كحد أقصى).")
        member_id, token = secrets.token_urlsafe(12), secrets.token_urlsafe(32)
        db.execute(
            "INSERT INTO members(id,group_id,token_hash,preferences) VALUES(?,?,?,?)",
            (member_id, group["id"], digest(token), body.model_dump_json()),
        )
        return MemberCreated(member_token=token, member=Member(id=member_id, preferences=body))


def require_member(db, code: str, authorization: str | None):
    group = require_invite(db, code)
    token = authorization.removeprefix("Bearer ") if authorization else ""
    member = db.execute(
        "SELECT * FROM members WHERE group_id=? AND token_hash=? AND organizer=0",
        (group["id"], digest(token)),
    ).fetchone()
    if member is None:
        raise HTTPException(404, "تعذّر الوصول لملفك. يمكنك الانضمام من جديد.")
    return member


@app.get("/api/invites/{code}/me", response_model=Member)
def get_my_preferences(code: str, authorization: str | None = Header(default=None)):
    with connect() as db:
        return member_model(require_member(db, code, authorization))


@app.put("/api/invites/{code}/me", response_model=Member)
def update_my_preferences(
    code: str, body: Preferences, authorization: str | None = Header(default=None)
):
    with connect() as db:
        member = require_member(db, code, authorization)
        db.execute(
            "UPDATE members SET preferences=? WHERE id=?", (body.model_dump_json(), member["id"])
        )
        return Member(id=member["id"], preferences=body)


dist = Path(__file__).parents[2] / "dist"
if dist.is_dir():

    @app.get("/join/{code}", include_in_schema=False)
    def join_page(code: str):
        return FileResponse(dist / "index.html", headers={"Cache-Control": "no-store"})

    # Keep missing API routes from falling through to the web application.
    @app.api_route(
        "/api/{path:path}", methods=["GET", "POST", "PUT", "DELETE"], include_in_schema=False
    )
    def missing_api(path: str):
        raise HTTPException(404, "Unknown API route")

    app.mount("/", StaticFiles(directory=dist, html=True), name="web")
