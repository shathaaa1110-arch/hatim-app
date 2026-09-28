from fastapi import HTTPException

from hatim.domain.models import ShareablePlan
from hatim.integrations.legacy_plans import reject_upgraded_write

from .service import group_model, require_owner


def authorize_share(db, source_id, authorization, *, lock=False):
    require_owner(db, source_id, authorization, lock=lock)
    reject_upgraded_write(db, source_id)


def shareable_plan(db, source_id):
    row = db.execute("SELECT * FROM groups WHERE id=%s", (source_id,)).fetchone()
    if row is None:
        raise HTTPException(404, "الخطة غير متاحة.")
    reject_upgraded_write(db, source_id)
    group = group_model(db, row)
    return ShareablePlan(title=group.title, settings=group.settings, plan=group.plan)
