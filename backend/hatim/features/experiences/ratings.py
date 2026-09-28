"""On-demand Google ratings. No provider content is persisted or exported to PDF."""

import json
import os
import time
from collections import deque
from datetime import UTC, datetime
from http.client import HTTPException as HTTPClientError
from http.client import HTTPSConnection
from threading import Lock
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import Field, ValidationError

from hatim.core.db import connect
from hatim.core.models import Model

from .repository import catalog

router = APIRouter(tags=["Experiences"])
_requests: deque[float] = deque()
_lock = Lock()


class RatingAttribution(Model):
    provider: str = Field(max_length=200)
    provider_uri: str = Field(pattern=r"^https://", max_length=2048)


class GoogleRating(Model):
    status: Literal["available", "demo", "unlinked", "unavailable"]
    rating: float | None = Field(default=None, ge=1, le=5)
    review_count: int | None = Field(default=None, ge=0)
    checked_at: str | None = None
    attributions: list[RatingAttribution] = Field(default_factory=list)


def provider_request(place_id: str, key: str):
    # Fixed HTTPS host; redirects are not followed and the key is never in a URL/log.
    connection = HTTPSConnection("places.googleapis.com", timeout=3)
    try:
        connection.request(
            "GET",
            f"/v1/places/{place_id}",
            headers={
                "X-Goog-Api-Key": key,
                "X-Goog-FieldMask": "id,rating,userRatingCount,attributions",
            },
        )
        response = connection.getresponse()
        payload = response.read(65537)
        if response.status != 200 or len(payload) > 65536:
            return None
        return json.loads(payload)
    finally:
        connection.close()


def fetch_rating(experience):
    if experience.is_demo:
        return GoogleRating(status="demo")
    if experience.google_place_id is None:
        return GoogleRating(status="unlinked")
    key = os.getenv("GOOGLE_PLACES_API_KEY")
    if not key:
        return GoogleRating(status="unavailable")
    # Bound anonymous provider spending per process. Set a project quota in Google too.
    with _lock:
        now = time.monotonic()
        while _requests and _requests[0] < now - 60:
            _requests.popleft()
        if len(_requests) >= 20:
            return GoogleRating(status="unavailable")
        _requests.append(now)
    try:
        data = provider_request(experience.google_place_id, key)
        if (
            not isinstance(data, dict)
            or data.get("id") != experience.google_place_id
            or data.get("rating") is None
        ):
            return GoogleRating(status="unavailable")
        return GoogleRating(
            status="available",
            rating=data["rating"],
            review_count=data.get("userRatingCount"),
            checked_at=datetime.now(UTC).isoformat(),
            attributions=[
                RatingAttribution(provider=a["provider"], provider_uri=a["providerUri"])
                for a in data.get("attributions", [])
            ],
        )
    except OSError, ValueError, TypeError, KeyError, ValidationError, HTTPClientError:
        return GoogleRating(status="unavailable")


@router.get("/api/v2/experiences/{experience_id}/google-rating", response_model=GoogleRating)
def google_rating(experience_id: str):
    with connect(read_only=True) as db:
        experience = next((e for e in catalog(db) if e.id == experience_id), None)
    if experience is None:
        raise HTTPException(404, "التجربة غير موجودة.")
    return fetch_rating(experience)
