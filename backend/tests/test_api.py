import pytest
from fastapi.testclient import TestClient

from hatim.main import app


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("HATIM_DB", str(tmp_path / "test.sqlite3"))
    with TestClient(app) as client:
        yield client


def create(client):
    response = client.post("/api/groups", json={"preferences": {"name": "المنظّم"}})
    assert response.status_code == 201
    body = response.json()
    return body["group"], {"Authorization": "Bearer " + body["organizer_token"]}


def test_member_joins_and_updates_own_preferences_only(client):
    group, owner = create(client)
    code = group["invite_code"]
    response = client.post(
        f"/api/invites/{code}/members", json={"name": "سارة", "vegetarian": True}
    )
    assert response.status_code == 201
    member = response.json()
    auth = {"Authorization": "Bearer " + member["member_token"]}
    assert client.get(f"/api/groups/{group['id']}", headers=auth).status_code == 404
    assert (
        client.put(
            f"/api/groups/{group['id']}/settings", json={"slots": 1}, headers=auth
        ).status_code
        == 404
    )
    assert (
        client.get(f"/api/invites/{code}/me", headers=auth).json()["preferences"]["name"] == "سارة"
    )
    assert (
        client.put(
            f"/api/invites/{code}/me", headers=auth, json={"name": "سارة", "allergies": ["مكسرات"]}
        ).status_code
        == 200
    )
    updated = client.get(f"/api/groups/{group['id']}", headers=owner).json()
    assert len(updated["members"]) == 2
    assert updated["plan"]["anchor_issue"]
    public = client.get(f"/api/invites/{code}").json()
    assert "مكسرات" not in str(public)
    assert "preferences" not in public and "members" not in public
    assert public["anchor_issue"]


def test_groups_and_member_capabilities_are_isolated(client):
    first, owner = create(client)
    second, other = create(client)
    joined = client.post(
        f"/api/invites/{first['invite_code']}/members", json={"name": "عضو"}
    ).json()
    auth = {"Authorization": "Bearer " + joined["member_token"]}
    assert client.get(f"/api/groups/{first['id']}", headers=other).status_code == 404
    assert client.get(f"/api/invites/{second['invite_code']}/me", headers=auth).status_code == 404
    assert client.get(f"/api/invites/{first['invite_code']}/me").status_code == 404
    assert (
        client.get(f"/api/groups/{first['id']}", headers=owner).headers["cache-control"]
        == "no-store"
    )


def test_invalid_requests_and_unknown_experience_ids(client):
    group, auth = create(client)
    path = f"/api/groups/{group['id']}/settings"
    for body in (
        {"slots": 0},
        {"slots": 10},
        {"anchor_id": "missing"},
        {"pocket_ids": ["fire"]},
        {"completed_ids": ["fire", "sushi"], "slots": 1},
    ):
        assert client.put(path, headers=auth, json=body).status_code == 422
    assert client.post("/api/groups", json={"preferences": {"name": "   "}}).status_code == 422
    assert (
        client.post(
            f"/api/invites/{group['invite_code']}/members",
            json={"name": "أمل", "allergies": ["unknown"]},
        ).status_code
        == 422
    )


def test_organizer_can_remove_a_member_and_revoke_their_access(client):
    group, auth = create(client)
    code = group["invite_code"]
    member = client.post(f"/api/invites/{code}/members", json={"name": "عضو"}).json()
    path = f"/api/groups/{group['id']}/members/{member['member']['id']}"
    result = client.delete(path, headers=auth)
    assert result.status_code == 200 and len(result.json()["members"]) == 1
    assert (
        client.get(
            f"/api/invites/{code}/me", headers={"Authorization": "Bearer " + member["member_token"]}
        ).status_code
        == 404
    )
    assert (
        client.delete(
            f"/api/groups/{group['id']}/members/{group['members'][0]['id']}", headers=auth
        ).status_code
        == 404
    )


def test_group_capacity_is_bounded(client):
    group, _ = create(client)
    path = f"/api/invites/{group['invite_code']}/members"
    for index in range(11):
        assert client.post(path, json={"name": str(index)}).status_code == 201
    assert client.post(path, json={"name": "overflow"}).status_code == 409


def test_settings_persist_and_drive_the_shared_plan(client):
    group, auth = create(client)
    result = client.put(f"/api/groups/{group['id']}/settings", headers=auth, json={"slots": 1})
    assert result.status_code == 200
    public = client.get(f"/api/invites/{group['invite_code']}").json()
    assert public["slots"] == 1 and len(public["selected"]) == 1
    assert public["selected"][0]["experience_id"] == "fire"
    assert len(client.get(f"/api/groups/{group['id']}", headers=auth).json()["plan"]["pocket"]) == 8
