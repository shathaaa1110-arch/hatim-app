import hashlib
import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path


def digest(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def database_path() -> Path:
    return Path(os.environ.get("HATIM_DB", Path(__file__).parents[1] / "data" / "hatim.sqlite3"))


@contextmanager
def connect():
    db = sqlite3.connect(database_path(), timeout=10)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys=ON")
    try:
        with db:
            yield db
    finally:
        db.close()


def initialize():
    database_path().parent.mkdir(parents=True, exist_ok=True)
    with connect() as db:
        db.execute("PRAGMA journal_mode=WAL")
        db.executescript("""
            CREATE TABLE IF NOT EXISTS groups (
                id TEXT PRIMARY KEY, title TEXT NOT NULL,
                invite_code TEXT UNIQUE NOT NULL, owner_hash TEXT UNIQUE NOT NULL,
                settings TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS members (
                id TEXT PRIMARY KEY, group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
                token_hash TEXT UNIQUE NOT NULL, preferences TEXT NOT NULL,
                organizer INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS members_group ON members(group_id);
            PRAGMA user_version=1;
        """)
