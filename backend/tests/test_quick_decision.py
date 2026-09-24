import pytest
from test_social import go, join, outing, setup_circle, start

from hatim.core.db import connect
from hatim.domain.models import Member, OutingContext, Preferences, Settings
from hatim.domain.planner import build_plan
from hatim.features.experiences.fixtures import CATALOG
from hatim.features.quick_decision.models import QuickRequest
from hatim.features.quick_decision.service import decide


def test_quick_duration_area_and_hard_constraints_are_applied_together():
    request = QuickRequest(
        members=[Preferences(name="أمل"), Preferences(name="بدر", budget=50)], minutes=60
    )
    result = decide(CATALOG, request)
    assert {c.experience_id for c in result.choices} == {"coffee", "dessert"}
    request.neighborhood = "حي الياسمين"
    assert [c.experience_id for c in decide(CATALOG, request).choices] == ["coffee"]
    request.members[1].allergies = ["حليب"]
    assert not decide(CATALOG, request).choices
    request.members[1].allergies = []
    request.minutes = 30
    assert not decide(CATALOG, request).choices


def test_quick_is_deterministic_limited_and_preserves_manual_pocket_and_history():
    request = QuickRequest(
        members=[Preferences(name="أمل", vegetarian=True)],
        minutes=120,
        excluded_ids=["fire", "sushi"],
    )
    a = decide(CATALOG, request)
    assert len(a.choices) == 3
    assert not {"fire", "sushi"} & {c.experience_id for c in a.choices}
    assert decide(list(reversed(CATALOG)), request) == a
    assert all("دقيقة" in c.reason for c in a.choices)


def test_context_is_soft_explained_and_cannot_override_anchor_or_safety():
    family = OutingContext(kind="family", priorities=["quiet", "sharing"])
    people = [Member(id="a", preferences=Preferences(name="أمل"))]
    plain = build_plan(CATALOG, people, Settings(slots=3, anchor_id=None))
    plan = build_plan(CATALOG, people, Settings(slots=3, anchor_id=None, context=family))
    assert plain.selected[0].experience_id == "fire"
    assert plan.selected[0].experience_id == "levant"
    assert "الطلعة العائلية" in plan.selected[0].reason
    anchored = build_plan(CATALOG, people, Settings(slots=1, anchor_id="sushi", context=family))
    assert anchored.selected[0].experience_id == "sushi"
    people[0].preferences.allergies = ["حليب"]
    blocked = build_plan(CATALOG, people, Settings(slots=1, anchor_id="sushi", context=family))
    assert blocked.anchor_issue and not blocked.selected
    # Unknown traits do not fabricate a context match.
    assert (
        "الطلعة"
        not in build_plan(
            [CATALOG[0].model_copy(update={"outing_traits": []})],
            [Member(id="b", preferences=Preferences(name="بدر"))],
            Settings(anchor_id=None, context=family),
        )
        .selected[0]
        .reason
    )


def test_quick_public_endpoint_reads_migrated_catalog_without_creating_plans(client):
    response = client.post(
        "/api/quick-decisions",
        json={
            "members": [{"name": "أمل"}],
            "minutes": 60,
            "context": {"kind": "family", "priorities": ["quiet", "sharing"]},
        },
    )
    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    assert response.json()["choices"][0]["experience_id"] == "levant"
    with connect(read_only=True) as db:
        assert db.execute("SELECT COUNT(*) AS n FROM groups").fetchone()["n"] == 0
        stored = db.execute("SELECT payload FROM experiences WHERE id='levant'").fetchone()[
            "payload"
        ]
        assert stored["outing_traits"] == ["quiet", "sharing"]
    catalog = client.get("/api/experiences").json()
    assert {e["id"]: e["outing_traits"] for e in catalog} == {
        e.id: e.outing_traits for e in CATALOG
    }


