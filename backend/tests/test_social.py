from concurrent.futures import ThreadPoolExecutor

import pytest

from hatim.core.db import connect, digest


def account(client, handle="owner"):
    response = client.post(
        "/api/v2/auth/register",
        json={"handle": handle, "name": handle, "password": "test-password-1234"},
    )
    assert response.status_code == 201, response.text
    data = response.json()
    return {"Authorization": "Bearer " + data["token"]}, data


def setup_circle(client):
    owner, _ = account(client)
    r = client.post(
        "/api/v2/groups",
        headers=owner,
        json={"title": "ربع الخميس", "preferences": {"name": "أمل"}},
    )
    assert r.status_code == 201, r.text
    return owner, r.json()


def join(client, circle, handle="guest", **preferences):
    auth, _ = account(client, handle)
    r = client.post(
        f"/api/v2/invites/{circle['invite_code']}/join",
        headers=auth,
        json={"preferences": {"name": handle, **preferences}},
    )
    assert r.status_code == 200, r.text
    return auth, r.json()["me"]["id"]


def outing(client, owner, circle, title="عشاء الخميس", slots=3):
    r = client.post(
        f"/api/v2/groups/{circle['id']}/outings",
        headers=owner,
        json={"title": title, "slots": slots},
    )
    assert r.status_code == 201, r.text
    return r.json()


def go(client, auth, trip, attendance="going", budget_override=None):
    r = client.put(
        f"/api/v2/outings/{trip['id']}/me/attendance",
        headers=auth,
        json={"attendance": attendance, "budget_override": budget_override},
    )
    assert r.status_code == 200, r.text
    return r.json()


def start(client, owner, trip, mode="vote", choices=None):
    r = client.post(
        f"/api/v2/outings/{trip['id']}/rounds",
        headers=owner,
        json={"mode": mode, "experience_ids": choices or ["fire", "sushi"]},
    )
    assert r.status_code == 201, r.text
    return r.json()


def test_accounts_recover_groups_and_logout_revokes_session(client):
    owner, circle = setup_circle(client)
    with connect(read_only=True) as db:
        row = db.execute("SELECT password_hash FROM accounts").fetchone()
        assert row["password_hash"].startswith("$argon2id$")
    second = client.post(
        "/api/v2/auth/login", json={"handle": "OWNER", "password": "test-password-1234"}
    )
    assert second.status_code == 200
    auth = {"Authorization": "Bearer " + second.json()["token"]}
    assert client.get("/api/v2/groups", headers=auth).json()[0]["id"] == circle["id"]
    assert client.post("/api/v2/auth/logout", headers=owner).status_code == 200
    assert client.get("/api/v2/groups", headers=owner).status_code == 401
    assert client.get("/api/v2/auth/me", headers=auth).status_code == 200
    with connect() as db:
        db.execute("UPDATE account_sessions SET expires_at=CURRENT_TIMESTAMP-INTERVAL '1 second'")
    assert client.get("/api/v2/auth/me", headers=auth).status_code == 401


def test_login_throttles_failed_attempts_and_does_not_leak_passwords(client):
    account(client)
    for _ in range(10):
        r = client.post(
            "/api/v2/auth/login", json={"handle": "owner", "password": "wrong-password-1234"}
        )
        assert r.status_code == 401
        assert "wrong-password" not in r.text
    assert (
        client.post(
            "/api/v2/auth/login", json={"handle": "owner", "password": "test-password-1234"}
        ).status_code
        == 429
    )


def test_only_attending_members_affect_plans_and_outings_are_independent(client):
    owner, circle = setup_circle(client)
    guest, _ = join(client, circle, allergies=["حليب"])
    first = outing(client, owner, circle)
    second = outing(client, owner, circle, title="فطور الاثنين", slots=1)
    assert first["plan"]["selected"]
    affected = go(client, guest, first)
    assert not affected["plan"]["selected"]
    assert "حليب" not in str(affected["plan"])
    assert client.get(f"/api/v2/outings/{second['id']}", headers=owner).json()["plan"]["selected"]
    assert (
        client.get(f"/api/v2/groups/{circle['id']}", headers=guest).json()["members"][0][
            "preferences"
        ]
        is None
    )
    outsider, _ = account(client, "outside")
    assert client.get(f"/api/v2/outings/{first['id']}", headers=outsider).status_code == 404


