from pydantic import Field, SecretStr

from hatim.core.models import Model
from hatim.domain.models import Decision, Member, OutingContext, Plan, Preferences, Settings


class PlanSettingsChange(Settings):
    # Optional only for compatibility with earlier native builds.
    expected: Settings | None = None


class CreateGroup(Model):
    title: str = Field(default="لَمّتنا في الرياض", min_length=1, max_length=60)
    preferences: Preferences
    settings: Settings = Field(default_factory=Settings)


class GroupView(Model):
    id: str
    title: str
    owner_account_id: str | None = None
    invite_code: str
    settings: Settings
    members: list[Member]
    plan: Plan


class GroupCreated(Model):
    organizer_token: str | None
    group: GroupView


class PlanSummary(Model):
    id: str
    title: str
    slots: int
    consumed: int


class SaveToAccount(Model):
    owner_token: SecretStr


class MemberCreated(Model):
    member_token: str
    member: Member


class InviteView(Model):
    context: OutingContext = Field(default_factory=OutingContext)
    title: str
    member_names: list[str]
    slots: int
    selected: list[Decision]
    anchor_issue: str | None = None
    consumed: int
