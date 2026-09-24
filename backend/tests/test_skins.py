from concurrent.futures import ThreadPoolExecutor

import pytest
from test_social import account, go, join, outing, setup_circle, start

from hatim.core.db import connect, initialize
from hatim.features.groups.models import Skin

HOST = Skin(persona="host", outfit="thobe").model_dump()
LATE = Skin(persona="on_way", outfit="abaya", color="rose", accessory="glasses").model_dump()
CHOOSER = Skin(persona="you_choose", expression="side_eye", phrase="extra").model_dump()


def skin(client, auth, entity, value, expected=None, scope="groups"):
    return client.put(
        f"/api/v2/{scope}/{entity['id']}/me/skin",
        headers=auth,
        json={"skin": value, "expected": expected},
    )


def read(client, auth, trip):
    r = client.get(f"/api/v2/outings/{trip['id']}", headers=auth)
    assert r.status_code == 200
    return r.json()


def test_default_inheritance_override_reset_and_scope_isolation(client):
    owner, circle = setup_circle(client)
    guest, guest_id = join(client, circle)
    trip = outing(client, owner, circle)
    second = outing(client, owner, circle, title="طلعة ثانية")
    other = client.post(
        "/api/v2/groups", headers=owner, json={"title": "العائلة", "preferences": {"name": "أمل"}}
    ).json()
    assert circle["me"]["skin"] is None
    assert skin(client, owner, circle, HOST).json()["me"]["skin"] == HOST
    assert read(client, owner, trip)["participants"][0]["skin"] == HOST
    changed = skin(client, owner, trip, LATE, scope="outings")
    assert changed.status_code == 200
    assert changed.json()["participants"][0]["skin"] == LATE
    assert changed.json()["participants"][0]["skin_override"] == LATE
    assert skin(client, owner, circle, CHOOSER, HOST).status_code == 200
    assert read(client, owner, trip)["participants"][0]["skin"] == LATE
    assert read(client, owner, second)["participants"][0]["skin"] == CHOOSER
    reset = skin(client, owner, trip, None, LATE, scope="outings").json()
    assert reset["participants"][0]["skin"] == CHOOSER
    assert reset["participants"][0]["skin_override"] is None
    assert next(p for p in reset["participants"] if p["member_id"] == guest_id)["skin"] is None
    assert client.get(f"/api/v2/groups/{other['id']}", headers=owner).json()["me"]["skin"] is None
    assert skin(client, guest, circle, LATE).status_code == 200
    assert skin(client, owner, circle, None, CHOOSER).json()["me"]["skin"] is None
    assert read(client, owner, trip)["participants"][0]["skin"] is None
    # Anonymous invitation does not expose skins, accounts or preferences.
    assert set(client.get(f"/api/v2/invites/{circle['invite_code']}").json()) == {
        "id",
        "title",
        "member_count",
    }


def test_skin_change_preserves_food_constraints_votes_and_revisions(client):
    owner, circle = setup_circle(client)
    guest, _ = join(client, circle, mild=True, budget=160)
    trip = outing(client, owner, circle)
    go(client, guest, trip)
    trip = start(client, owner, trip, choices=["fire", "coffee"])
    voted = client.put(
        f"/api/v2/rounds/{trip['round']['id']}/my-vote",
        headers=guest,
        json={"experience_id": "fire"},
    )
    assert voted.status_code == 200
    before = read(client, owner, trip)
    assert skin(client, guest, circle, LATE).status_code == 200
    assert skin(client, guest, trip, HOST, scope="outings").status_code == 200
    after = read(client, owner, trip)
    for field in ("plan", "settings", "round", "planning_revision", "eligible_ids", "cards"):
        assert after[field] == before[field]
    for previous, current in zip(before["participants"], after["participants"], strict=True):
        assert {k: v for k, v in current.items() if not k.startswith("skin")} == {
            k: v for k, v in previous.items() if not k.startswith("skin")
        }


def test_skin_never_clears_allergy_blocks(client):
    owner, circle = setup_circle(client)
    guest, _ = join(client, circle, allergies=["مكسرات"])
    trip = outing(client, owner, circle)
    go(client, guest, trip)
    before = read(client, owner, trip)
    assert before["eligible_ids"] == []
    assert skin(client, guest, circle, HOST).status_code == 200
    assert skin(client, guest, trip, LATE, scope="outings").status_code == 200
    after = read(client, owner, trip)
    assert after["plan"] == before["plan"]
    assert after["eligible_ids"] == []
    assert after["participants"][1]["preferences"]["allergies"] == ["مكسرات"]


