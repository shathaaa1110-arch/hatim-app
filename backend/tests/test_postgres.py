import sqlite3
from concurrent.futures import ThreadPoolExecutor
from contextlib import closing
from pathlib import Path

import pytest
from psycopg.types.json import Jsonb
from test_api import create

from hatim.core.db import connect, initialize
from hatim.domain.models import Settings
from hatim.import_sqlite import import_database


def test_health_checks_postgresql_and_handles_connection_failure(client, monkeypatch):
    assert client.get("/api/health").json() == {
        "status": "ok",
        "version": "1.0.0",
        "api_generation": 2,
        "catalog_mode": "fictional-demo",
        "backend": "python",
        "database": "postgresql",
    }
    monkeypatch.setenv("DATABASE_URL", "postgresql://invalid@127.0.0.1:1/invalid")
    response = client.get("/api/health")
    assert response.status_code == 503
    assert "invalid" not in response.text
    assert response.headers["cache-control"] == "no-store"


def test_concurrent_joins_stay_below_capacity(client):
    group, _ = create(client)
    path = f"/api/invites/{group['invite_code']}/members"
    with ThreadPoolExecutor(max_workers=16) as pool:
        statuses = list(
            pool.map(lambda n: client.post(path, json={"name": f"عضو {n}"}).status_code, range(16))
        )
    assert statuses.count(201) == 11
    assert statuses.count(409) == 5
    assert len(client.get(f"/api/invites/{group['invite_code']}").json()["member_names"]) == 12


def test_postgresql_transactions_rollback_and_read_consistent_snapshots(database):
    with pytest.raises(RuntimeError, match="cancel"), connect() as db:
        db.execute(
            "INSERT INTO groups(id,title,invite_code,owner_hash,settings) VALUES(%s,%s,%s,%s,%s)",
            ("rollback", "test", "rollback", "rollback", Jsonb(Settings().model_dump())),
        )
        raise RuntimeError("cancel")
    with connect(read_only=True) as reader:
        assert reader.execute("SELECT COUNT(*) AS n FROM groups").fetchone()["n"] == 0
        with connect() as writer:
            writer.execute(
                "INSERT INTO groups(id,title,invite_code,owner_hash,settings) VALUES(%s,%s,%s,%s,%s)",
                ("committed", "test", "committed", "committed", Jsonb(Settings().model_dump())),
            )
        assert reader.execute("SELECT COUNT(*) AS n FROM groups").fetchone()["n"] == 0
    with connect(read_only=True) as reader:
        assert reader.execute("SELECT COUNT(*) AS n FROM groups").fetchone()["n"] == 1


def test_migrations_are_repeatable_and_detect_edited_history(database):
    initialize()
    initialize()
    with connect() as db:
        assert db.execute("SELECT COUNT(*) AS n FROM schema_migrations").fetchone()["n"] == 4
        db.execute("UPDATE schema_migrations SET checksum='changed'")
    with pytest.raises(RuntimeError, match="Applied migration changed"):
        initialize()


def test_legacy_import_preserves_tokens_preferences_order_and_source(client, tmp_path):
    source = tmp_path / "legacy.sqlite3"
    with closing(sqlite3.connect(source)) as old:
        old.executescript((Path(__file__).parent / "fixtures" / "legacy.sql").read_text())
    before = source.read_bytes()
    groups, members, backup = import_database(source)
    assert (groups, members) == (1, 2)
    assert backup.is_file() and source.read_bytes() == before
    owner = {"Authorization": "Bearer legacy-owner-token"}
    member = {"Authorization": "Bearer legacy-member-token"}
    group = client.get("/api/groups/legacy-group", headers=owner).json()
    assert group["invite_code"] == "legacy-invite"
    assert group["settings"]["completed_ids"] == ["fire"]
    assert group["plan"]["consumed"] == 1
    assert [m["preferences"]["name"] for m in group["members"]] == ["أمل", "بدر"]
    assert client.get("/api/invites/legacy-invite/me", headers=member).json()["preferences"][
        "vegetarian"
    ]
    assert (
        client.put(
            "/api/invites/legacy-invite/me", headers=member, json={"name": "بدر", "budget": 90}
        ).status_code
        == 200
    )
    with pytest.raises(RuntimeError, match="not empty"):
        import_database(source)
    assert (
        client.get("/api/invites/legacy-invite/me", headers=member).json()["preferences"]["budget"]
        == 90
    )


