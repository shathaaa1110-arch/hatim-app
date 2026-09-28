"""PostgreSQL persistence. Each operation owns one connection and transaction."""

import hashlib
import os
from contextlib import contextmanager
from pathlib import Path

import psycopg
from psycopg.rows import dict_row


def digest(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def database_url() -> str:
    value = os.environ.get("DATABASE_URL")
    if not value:
        raise RuntimeError("DATABASE_URL is required. Run npm run db:up or configure PostgreSQL.")
    return value


@contextmanager
def connect(*, read_only: bool = False):
    with psycopg.connect(database_url(), row_factory=dict_row, connect_timeout=5) as db:
        # Read responses use one snapshot. Writers lock their group before any changes.
        if read_only:
            db.execute("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY")
        db.execute("SET LOCAL statement_timeout = '10s'")
        db.execute("SET LOCAL lock_timeout = '10s'")
        yield db


def initialize():
    migrations = Path(__file__).parents[2] / "migrations"
    with connect() as db:
        # Serialize startup across workers, including first-time schema creation.
        db.execute("SELECT pg_advisory_xact_lock(734821910)")
        db.execute("""
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version TEXT PRIMARY KEY,
                checksum TEXT NOT NULL,
                applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """)
        for file in sorted(migrations.glob("*.sql")):
            source = file.read_text(encoding="utf-8")
            checksum = digest(source)
            applied = db.execute(
                "SELECT checksum FROM schema_migrations WHERE version=%s", (file.name,)
            ).fetchone()
            if applied:
                if applied["checksum"] != checksum:
                    raise RuntimeError(f"Applied migration changed: {file.name}")
                continue
            db.execute(source)
            db.execute(
                "INSERT INTO schema_migrations(version,checksum) VALUES(%s,%s)",
                (file.name, checksum),
            )
