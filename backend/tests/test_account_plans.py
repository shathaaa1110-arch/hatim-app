from concurrent.futures import ThreadPoolExecutor

import pytest
from psycopg.types.json import Jsonb
from test_api import create
from test_social import account

from hatim.core.db import connect
from hatim.features.experiences.fixtures import CATALOG


def saved_plan(client, headers, **settings):
    response = client.post(
        "/api/groups",
        headers=headers,
        json={"preferences": {"name": "أمل"}, "settings": {"anchor_id": None, **settings}},
    )
    assert response.status_code == 201, response.text
    assert response.json()["organizer_token"] is None
    return response.json()["group"]


def test_account_plan_crud_isolated_and_recovered_after_login(client):
    owner, user = account(client)
    other, _ = account(client, "other")
    group = saved_plan(client, owner, slots=3, anchor_id="sushi", pocket_ids=["fire"])
    path = f"/api/groups/{group['id']}"
    assert group["owner_account_id"] == user["account"]["id"]
    assert client.get("/api/groups", headers=other).json() == []
    for headers in ({}, other):
        assert client.get(path, headers=headers).status_code == 404
        assert (
            client.put(path + "/title", headers=headers, json={"title": "stolen"}).status_code
            == 404
        )
        assert client.delete(path, headers=headers).status_code == 404
    assert (
        client.put(path + "/title", headers=owner, json={"title": "عشاء السبت"}).status_code == 200
    )
    assert client.get("/api/groups", headers=owner).json() == [
        {"id": group["id"], "title": "عشاء السبت", "slots": 3, "consumed": 0}
    ]
    assert client.post("/api/v2/auth/logout", headers=owner).status_code == 200
    assert client.get(path, headers=owner).status_code == 404
    assert client.get("/api/groups", headers=owner).status_code == 401
    token = client.post(
        "/api/v2/auth/login", json={"handle": "owner", "password": "test-password-1234"}
    ).json()["token"]
    restored = {"Authorization": "Bearer " + token}
    assert client.get(path, headers=restored).json()["settings"] == group["settings"]
    assert client.delete(path, headers=restored).status_code == 200
    assert client.get("/api/groups", headers=restored).json() == []
    assert client.get(f"/api/invites/{group['invite_code']}").status_code == 404
    with connect(read_only=True) as db:
        assert (
            db.execute(
                "SELECT count(*) AS n FROM members WHERE group_id=%s", (group["id"],)
            ).fetchone()["n"]
            == 0
        )
        assert db.execute("SELECT count(*) AS n FROM accounts").fetchone()["n"] == 2


def test_stale_settings_cannot_overwrite_another_devices_pocket(client):
    owner, _ = account(client)
    group = saved_plan(client, owner, slots=3)
    path = f"/api/groups/{group['id']}/settings"
    first = client.put(
        path,
        headers=owner,
        json={
            **group["settings"],
            "pocket_ids": ["sushi"],
            "expected": group["settings"],
        },
    )
    assert first.status_code == 200
    second = client.put(
        path,
        headers=owner,
        json={
            **group["settings"],
            "slots": 1,
            "expected": group["settings"],
        },
    )
    assert second.status_code == 409
    assert client.get(f"/api/groups/{group['id']}", headers=owner).json()["settings"][
        "pocket_ids"
    ] == ["sushi"]


def test_expired_session_never_falls_back_to_creating_guest_plan(client):
    owner, _ = account(client)
    with connect() as db:
        db.execute("UPDATE account_sessions SET expires_at=CURRENT_TIMESTAMP-INTERVAL '1 second'")
    assert (
        client.post("/api/groups", headers=owner, json={"preferences": {"name": "x"}}).status_code
        == 401
    )
    with connect(read_only=True) as db:
        assert db.execute("SELECT count(*) AS n FROM groups").fetchone()["n"] == 0


def test_explicit_save_preserves_companions_and_revokes_guest_capability(client):
    guest, capability = create(client)
    path = f"/api/groups/{guest['id']}"
    member = client.post(
        f"/api/invites/{guest['invite_code']}/members", json={"name": "رفيق", "allergies": ["حليب"]}
    ).json()
    before = client.get(path, headers=capability).json()
    owner, _ = account(client)
    other, _ = account(client, "other")
    body = {"owner_token": capability["Authorization"][7:]}
    assert (
        client.put(path + "/account", headers=owner, json={"owner_token": "wrong"}).status_code
        == 404
    )
    response = client.put(path + "/account", headers=owner, json=body)
    assert response.status_code == 200
    saved = response.json()
    for key in ("settings", "members", "plan", "invite_code"):
        assert saved[key] == before[key]
    assert client.put(path + "/account", headers=owner, json=body).status_code == 200
    assert client.put(path + "/account", headers=other, json=body).status_code == 404
    assert client.get(path, headers=capability).status_code == 404
    assert (
        client.post(
            "/api/v2/legacy/claim", headers=other, json={"group_id": guest["id"], **body}
        ).status_code
        == 404
    )
    assert (
        client.get(
            f"/api/invites/{guest['invite_code']}/me",
            headers={"Authorization": "Bearer " + member["member_token"]},
        ).status_code
        == 200
    )
    assert client.put(path + "/settings", headers=owner, json={"slots": 1}).json()["plan"][
        "anchor_issue"
    ]


