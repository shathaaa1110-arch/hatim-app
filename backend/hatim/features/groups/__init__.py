from fastapi import APIRouter

from . import circles, outings, rounds, skins
from .sharing import authorize_share, shareable_plan

router = APIRouter()
for child in (circles.router, outings.router, rounds.router, skins.router):
    router.include_router(child)

__all__ = ["authorize_share", "router", "shareable_plan"]
