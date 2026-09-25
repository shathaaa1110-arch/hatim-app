"""Allowlisted public projection. Never serialize source models into an invitation."""

from fastapi import HTTPException

from hatim.features import groups, planning
from hatim.features.experiences import catalog, maps_url

from .models import InvitationDetails, InvitationEditor, SharedExperience, SharedPlan

SOURCES = {"plan": planning, "outing": groups}
COLUMNS = {"plan": "plan_id", "outing": "outing_id"}


def authorize(db, kind, source_id, authorization, *, lock=False):
    SOURCES[kind].authorize_share(db, source_id, authorization, lock=lock)


def invitation_row(db, kind, source_id):
    # kind is a Literal validated by FastAPI; column names never come from user text.
    return db.execute(
        f"SELECT * FROM plan_invitations WHERE {COLUMNS[kind]}=%s", (source_id,)
    ).fetchone()


def project(db, kind, source_id):
    source = SOURCES[kind].shareable_plan(db, source_id)
    entries = {e.id: e for e in catalog(db)}
    public_entries = []
    for decision in source.plan.selected:
        e = entries.get(decision.experience_id)
        if e is None:
            raise HTTPException(409, "تغيّر الكتالوج؛ راجع الخطة قبل مشاركتها.")
        public_entries.append(
            SharedExperience(
                id=e.id,
                title=e.title,
                venue=e.venue,
                neighborhood=e.neighborhood,
                cuisine=e.cuisine,
                image=e.image,
                price=e.price,
                minutes=e.minutes,
                priority=decision.priority,
                reason="ركيزة اختارها منظّم الطلعة؛ تبقى عند تقليص الخانات."
                if decision.priority == "ركيزة"
                else e.why,
                dishes=e.suggested_dishes,
                options=[option for option in (e.vegetarian_option, e.mild_option) if option],
                is_demo=e.is_demo,
                maps_url=maps_url(e),
                maps_verified=not e.is_demo and e.google_place_id is not None,
            )
        )
    return source.title, SharedPlan(
        context=source.settings.context,
        entries=public_entries,
        consumed=source.plan.consumed,
        available=source.plan.available,
        unfilled=source.plan.unfilled,
        anchor_unavailable=bool(source.plan.anchor_issue),
        archived=source.archived,
    )


def editor(db, kind, source_id):
    title, plan = project(db, kind, source_id)
    row = invitation_row(db, kind, source_id)
    return InvitationEditor(
        details=InvitationDetails.model_validate(row["details"])
        if row
        else InvitationDetails(title=title),
        plan=plan,
        code=row["code"] if row else None,
        revision=row["revision"] if row else None,
    )