def test_vote_upsert_tie_draw_and_shrinking_keep_one_result(client):
    owner, circle = setup_circle(client)
    guest, _ = join(client, circle)
    trip = outing(client, owner, circle)
    go(client, guest, trip)
    trip = start(client, owner, trip)
    rid = trip["round"]["id"]
    for _ in range(2):
        assert (
            client.put(
                f"/api/v2/rounds/{rid}/my-vote", headers=owner, json={"experience_id": "fire"}
            ).status_code
            == 200
        )
    changed = client.put(
        f"/api/v2/rounds/{rid}/my-vote", headers=owner, json={"experience_id": "sushi"}
    ).json()
    assert changed["round"]["voted_count"] == 1
    assert (
        client.put(
            f"/api/v2/rounds/{rid}/my-vote", headers=guest, json={"experience_id": "fire"}
        ).status_code
        == 200
    )
    assert client.post(f"/api/v2/rounds/{rid}/resolve", headers=guest).status_code == 403
    assert (
        client.post(f"/api/v2/rounds/{rid}/resolve", headers=owner).json()["round"]["status"]
        == "tied"
    )
    assert (
        client.put(
            f"/api/v2/rounds/{rid}/my-vote", headers=guest, json={"experience_id": "sushi"}
        ).status_code
        == 409
    )
    with ThreadPoolExecutor(max_workers=4) as pool:
        results = list(
            pool.map(
                lambda _: client.post(f"/api/v2/rounds/{rid}/draw", headers=owner).json(), range(4)
            )
        )
    winners = {r["round"]["result_id"] for r in results}
    assert len(winners) == 1
    trip = results[0]
    settings = {**trip["settings"], "slots": 1}
    smaller = client.put(
        f"/api/v2/outings/{trip['id']}/settings",
        headers=owner,
        json={"settings": settings, "expected": trip["settings"]},
    ).json()
    assert smaller["round"]["status"] == "resolved"
    assert smaller["round"]["result_id"] in winners
    assert smaller["plan"]["selected"][0]["experience_id"] in winners
    assert smaller["planning_revision"] == trip["planning_revision"]


def test_votes_cannot_override_constraints_or_change_unrelated_rounds(client):
    owner, circle = setup_circle(client)
    guest, _ = join(client, circle)
    trip = outing(client, owner, circle)
    assert (
        client.post(
            f"/api/v2/outings/{trip['id']}/rounds",
            headers=guest,
            json={"mode": "vote", "experience_ids": ["fire"]},
        ).status_code
        == 403
    )
    trip = start(client, owner, trip)
    rid = trip["round"]["id"]
    assert (
        client.put(
            f"/api/v2/rounds/{rid}/my-vote", headers=guest, json={"experience_id": "fire"}
        ).status_code
        == 403
    )
    assert (
        client.put(
            f"/api/v2/rounds/{rid}/my-vote", headers=owner, json={"experience_id": "coffee"}
        ).status_code
        == 422
    )
    assert client.post(f"/api/v2/rounds/{rid}/resolve", headers=owner).status_code == 409
    go(client, guest, trip, budget_override=100)
    stale = client.post(f"/api/v2/rounds/{rid}/resolve", headers=owner).json()
    assert stale["round"]["status"] == "invalidated"
    assert (
        client.post(
            f"/api/v2/outings/{trip['id']}/rounds",
            headers=owner,
            json={"mode": "draw", "experience_ids": ["fire"]},
        ).status_code
        == 409
    )


def test_preference_change_invalidates_all_open_attending_outings_not_history(client):
    owner, circle = setup_circle(client)
    first = start(client, owner, outing(client, owner, circle), mode="draw")
    second = start(client, owner, outing(client, owner, circle), mode="draw")
    before = client.post(f"/api/v2/rounds/{first['round']['id']}/draw", headers=owner).json()
    history = client.post(f"/api/v2/outings/{first['id']}/close", headers=owner).json()
    assert history["status"] == "closed"
    r = client.put(
        f"/api/v2/groups/{circle['id']}/me/preferences",
        headers=owner,
        json={"name": "أمل", "allergies": ["حليب"]},
    )
    assert r.status_code == 200
    after = client.get(f"/api/v2/outings/{first['id']}", headers=owner).json()
    assert after["plan"] == history["plan"]
    assert after["participants"][0]["preferences"]["allergies"] == []
    assert after["round"]["result_id"] == before["round"]["result_id"]
    assert (
        client.get(f"/api/v2/outings/{second['id']}", headers=owner).json()["round"]["status"]
        == "invalidated"
    )


