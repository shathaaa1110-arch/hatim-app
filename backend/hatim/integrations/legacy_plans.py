"""The only bridge allowed to access both direct-plan and persistent-group tables.

Callers own the transaction; preserve the original direct-plan lock before circle writes.
"""

import secrets

from fastapi import HTTPException
from psycopg.types.json import Jsonb

from hatim.core.db import digest


def reject_upgraded_write(db, group_id):
    if db.execute("SELECT 1 FROM circles WHERE legacy_group_id=%s", (group_id,)).fetchone():
        raise HTTPException(409, "تم نقل القروب إلى اللمّات. افتح النسخة الجديدة وسجّل الدخول.")


def claim_legacy(db, group_id: str, owner_token: str, account_id: str):
    old = db.execute(
        "SELECT * FROM groups WHERE id=%s AND owner_hash=%s "
        "AND owner_account_id IS NULL FOR UPDATE",
        (group_id, digest(owner_token)),
    ).fetchone()
    if not old:
        raise HTTPException(404, "تعذّر إثبات ملكية القروب السابق.")
    existing = db.execute(
        "SELECT id FROM circles WHERE legacy_group_id=%s", (old["id"],)
    ).fetchone()
    if existing:
        return existing["id"]
    circle_id = secrets.token_urlsafe(12)
    db.execute(
        "INSERT INTO circles(id,title,owner_id,invite_code,legacy_group_id) VALUES(%s,%s,%s,%s,%s)",
        (circle_id, old["title"], account_id, old["invite_code"], old["id"]),
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
                account_id if member["organizer"] else None,
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
    return circle_id
