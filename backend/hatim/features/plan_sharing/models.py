from typing import Literal

from pydantic import Field

from hatim.core.models import Model
from hatim.domain.models import OutingContext

SourceKind = Literal["plan", "outing"]


class InvitationDetails(Model):
    title: str = Field(min_length=1, max_length=60)
    message: str = Field(default="لكم مكان على الطاولة.", max_length=200)
    when_label: str = Field(default="", max_length=80)
    meeting_note: str = Field(default="", max_length=100)
    theme: Literal["palm", "saffron", "rose"] = "palm"


class InvitationChange(Model):
    details: InvitationDetails
    expected_revision: int | None = Field(ge=1)


class InvitationRevoke(Model):
    expected_revision: int = Field(ge=1)


class SharedExperience(Model):
    id: str
    title: str
    venue: str
    neighborhood: str
    cuisine: str
    image: str
    price: int
    minutes: int
    priority: Literal["ركيزة", "أساسية", "مرنة"]
    reason: str
    dishes: list[str]
    options: list[str]
    is_demo: bool
    maps_url: str
    maps_verified: bool


class SharedPlan(Model):
    context: OutingContext
    entries: list[SharedExperience]
    consumed: int
    available: int
    unfilled: int
    anchor_unavailable: bool
    archived: bool


class PublicInvitation(Model):
    details: InvitationDetails
    plan: SharedPlan
    read_at: str
    created_at: str


class InvitationEditor(Model):
    details: InvitationDetails
    plan: SharedPlan
    code: str | None
    revision: int | None