def test_coordinator_is_not_owner_and_removal_requires_explicit_restore(client):
    owner, circle = setup_circle(client)
    guest, member_id = join(client, circle)
    trip = go(client, guest, outing(client, owner, circle))
    assert (
        client.put(
            f"/api/v2/outings/{trip['id']}/coordinator",
            headers=owner,
            json={"member_id": member_id},
        ).status_code
        == 200
    )
    assert start(client, guest, trip)["can_manage"]
    assert (
        client.post(
            f"/api/v2/groups/{circle['id']}/members/{circle['me']['id']}/remove", headers=guest
        ).status_code
        == 403
    )
    assert (
        client.post(
            f"/api/v2/groups/{circle['id']}/members/{member_id}/remove", headers=owner
        ).status_code
        == 200
    )
    assert client.get(f"/api/v2/outings/{trip['id']}", headers=guest).status_code == 404
    assert (
        client.post(
            f"/api/v2/invites/{circle['invite_code']}/join",
            headers=guest,
            json={"preferences": {"name": "عودة"}},
        ).status_code
        == 403
    )
    assert (
        client.post(
            f"/api/v2/groups/{circle['id']}/members/{member_id}/restore", headers=owner
        ).status_code
        == 200
    )
    assert client.get(f"/api/v2/outings/{trip['id']}", headers=guest).status_code == 200


def test_fun_is_opt_in_dismissible_and_never_changes_votes_or_preferences(client):
    owner, circle = setup_circle(client)
    guest, member_id = join(client, circle)
    trip = go(client, guest, outing(client, owner, circle))
    path = f"/api/v2/outings/{trip['id']}/fun/{member_id}"
    assert client.post(path, headers=owner).status_code == 403
    assert (
        client.patch(
            f"/api/v2/groups/{circle['id']}/me/options",
            headers=guest,
            json={"pinned": True, "fun_opt_in": True},
        ).status_code
        == 200
    )
    assert client.post(path, headers=owner).status_code == 403
    client.patch(
        f"/api/v2/groups/{circle['id']}/me/options", headers=owner, json={"fun_opt_in": True}
    )
    partial = client.patch(
        f"/api/v2/groups/{circle['id']}/me/options", headers=guest, json={"pinned": False}
    ).json()
    assert partial["me"]["fun_opt_in"] is True
    assert partial["pinned"] is False
    before = client.get(f"/api/v2/outings/{trip['id']}", headers=owner).json()
    result = client.post(path, headers=owner).json()
    assert result["cards"][0]["target_id"] == member_id
    assert result["plan"] == before["plan"]
    assert result["planning_revision"] == before["planning_revision"]
    assert len(client.post(path, headers=owner).json()["cards"]) == 1
    dismissed = client.delete(f"/api/v2/outings/{trip['id']}/fun/me", headers=guest).json()
    assert dismissed["cards"] == []
    assert client.post(path, headers=owner).json()["cards"] == []


