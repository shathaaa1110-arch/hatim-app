from fastapi import HTTPException

from hatim.domain.models import Settings, ShareablePlan
from hatim.features.accounts import current_account

from .domain import manage_outing, outing_access, planning


def authorize_share(db, source_id, authorization, *, lock=False):
    token = authorization[7:] if authorization and authorization.startswith("Bearer ") else ""
    user = current_account(token)
    circle, me, outing = outing_access(db, source_id, user.id, lock=lock)
    manage_outing(circle, me, outing)


def shareable_plan(db, source_id):
    outing = db.execute("SELECT * FROM outings WHERE id=%s", (source_id,)).fetchone()
    if outing is None:
        raise HTTPException(404, "الطلعة غير متاحة.")
    _, _, plan, _ = planning(db, outing)
    return ShareablePlan(
        title=outing["title"],
        settings=Settings.model_validate(outing["settings"]),
        plan=plan,
        archived=outing["status"] == "closed",
    )
