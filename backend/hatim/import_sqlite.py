"""One-time, non-destructive import of a legacy SQLite store into empty PostgreSQL."""

import argparse
import sqlite3
from contextlib import closing
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from psycopg.types.json import Jsonb

from .catalog import CATALOG_IDS
from .models import Preferences, Settings
from .store import connect, initialize


def import_database(source: Path) -> tuple[int, int, Path]:
    source = source.resolve(strict=True)
    backup_dir = source.parent / "backups"
    backup_dir.mkdir(mode=0o700, exist_ok=True)
    backup = (
        backup_dir / f"before-postgres-{datetime.now(UTC):%Y%m%dT%H%M%SZ}-{uuid4().hex}.sqlite3"
    )
    backup.touch(mode=0o600, exist_ok=False)
    # SQLite's backup API includes committed WAL data without changing the source.
    with (
        closing(sqlite3.connect(f"{source.as_uri()}?mode=ro", uri=True)) as old,
        closing(sqlite3.connect(backup)) as snapshot,
    ):
        old.backup(snapshot)
    with closing(sqlite3.connect(f"{backup.as_uri()}?mode=ro", uri=True)) as snapshot:
        snapshot.row_factory = sqlite3.Row
        groups = snapshot.execute("SELECT * FROM groups ORDER BY created_at,rowid").fetchall()
        members = snapshot.execute("SELECT * FROM members ORDER BY created_at,rowid").fetchall()

    initialize()
    with connect() as db:
        # Refuse merging/overwriting a live destination, and serialize concurrent imports.
        db.execute("LOCK TABLE groups, members IN ACCESS EXCLUSIVE MODE")
        if db.execute(
            "SELECT EXISTS(SELECT 1 FROM groups) OR EXISTS(SELECT 1 FROM members) AS used"
        ).fetchone()["used"]:
            raise RuntimeError(
                "Destination is not empty; import refused. No PostgreSQL rows changed."
            )
        for row in groups:
            settings = Settings.model_validate_json(row["settings"])
            ids = set(settings.pocket_ids + settings.completed_ids)
            if settings.anchor_id is not None:
                ids.add(settings.anchor_id)
            if not ids <= CATALOG_IDS:
                raise ValueError("Legacy settings contain unknown experience IDs.")
            db.execute(
                "INSERT INTO groups(id,title,invite_code,owner_hash,settings,created_at) "
                "VALUES(%s,%s,%s,%s,%s,%s)",
                (
                    row["id"],
                    row["title"],
                    row["invite_code"],
                    row["owner_hash"],
                    Jsonb(settings.model_dump()),
                    timestamp(row["created_at"]),
                ),
            )
        for row in members:
            preferences = Preferences.model_validate_json(row["preferences"])
            db.execute(
                "INSERT INTO members(id,group_id,token_hash,preferences,organizer,created_at) "
                "VALUES(%s,%s,%s,%s,%s,%s)",
                (
                    row["id"],
                    row["group_id"],
                    row["token_hash"],
                    Jsonb(preferences.model_dump()),
                    bool(row["organizer"]),
                    timestamp(row["created_at"]),
                ),
            )
        # Verify the complete persisted content before committing the import.
        actual_groups = db.execute("SELECT * FROM groups").fetchall()
        actual_members = db.execute("SELECT * FROM members ORDER BY created_at,sequence").fetchall()
        expected_groups = {row["id"]: dict(row) for row in groups}
        for row in actual_groups:
            expected = expected_groups[row["id"]]
            expected["settings"] = Settings.model_validate_json(expected["settings"]).model_dump()
            expected["created_at"] = timestamp(expected["created_at"])
            expected["owner_account_id"] = None
            if row != expected:
                raise RuntimeError("Group verification failed; import rolled back.")
        for row, expected_row in zip(actual_members, members, strict=True):
            expected = dict(expected_row)
            expected["preferences"] = Preferences.model_validate_json(
                expected["preferences"]
            ).model_dump()
            expected["organizer"] = bool(expected["organizer"])
            expected["created_at"] = timestamp(expected["created_at"])
            row.pop("sequence")
            if row != expected:
                raise RuntimeError("Member verification failed; import rolled back.")
        if len(actual_groups) != len(groups):
            raise RuntimeError("Group count verification failed; import rolled back.")
    return len(groups), len(members), backup


def timestamp(value: str) -> datetime:
    parsed = datetime.fromisoformat(value)
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=UTC)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help="Legacy SQLite file; stop the old API first.")
    args = parser.parse_args()
    count_groups, count_members, backup = import_database(args.source)
    print(f"Imported and verified {count_groups} groups and {count_members} members.")
    print(f"Original database unchanged. Backup: {backup}")