@pytest.mark.parametrize(
    "patch",
    [
        {"members": []},
        {"members": [{"name": "x"}] * 13},
        {"minutes": 0},
        {"minutes": 241},
        {"context": {"kind": "party"}},
        {"context": {"priorities": ["quiet", "quiet"]}},
        {"context": {"priorities": ["childcare"]}},
        {"neighborhood": ""},
    ],
)
def test_quick_rejects_invalid_requests(client, patch):
    assert (
        client.post(
            "/api/quick-decisions", json={"members": [{"name": "أمل"}], "minutes": 60, **patch}
        ).status_code
        == 422
    )


def test_direct_context_persists_invitation_is_private_and_expected_detects_conflict(client):
    context = {"kind": "friends", "priorities": ["discovery"]}
    created = client.post(
        "/api/groups",
        json={
            "preferences": {"name": "أمل", "vegetarian": True},
            "settings": {"slots": 3, "anchor_id": None, "context": context},
        },
    ).json()
    group = created["group"]
    auth = {"Authorization": "Bearer " + created["organizer_token"]}
    url = f"/api/groups/{group['id']}/settings"
    current = {**group["settings"], "context": {"kind": "family", "priorities": ["quiet"]}}
    saved = client.put(url, headers=auth, json={**current, "expected": group["settings"]})
    assert saved.status_code == 200
    assert client.get(f"/api/groups/{group['id']}", headers=auth).json()["settings"] == current
    assert (
        client.put(
            url, headers=auth, json={**group["settings"], "expected": group["settings"]}
        ).status_code
        == 409
    )
    public = client.get(f"/api/invites/{group['invite_code']}").json()
    assert public["context"] == current["context"]
    assert all(not d["adaptations"] for d in public["selected"])
    assert "vegetarian" not in str(public)


def test_outing_context_roles_isolation_round_invalidation_and_archive(client):
    owner, circle = setup_circle(client)
    guest, _ = join(client, circle)
    context = {"kind": "family", "priorities": ["quiet", "sharing"]}
    trip = client.post(
        f"/api/v2/groups/{circle['id']}/outings",
        headers=owner,
        json={"title": "عائلية", "context": context},
    ).json()
    other = outing(client, owner, circle)
    assert other["settings"]["context"] == {"kind": "any", "priorities": []}
    go(client, guest, trip)
    trip = start(client, owner, trip)
    revision = trip["planning_revision"]
    body = {
        "expected": trip["settings"],
        "settings": {
            **trip["settings"],
            "context": {"kind": "friends", "priorities": ["discovery"]},
        },
    }
    url = f"/api/v2/outings/{trip['id']}/settings"
    assert client.put(url, headers=guest, json=body).status_code == 403
    saved = client.put(url, headers=owner, json=body).json()
    assert saved["round"]["status"] == "invalidated"
    assert saved["planning_revision"] == revision + 1
    assert client.put(url, headers=owner, json=body).status_code == 409
    closed = client.post(f"/api/v2/outings/{trip['id']}/close", headers=owner).json()
    assert closed["settings"]["context"] == body["settings"]["context"]
    assert (
        client.put(
            url, headers=owner, json={"expected": closed["settings"], "settings": trip["settings"]}
        ).status_code
        == 409
    )
    assert client.get(f"/api/v2/outings/{other['id']}", headers=owner).json()["settings"][
        "context"
    ] == {"kind": "any", "priorities": []}
    with connect(read_only=True) as db:
        assert all(
            "context" not in row["preferences"]
            for row in db.execute("SELECT preferences FROM circle_members").fetchall()
        )


def test_old_direct_client_does_not_erase_context_when_updating_slots(client):
    context = {"kind": "family", "priorities": ["quiet"]}
    created = client.post(
        "/api/groups", json={"preferences": {"name": "أمل"}, "settings": {"context": context}}
    ).json()
    response = client.put(
        f"/api/groups/{created['group']['id']}/settings",
        headers={"Authorization": "Bearer " + created["organizer_token"]},
        json={"slots": 3, "anchor_id": "fire", "pocket_ids": [], "completed_ids": []},
    )
    assert response.status_code == 200
    assert response.json()["settings"]["context"] == context