def test_invalid_legacy_import_is_atomic(client, tmp_path):
    source = tmp_path / "bad.sqlite3"
    with closing(sqlite3.connect(source)) as old:
        old.executescript((Path(__file__).parent / "fixtures" / "legacy.sql").read_text())
        old.execute("UPDATE members SET preferences='{}' WHERE organizer=0")
        old.commit()
    with pytest.raises(ValueError):
        import_database(source)
    with connect(read_only=True) as db:
        assert db.execute("SELECT COUNT(*) AS n FROM groups").fetchone()["n"] == 0
        assert db.execute("SELECT COUNT(*) AS n FROM members").fetchone()["n"] == 0


@pytest.mark.parametrize(
    "body",
    [
        {"slots": 1.5},
        {"slots": True},
        {"slots": "1"},
        {"anchor_id": ""},
        {"pocket_ids": [None]},
        {"pocket_ids": None},
        {"pocket_ids": [" "]},
        {"completed_ids": ["sushi", "sushi"]},
        {"pocket_ids": ["sushi"], "completed_ids": ["sushi"]},
        {"slots": 1, "admin": True},
    ],
)
def test_invalid_settings_do_not_change_stored_plan(client, body):
    group, auth = create(client)
    path = f"/api/groups/{group['id']}/settings"
    response = client.put(path, headers=auth, json=body)
    assert response.status_code == 422
    assert isinstance(response.json()["detail"], str)
    assert client.get(f"/api/groups/{group['id']}", headers=auth).json()["settings"]["slots"] == 9


@pytest.mark.parametrize(
    "body",
    [
        {"name": None},
        {"name": 7},
        {},
        {"name": "أمل", "allergies": [0]},
        {"name": "أمل", "role": 3},
        {"name": "أمل", "cuisines": None},
        {"name": "أمل", "budget": "200"},
        {"name": "أمل", "vegetarian": "true"},
        {"name": "أمل", "organizer": True},
    ],
)
def test_invalid_preferences_are_rejected(client, body):
    assert client.post("/api/groups", json={"preferences": body}).status_code == 422


def test_body_size_limit_handles_known_and_streamed_lengths(client):
    payload = b'{"preferences":{"name":"' + b"x" * 17000 + b'"}}'
    for body in (payload, iter([payload[:1000], payload[1000:]])):
        response = client.post(
            "/api/groups", content=body, headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 413
        assert response.headers["x-content-type-options"] == "nosniff"


def test_openapi_static_routes_and_bearer_scheme(client):
    schema = client.get("/api/openapi.json").json()
    assert "/api/groups/{group_id}/settings" in schema["paths"]
    assert "invite_code" in schema["components"]["schemas"]["GroupView"]["properties"]
    error_schema = schema["paths"]["/api/groups"]["post"]["responses"]["422"]["content"][
        "application/json"
    ]["schema"]
    assert error_schema == {"$ref": "#/components/schemas/ErrorResponse"}
    assert (
        schema["components"]["schemas"]["ErrorResponse"]["properties"]["detail"]["type"] == "string"
    )
    assert client.get("/api/missing").status_code == 404
    group, auth = create(client)
    assert (
        client.get(
            f"/api/groups/{group['id']}", headers={"Authorization": auth["Authorization"][7:]}
        ).status_code
        == 404
    )
    assert (
        client.put(
            f"/api/invites/{group['invite_code']}/me", headers=auth, json={"name": "غير مسموح"}
        ).status_code
        == 404
    )


def test_cors_origin_allowlist(client):
    for origin, allowed in (("http://localhost:8081", True), ("https://untrusted.example", False)):
        response = client.options(
            "/api/groups",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type,authorization",
            },
        )
        assert ("access-control-allow-origin" in response.headers) == allowed
