from fastapi import APIRouter

from . import circles, outings, rounds, skins

router = APIRouter()
for child in (circles.router, outings.router, rounds.router, skins.router):
    router.include_router(child)

__all__ = ["router"]
