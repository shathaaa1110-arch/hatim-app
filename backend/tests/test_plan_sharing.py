from concurrent.futures import ThreadPoolExecutor
from http.client import HTTPException as HTTPClientError
from urllib.parse import parse_qs, urlparse

import pytest
from test_api import create
from test_social import account, join, outing, setup_circle

from hatim.core.db import connect
from hatim.features.experiences import catalog, maps_url, ratings


def save(client, path, auth, revision=None, **details):
    return client.put(
        path,
        headers=auth,
        json={
            "details": {"title": "دعوة الخميس", **details},
            "expected_revision": revision,
        },
    )


def test_direct_invitation_live_private_revocable_and_cascade(client):
    group, auth = create(client)
    path = f"/api/plan-invitations/plan/{group['id']}"
    assert client.get(path).status_code == 404
    assert client.get(path, headers=auth).json()["code"] is None
    member = client.post(
        f"/api/invites/{group['invite_code']}/members",
        json={
            "name": "PRIVATE_MEMBER_123",
            "allergies": ["حليب"],
        },
    ).json()
    member_auth = {"Authorization": "Bearer " + member["member_token"]}
    assert save(client, path, member_auth).status_code == 404
    result = save(client, path, auth)
    assert result.status_code == 200, result.text
    invitation = result.json()
    public_path = f"/api/shared-plans/{invitation['code']}"
    public = client.get(public_path)
    assert public.headers["cache-control"] == "no-store"
    assert public.json()["plan"]["anchor_unavailable"] is True
    for secret in (
        "PRIVATE_MEMBER_123",
        "حليب",
        "preferences",
        "members",
        "anchor_issue",
        "pocket",
        "token",
        group["invite_code"],
        member["member_token"],
    ):
        assert secret not in public.text
    # Removing the hard constraint restores only the source planner's chosen experiences.
    client.delete(f"/api/groups/{group['id']}/members/{member['member']['id']}", headers=auth)
    client.put(f"/api/groups/{group['id']}/settings", headers=auth, json={"slots": 1})
    plan = client.get(public_path).json()["plan"]
    assert [e["id"] for e in plan["entries"]] == ["fire"]
    assert plan["entries"][0]["dishes"]
    client.put(
        f"/api/groups/{group['id']}/settings",
        headers=auth,
        json={"slots": 1, "completed_ids": ["fire"]},
    )
    plan = client.get(public_path).json()["plan"]
    assert plan["entries"] == [] and plan["consumed"] == 1 and plan["available"] == 0
    revised = save(client, path, auth, invitation["revision"], theme="rose").json()
    assert revised["code"] == invitation["code"]
    assert save(client, path, auth, invitation["revision"]).status_code == 409
    assert (
        client.request(
            "DELETE", path, headers=auth, json={"expected_revision": revised["revision"]}
        ).status_code
        == 200
    )
    assert client.get(public_path).status_code == 404
    fresh = save(client, path, auth).json()
    assert fresh["code"] != invitation["code"] and fresh["revision"] > revised["revision"]
    assert save(client, path, auth, revised["revision"]).status_code == 409
    assert (
        client.request(
            "DELETE", path, headers=auth, json={"expected_revision": revised["revision"]}
        ).status_code
        == 409
    )
    client.delete(f"/api/groups/{group['id']}", headers=auth)
    assert client.get(f"/api/shared-plans/{fresh['code']}").status_code == 404
    with connect(read_only=True) as db:
        assert db.execute("SELECT count(*) AS n FROM plan_invitations").fetchone()["n"] == 0


def test_invitation_concurrent_edits_and_invalid_input(client):
    group, auth = create(client)
    path = f"/api/plan-invitations/plan/{group['id']}"
    with ThreadPoolExecutor(max_workers=2) as pool:
        responses = list(pool.map(lambda _: save(client, path, auth), range(2)))
    assert sorted(r.status_code for r in responses) == [200, 409]
    saved = next(r.json() for r in responses if r.status_code == 200)
    with ThreadPoolExecutor(max_workers=2) as pool:
        responses = list(
            pool.map(
                lambda n: save(client, path, auth, saved["revision"], title=f"دعوة {n}"), range(2)
            )
        )
    assert sorted(r.status_code for r in responses) == [200, 409]
    for details in (
        {"theme": "unknown"},
        {"title": " "},
        {"message": "x" * 201},
        {"when_label": "x" * 81},
    ):
        assert save(client, path, auth, **details).status_code == 422
    assert client.get("/api/plan-invitations/anything/id", headers=auth).status_code == 422


