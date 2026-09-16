from fastapi import APIRouter

from . import circles, outings, rounds

router = APIRouter()
for child in (circles.router, outings.router, rounds.router):
    router.include_router(child)

__all__ = ["router"]
