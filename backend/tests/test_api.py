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


def test_start_plan_with_selected_anchor_and_constraints_in_one_request(client):
    result = client.post(
        "/api/groups",
        json={
            "preferences": {"name": "أمل", "allergies": ["حليب"]},
            "settings": {"slots": 1, "anchor_id": "fire", "pocket_ids": ["sushi"]},
        },
    )
    assert result.status_code == 201
    data = result.json()
    group = data["group"]
    assert group["settings"]["anchor_id"] == "fire"
    assert group["settings"]["pocket_ids"] == ["sushi"]
    assert group["plan"]["anchor_issue"]
    assert group["plan"]["selected"] == []
    saved = client.get(
        f"/api/groups/{group['id']}",
        headers={"Authorization": "Bearer " + data["organizer_token"]},
    ).json()
    assert saved["settings"] == group["settings"]
    assert saved["members"][0]["preferences"]["allergies"] == ["حليب"]


def test_start_plan_without_silent_anchor_and_reject_unknown_experience(client):
    from hatim.store import connect

    with connect() as db:
        before = db.execute("SELECT count(*) AS n FROM groups").fetchone()["n"]
    for settings in ({"anchor_id": "missing"}, {"pocket_ids": ["missing"]}):
        assert (
            client.post(
                "/api/groups", json={"preferences": {"name": "أمل"}, "settings": settings}
            ).status_code
            == 422
        )
    with connect() as db:
        assert db.execute("SELECT count(*) AS n FROM groups").fetchone()["n"] == before
    response = client.post(
        "/api/groups",
        json={"preferences": {"name": "أمل"}, "settings": {"anchor_id": None, "slots": 1}},
    )
    assert response.status_code == 201
    group = response.json()["group"]
    assert group["settings"]["anchor_id"] is None
    assert len(group["plan"]["selected"]) == 1
    assert all(d["priority"] != "ركيزة" for d in group["plan"]["selected"])