def test_two_accounts_cannot_claim_the_same_guest_plan(client):
    guest, capability = create(client)
    accounts = [account(client, "first")[0], account(client, "second")[0]]
    with ThreadPoolExecutor(max_workers=2) as pool:
        statuses = list(
            pool.map(
                lambda headers: (
                    client.put(
                        f"/api/groups/{guest['id']}/account",
                        headers=headers,
                        json={"owner_token": capability["Authorization"][7:]},
                    ).status_code
                ),
                accounts,
            )
        )
    assert sorted(statuses) == [200, 404]


def test_guest_plan_title_and_delete_require_owner_and_revoke_invites(client):
    group, owner = create(client)
    path = f"/api/groups/{group['id']}"
    member = client.post(
        f"/api/invites/{group['invite_code']}/members", json={"name": "عضو"}
    ).json()
    auth = {"Authorization": "Bearer " + member["member_token"]}
    assert client.delete(path, headers=auth).status_code == 404
    assert client.put(path + "/title", headers=owner, json={"title": "   "}).status_code == 422
    assert (
        client.put(path + "/title", headers=owner, json={"title": "الخطة الجديدة"}).status_code
        == 200
    )
    assert client.get(f"/api/invites/{group['invite_code']}").json()["title"] == "الخطة الجديدة"
    assert client.delete(path, headers=owner).status_code == 200
    assert (
        client.put(
            f"/api/invites/{group['invite_code']}/me", headers=auth, json={"name": "عضو"}
        ).status_code
        == 404
    )


def test_circle_upgrade_cannot_be_deleted_or_reclaimed_as_direct_plan(client):
    guest, capability = create(client)
    owner, _ = account(client)
    body = {"owner_token": capability["Authorization"][7:]}
    assert (
        client.post(
            "/api/v2/legacy/claim", headers=owner, json={"group_id": guest["id"], **body}
        ).status_code
        == 200
    )
    path = f"/api/groups/{guest['id']}"
    assert client.put(path + "/account", headers=owner, json=body).status_code == 409
    assert client.delete(path, headers=capability).status_code == 409
    assert client.put(path + "/title", headers=capability, json={"title": "bad"}).status_code == 409


def test_account_profile_validation_and_isolation(client):
    owner, user = account(client)
    other, _ = account(client, "other")
    assert client.put("/api/v2/auth/me", json={"name": "new"}).status_code == 401
    for body in ({"name": " "}, {"name": "x" * 31}, {"name": "new", "id": "other"}):
        assert client.put("/api/v2/auth/me", headers=owner, json=body).status_code == 422
    updated = client.put("/api/v2/auth/me", headers=owner, json={"name": "أمل"}).json()
    assert updated == {**user["account"], "name": "أمل"}
    assert client.get("/api/v2/auth/me", headers=other).json()["name"] == "other"


def test_discovery_and_both_planners_read_the_database_catalog(client):
    # A row absent from the Python fixtures must be visible and usable by the core.
    custom = CATALOG[0].model_copy(
        update={"id": "db-only", "title": "من قاعدة البيانات", "why": "سبب محفوظ"}
    )
    with connect() as db:
        db.execute(
            "INSERT INTO experiences(id,payload) VALUES(%s,%s)",
            (custom.id, Jsonb(custom.model_dump())),
        )
    core = client.get("/api/experiences").json()
    assert core == client.get("/api/v2/experiences").json()
    assert custom.model_dump() in core
    response = client.post(
        "/api/groups",
        json={"preferences": {"name": "مقيم"}, "settings": {"slots": 1, "anchor_id": "db-only"}},
    )
    assert response.status_code == 201
    group = response.json()["group"]
    assert group["plan"]["selected"][0]["experience_id"] == "db-only"
    public = client.get(f"/api/invites/{group['invite_code']}").json()
    assert public["selected"][0]["reason"] == "سبب محفوظ"


@pytest.mark.parametrize("path", ["/api/experiences", "/api/v2/experiences"])
def test_catalog_reports_database_failure_instead_of_using_fake_persistence(
    client, monkeypatch, path
):
    monkeypatch.setenv("DATABASE_URL", "postgresql://invalid@127.0.0.1:1/invalid")
    assert client.get(path).status_code == 503