def test_archives_freeze_inherited_override_and_absent_skin(client):
    owner, circle = setup_circle(client)
    guest, guest_id = join(client, circle)
    _, absent_id = join(client, circle, handle="absent")
    trip = outing(client, owner, circle)
    skin(client, owner, circle, HOST)
    skin(client, guest, circle, HOST)
    skin(client, guest, trip, LATE, scope="outings")
    close = client.post(f"/api/v2/outings/{trip['id']}/close", headers=owner)
    assert close.status_code == 200
    skin(client, owner, circle, CHOOSER, HOST)
    skin(client, guest, circle, CHOOSER, HOST)
    with connect() as db:
        # A previously skinless member can choose a skin after the outing ends.
        db.execute(
            "UPDATE circle_members SET skin=skin2.skin FROM circle_members skin2 "
            "WHERE circle_members.id=%s AND skin2.id=%s",
            (absent_id, circle["me"]["id"]),
        )
    saved = read(client, owner, trip)
    appearances = {p["member_id"]: p["skin"] for p in saved["participants"]}
    assert appearances == {circle["me"]["id"]: HOST, guest_id: LATE, absent_id: None}
    assert skin(client, owner, trip, CHOOSER, scope="outings").status_code == 409
    assert client.post(f"/api/v2/outings/{trip['id']}/close", headers=owner).json() == saved


@pytest.mark.parametrize("scope", ["groups", "outings"])
def test_only_active_members_edit_themselves_and_archives_reject_writes(client, scope):
    owner, circle = setup_circle(client)
    guest, guest_id = join(client, circle)
    stranger, _ = account(client, "stranger")
    trip = outing(client, owner, circle)
    entity = circle if scope == "groups" else trip
    assert skin(client, {}, entity, HOST, scope=scope).status_code == 401
    assert skin(client, stranger, entity, HOST, scope=scope).status_code == 404
    path = f"/api/v2/{scope}/{entity['id']}/me/skin"
    assert (
        client.put(
            path, headers=owner, json={"skin": HOST, "expected": None, "member_id": guest_id}
        ).status_code
        == 422
    )
    assert skin(client, guest, entity, LATE, scope=scope).status_code == 200
    assert skin(client, owner, entity, HOST, scope=scope).status_code == 200
    client.post(f"/api/v2/groups/{circle['id']}/members/{guest_id}/remove", headers=owner)
    assert skin(client, guest, entity, CHOOSER, LATE, scope=scope).status_code == 404
    client.post(f"/api/v2/outings/{trip['id']}/close", headers=owner)
    client.post(f"/api/v2/groups/{circle['id']}/archive", headers=owner)
    assert skin(client, owner, entity, CHOOSER, HOST, scope=scope).status_code == 409


@pytest.mark.parametrize("scope", ["groups", "outings"])
def test_concurrent_cosmetic_edits_do_not_silently_overwrite(client, scope):
    owner, circle = setup_circle(client)
    entity = circle if scope == "groups" else outing(client, owner, circle)
    with ThreadPoolExecutor(max_workers=2) as pool:
        statuses = list(
            pool.map(
                lambda value: skin(client, owner, entity, value, scope=scope).status_code,
                [HOST, LATE],
            )
        )
    assert sorted(statuses) == [200, 409]


@pytest.mark.parametrize(
    "body",
    [
        {"skin": {"persona": "admin"}, "expected": None},
        {"skin": {"persona": "host", "url": "https://example.test/a"}, "expected": None},
        {"skin": {"persona": "host", "phrase": "arbitrary text"}, "expected": None},
        {"skin": {"persona": "host", "version": 2}, "expected": None},
        {"skin": None},
        {"expected": None},
    ],
)
def test_skin_contract_rejects_invalid_or_incomplete_changes(client, body):
    owner, circle = setup_circle(client)
    assert (
        client.put(f"/api/v2/groups/{circle['id']}/me/skin", headers=owner, json=body).status_code
        == 422
    )
    assert client.get(f"/api/v2/groups/{circle['id']}", headers=owner).json()["me"]["skin"] is None


def test_migration_preserves_existing_members_and_closed_outings(client):
    owner, circle = setup_circle(client)
    trip = outing(client, owner, circle)
    client.post(f"/api/v2/outings/{trip['id']}/close", headers=owner)
    # Recreate the pre-005 schema only in this test's disposable PostgreSQL schema.
    with connect() as db:
        db.execute("ALTER TABLE circle_members DROP COLUMN skin")
        db.execute(
            "ALTER TABLE outing_participants DROP COLUMN skin_override, DROP COLUMN skin_snapshot"
        )
        db.execute("DELETE FROM schema_migrations WHERE version='005_outing_skins.sql'")
    initialize()
    skin(client, owner, circle, HOST)
    assert read(client, owner, trip)["participants"][0]["skin"] is None
    assert read(client, owner, trip)["plan"] == trip["plan"]
