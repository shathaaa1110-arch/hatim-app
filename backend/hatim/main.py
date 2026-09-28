import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from psycopg import Error as DatabaseError

from .core.db import connect, initialize
from .core.middleware import ResponsePolicyMiddleware
from .core.models import ErrorResponse
from .features import accounts, experiences, groups, plan_sharing, planning, quick_decision


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
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["Authorization", "Content-Type"],
)
app.add_middleware(ResponsePolicyMiddleware)
for router in (
    accounts.router,
    experiences.router,
    groups.router,
    planning.router,
    quick_decision.router,
    plan_sharing.router,
):
    app.include_router(router)


@app.exception_handler(RequestValidationError)
async def invalid_request(request, error):
    return JSONResponse({"detail": "راجع البيانات وحاول مرة ثانية."}, status_code=422)


@app.exception_handler(DatabaseError)
async def database_unavailable(request, error):
    logging.getLogger(__name__).error("Database request failed: %s", type(error).__name__)
    return JSONResponse({"detail": "حاتم غير متاح مؤقتًا. حاول مرة ثانية بعد شوي."}, status_code=503)


@app.get("/api/health")
def health():
    with connect(read_only=True) as db:
        db.execute("SELECT 1")
    return {
        "status": "ok",
        "version": "1.0.0",
        "api_generation": 2,
        "catalog_mode": "fictional-demo",
        "backend": "python",
        "database": "postgresql",
    }


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

    @app.get("/s/{code}", include_in_schema=False)
    def shared_plan_page(code: str):
        return FileResponse(dist / "index.html", headers={"Cache-Control": "no-store"})

    app.mount("/", StaticFiles(directory=dist, html=True), name="web")
