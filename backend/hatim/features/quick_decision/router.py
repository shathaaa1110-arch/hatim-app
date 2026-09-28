from fastapi import APIRouter

from hatim.core.db import connect
from hatim.features.experiences import catalog

from .models import QuickRequest, QuickResult
from .service import decide

router = APIRouter(prefix="/api", tags=["Quick decision"])


@router.post("/quick-decisions", response_model=QuickResult)
def quick_decision(body: QuickRequest):
    with connect(read_only=True) as db:
        return decide(catalog(db), body)