def test_legacy_claim_requires_capability_and_preserves_data_and_member_claim(client):
    old = client.post("/api/groups", json={"preferences": {"name": "المنظم القديم"}}).json()
    group_id = old["group"]["id"]
    code = old["group"]["invite_code"]
    member = client.post(f"/api/invites/{code}/members", json={"name": "عضو قديم"}).json()
    legacy_owner = {"Authorization": "Bearer " + old["organizer_token"]}
    original = {
        "slots": 3,
        "anchor_id": "fire",
        "pocket_ids": ["coffee"],
        "completed_ids": ["sushi"],
    }
    client.put(f"/api/groups/{group_id}/settings", headers=legacy_owner, json=original)
    auth, _ = account(client)
    assert (
        client.post(
            "/api/v2/legacy/claim",
            headers=auth,
            json={"group_id": group_id, "owner_token": "wrong"},
        ).status_code
        == 404
    )
    body = {"group_id": group_id, "owner_token": old["organizer_token"]}
    migrated = client.post("/api/v2/legacy/claim", headers=auth, json=body)
    assert migrated.status_code == 200, migrated.text
    circle = migrated.json()
    assert circle["invite_code"] == code and len(circle["members"]) == 2
    trip = client.get(f"/api/v2/outings/{circle['outings'][0]['id']}", headers=auth).json()
    assert trip["settings"] == original
    assert client.post("/api/v2/legacy/claim", headers=auth, json=body).json()["id"] == circle["id"]
    assert (
        client.put(
            f"/api/groups/{group_id}/settings", headers=legacy_owner, json=original
        ).status_code
        == 409
    )
    assert client.post(f"/api/invites/{code}/members", json={"name": "متأخر"}).status_code == 409
    guest, _ = account(client, "guest")
    claimed = client.post(
        f"/api/v2/invites/{code}/join",
        headers=guest,
        json={"preferences": {"name": "عضو قديم"}, "legacy_token": member["member_token"]},
    )
    assert claimed.status_code == 200, claimed.text
    assert claimed.json()["me"]["id"] == member["member"]["id"]
    assert len(claimed.json()["members"]) == 2
    with connect(read_only=True) as db:
        assert db.execute("SELECT owner_hash FROM groups WHERE id=%s", (group_id,)).fetchone()[
            "owner_hash"
        ] == digest(old["organizer_token"])


@pytest.mark.parametrize(
    "mode,choices", [("draw", ["fire"]), ("draw", ["fire", "sushi"]), ("vote", ["fire", "sushi"])]
)
def test_decision_results_are_persistent_and_honest(client, mode, choices):
    owner, circle = setup_circle(client)
    trip = start(client, owner, outing(client, owner, circle), mode=mode, choices=choices)
    rid = trip["round"]["id"]
    if mode == "vote":
        client.put(f"/api/v2/rounds/{rid}/my-vote", headers=owner, json={"experience_id": "sushi"})
    verb = "draw" if mode == "draw" else "resolve"
    r = client.post(f"/api/v2/rounds/{rid}/{verb}", headers=owner)
    assert r.status_code == 200, r.text
    result = r.json()
    assert result["round"]["status"] == "resolved"
    assert result["settings"]["anchor_id"] == result["round"]["result_id"]
    assert result["round"]["resolved_by"] == ("only_option" if len(choices) == 1 else mode)
    assert (
        client.post(f"/api/v2/rounds/{rid}/{verb}", headers=owner).json()["round"]
        == result["round"]
    )


def test_stale_settings_cannot_silently_overwrite_shared_choice(client):
    owner, circle = setup_circle(client)
    trip = outing(client, owner, circle)
    stale = trip["settings"]
    trip = start(client, owner, trip, mode="draw", choices=["fire"])
    resolved = client.post(f"/api/v2/rounds/{trip['round']['id']}/draw", headers=owner).json()
    assert resolved["settings"]["anchor_id"] == "fire"
    response = client.put(
        f"/api/v2/outings/{trip['id']}/settings",
        headers=owner,
        json={"settings": {**stale, "slots": 1}, "expected": stale},
    )
    assert response.status_code == 409
    fresh = client.get(f"/api/v2/outings/{trip['id']}", headers=owner).json()
    assert fresh["settings"] == resolved["settings"]
    assert fresh["round"]["status"] == "resolved"


def test_restore_resets_open_attendance_and_transfer_changes_only_owner_rights(client):
    owner, circle = setup_circle(client)
    guest, member_id = join(client, circle)
    trip = go(client, guest, outing(client, owner, circle), budget_override=100)
    root = f"/api/v2/groups/{circle['id']}"
    assert client.post(root + f"/members/{member_id}/remove", headers=owner).status_code == 200
    assert client.post(root + f"/members/{member_id}/restore", headers=owner).status_code == 200
    restored = client.get(f"/api/v2/outings/{trip['id']}", headers=guest).json()
    me = next(p for p in restored["participants"] if p["is_me"])
    assert me["attendance"] == "pending"
    assert me["budget_override"] is None
    result = client.post(root + "/transfer", headers=owner, json={"member_id": member_id})
    assert result.status_code == 200
    assert result.json()["is_owner"] is False
    assert (
        client.put(root + "/title", headers=owner, json={"title": "غير مسموح"}).status_code == 403
    )
    assert client.put(root + "/title", headers=guest, json={"title": "اسم جديد"}).status_code == 200
    # Creating an outing made the former owner its coordinator; that role is independent.
    assert client.get(f"/api/v2/outings/{trip['id']}", headers=owner).json()["can_manage"] is True