def test_outing_permissions_transfer_archive_and_removal(client):
    owner, circle = setup_circle(client)
    member, member_id = join(client, circle)
    outsider, _ = account(client, "outside")
    trip = outing(client, owner, circle)
    path = f"/api/plan-invitations/outing/{trip['id']}"
    assert save(client, path, member).status_code == 403
    assert save(client, path, outsider).status_code == 404
    client.put(
        f"/api/v2/outings/{trip['id']}/coordinator", headers=owner, json={"member_id": member_id}
    )
    shared = save(client, path, member).json()
    assert client.get(path, headers=owner).status_code == 200
    client.post(f"/api/v2/outings/{trip['id']}/close", headers=owner)
    public_path = f"/api/shared-plans/{shared['code']}"
    public = client.get(public_path).json()
    assert public["plan"]["archived"] is True
    assert "participants" not in public and "skin" not in str(public)
    assert save(client, path, member, shared["revision"], message="ذكريات").status_code == 200
    client.post(f"/api/v2/groups/{circle['id']}/members/{member_id}/remove", headers=owner)
    assert client.get(path, headers=member).status_code == 404
    assert client.get(path, headers=owner).status_code == 200


def test_upgraded_direct_plan_invitation_stops_working(client):
    group, auth = create(client)
    path = f"/api/plan-invitations/plan/{group['id']}"
    shared = save(client, path, auth).json()
    owner, _ = account(client)
    result = client.post(
        "/api/v2/legacy/claim",
        headers=owner,
        json={
            "group_id": group["id"],
            "owner_token": auth["Authorization"][7:],
        },
    )
    assert result.status_code == 200, result.text
    assert client.get(f"/api/shared-plans/{shared['code']}").status_code == 404


def test_maps_and_demo_rating_never_invent_a_place(client, monkeypatch):
    with connect(read_only=True) as db:
        experience = catalog(db)[0]
    monkeypatch.setattr(
        ratings, "provider_request", lambda *_: pytest.fail("Demo must not call Google")
    )
    assert ratings.fetch_rating(experience).status == "demo"
    query = parse_qs(urlparse(maps_url(experience)).query)
    assert query["api"] == ["1"] and "query_place_id" not in query
    real = experience.model_copy(update={"is_demo": False, "google_place_id": "ChIJ_verified"})
    assert parse_qs(urlparse(maps_url(real)).query)["query_place_id"] == ["ChIJ_verified"]
    assert (
        client.get(f"/api/v2/experiences/{experience.id}/google-rating").json()["status"] == "demo"
    )
    assert client.get("/api/v2/experiences/missing/google-rating").status_code == 404


def test_google_rating_available_missing_key_and_budget(client, monkeypatch):
    with connect(read_only=True) as db:
        real = catalog(db)[0].model_copy(
            update={"is_demo": False, "google_place_id": "ChIJ_verified"}
        )
    ratings._requests.clear()
    monkeypatch.delenv("GOOGLE_PLACES_API_KEY", raising=False)
    assert ratings.fetch_rating(real).status == "unavailable"
    assert (
        ratings.fetch_rating(real.model_copy(update={"google_place_id": None})).status == "unlinked"
    )
    monkeypatch.setenv("GOOGLE_PLACES_API_KEY", "test-key")
    calls = []

    def provider(place, key):
        calls.append((place, key))
        return {
            "id": place,
            "rating": 4.6,
            "userRatingCount": 123,
            "attributions": [{"provider": "Provider", "providerUri": "https://example.com"}],
        }

    monkeypatch.setattr(ratings, "provider_request", provider)
    result = ratings.fetch_rating(real)
    assert result.status == "available" and result.rating == 4.6 and result.review_count == 123
    assert result.checked_at and "test-key" not in result.model_dump_json()
    for _ in range(19):
        assert ratings.fetch_rating(real).status == "available"
    assert ratings.fetch_rating(real).status == "unavailable" and len(calls) == 20
    ratings._requests.clear()


@pytest.mark.parametrize(
    "payload",
    [
        None,
        [],
        {"id": "wrong", "rating": 4},
        {"id": "ChIJ_verified", "rating": 8},
        {"id": "ChIJ_verified", "rating": 4, "attributions": [{}]},
        OSError(),
        HTTPClientError(),
    ],
)
def test_google_failures_are_unavailable_not_fake_ratings(client, monkeypatch, payload):
    with connect(read_only=True) as db:
        real = catalog(db)[0].model_copy(
            update={"is_demo": False, "google_place_id": "ChIJ_verified"}
        )
    ratings._requests.clear()
    monkeypatch.setenv("GOOGLE_PLACES_API_KEY", "test-key")

    def provider(*_):
        if isinstance(payload, Exception):
            raise payload
        return payload

    monkeypatch.setattr(ratings, "provider_request", provider)
    assert ratings.fetch_rating(real).status == "unavailable"
    ratings._requests.clear()
