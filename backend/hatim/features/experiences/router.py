from fastapi import APIRouter

from hatim.core.db import connect
from hatim.domain.models import Experience

from .ratings import router as ratings_router
from .repository import catalog

router = APIRouter()
router.include_router(ratings_router)


@router.get("/api/experiences", response_model=list[Experience])
@router.get("/api/v2/experiences", response_model=list[Experience], tags=["Circles"])
def experiences():
    with connect(read_only=True) as db:
        return catalog(db)