def test_choose_coordinator_when_creating_without_forcing_attendance(client):
    owner, circle = setup_circle(client)
    guest, member_id = join(client, circle)
    result = client.post(
        f"/api/v2/groups/{circle['id']}/outings",
        headers=owner,
        json={"title": "طلعة بقيادة سارة", "coordinator_id": member_id},
    )
    assert result.status_code == 201
    trip = result.json()
    assert trip["coordinator_id"] == member_id
    assert trip["coordinator_name"] == "guest"
    assert trip["owner_name"] == "أمل"
    assert (
        next(p for p in trip["participants"] if p["member_id"] == member_id)["attendance"]
        == "pending"
    )
    guest_view = client.get(f"/api/v2/outings/{trip['id']}", headers=guest).json()
    assert guest_view["can_manage"] is True
    assert guest_view["is_owner"] is False
    assert guest_view["participants"][0]["is_owner"] is True
    assert (
        client.get(f"/api/v2/groups/{circle['id']}", headers=owner).json()["outings"][0][
            "coordinator_name"
        ]
        == "guest"
    )


def test_coordinator_can_handoff_to_pending_member_and_loses_permission(client):
    owner, circle = setup_circle(client)
    guest, member_id = join(client, circle)
    other, other_id = join(client, circle, "another")
    trip = outing(client, guest, circle)
    trip = start(client, guest, trip)
    path = f"/api/v2/outings/{trip['id']}/coordinator"
    assert client.put(path, headers=other, json={"member_id": other_id}).status_code == 403
    handoff = client.put(path, headers=guest, json={"member_id": other_id})
    assert handoff.status_code == 200
    result = handoff.json()
    assert result["can_manage"] is False
    assert result["coordinator_id"] == other_id
    assert result["settings"] == trip["settings"]
    assert result["round"] == trip["round"]
    assert result["planning_revision"] == trip["planning_revision"]
    assert (
        next(p for p in result["participants"] if p["member_id"] == other_id)["attendance"]
        == "pending"
    )
    assert client.put(path, headers=guest, json={"member_id": member_id}).status_code == 403
    # Circle owner remains able to recover the organizer role.
    assert (
        client.put(path, headers=owner, json={"member_id": circle["me"]["id"]}).status_code == 200
    )


def test_coordinator_selection_rejects_external_removed_unclaimed_and_closed(client):
    owner, circle = setup_circle(client)
    _, member_id = join(client, circle)
    _, elsewhere = setup_other_circle(client)
    root = f"/api/v2/groups/{circle['id']}"
    trip = outing(client, owner, circle)
    path = f"/api/v2/outings/{trip['id']}/coordinator"
    with connect() as db:
        db.execute(
            "INSERT INTO circle_members(id,circle_id,preferences) VALUES(%s,%s,%s::jsonb)",
            ("unclaimed", circle["id"], '{"name":"عضو ينتظر حسابه"}'),
        )
    for target in ("missing-member", "unclaimed", elsewhere["me"]["id"]):
        assert client.put(path, headers=owner, json={"member_id": target}).status_code == 409
        assert (
            client.post(
                root + "/outings",
                headers=owner,
                json={"title": "لا تنشأ", "coordinator_id": target},
            ).status_code
            == 409
        )
    client.post(root + f"/members/{member_id}/remove", headers=owner)
    assert client.put(path, headers=owner, json={"member_id": member_id}).status_code == 409
    client.post(root + f"/members/{member_id}/restore", headers=owner)
    client.post(f"/api/v2/outings/{trip['id']}/close", headers=owner)
    assert client.put(path, headers=owner, json={"member_id": member_id}).status_code == 409
    assert len(client.get(root, headers=owner).json()["outings"]) == 1


def setup_other_circle(client):
    auth, _ = account(client, "outsider_owner")
    response = client.post(
        "/api/v2/groups",
        headers=auth,
        json={"title": "قروب آخر", "preferences": {"name": "من قروب آخر"}},
    )
    assert response.status_code == 201
    return auth, response.json()
