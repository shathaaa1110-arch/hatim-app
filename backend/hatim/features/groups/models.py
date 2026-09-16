from typing import Literal

from pydantic import Field, SecretStr, model_validator

from hatim.core.models import Model, TitleChange
from hatim.domain.models import Plan, Preferences, Settings


class CircleCreate(Model):
    title: str = Field(min_length=1, max_length=60)
    preferences: Preferences


class CircleJoin(Model):
    preferences: Preferences
    legacy_token: SecretStr | None = None


class LegacyClaim(Model):
    group_id: str
    owner_token: SecretStr


class MembershipOptions(Model):
    pinned: bool | None = None
    fun_opt_in: bool | None = None

    @model_validator(mode="after")
    def nonempty(self):
        if self.pinned is None and self.fun_opt_in is None:
            raise ValueError("Choose a membership option")
        return self


class CircleSummary(Model):
    id: str
    title: str
    member_count: int
    pinned: bool
    is_owner: bool
    archived: bool


class CircleMember(Model):
    id: str
    name: str
    is_owner: bool
    is_me: bool
    claimed: bool
    status: Literal["active", "removed"]
    fun_opt_in: bool
    preferences: Preferences | None = None


class OutingSummary(Model):
    id: str
    title: str
    status: Literal["open", "closed"]
    going: int
    slots: int
    coordinator_name: str


class CircleView(Model):
    id: str
    title: str
    invite_code: str
    is_owner: bool
    archived: bool
    me: CircleMember
    pinned: bool
    members: list[CircleMember]
    outings: list[OutingSummary]


class PublicCircle(Model):
    id: str
    title: str
    member_count: int


class OutingCreate(TitleChange):
    slots: int = Field(default=3, ge=1, le=9)
    coordinator_id: str | None = Field(default=None, min_length=1)


class AttendanceChange(Model):
    attendance: Literal["pending", "going", "declined"]
    budget_override: int | None = Field(default=None, ge=30, le=500)


class MemberSelection(Model):
    member_id: str


class SettingsChange(Model):
    settings: Settings
    expected: Settings


class Participant(Model):
    member_id: str
    name: str
    attendance: Literal["pending", "going", "declined"]
    is_me: bool
    is_coordinator: bool
    is_owner: bool
    fun_opt_in: bool
    claimed: bool
    fun_used: bool
    preferences: Preferences | None = None
    budget_override: int | None = None


class RoundCreate(Model):
    mode: Literal["vote", "draw"]
    experience_ids: list[str] = Field(min_length=1, max_length=5)

    @model_validator(mode="after")
    def unique_options(self):
        if len(set(self.experience_ids)) != len(self.experience_ids):
            raise ValueError("Repeated choice")
        return self


class VoteChange(Model):
    experience_id: str


class RoundOption(Model):
    experience_id: str
    votes: int


class RoundView(Model):
    id: str
    mode: Literal["vote", "draw"]
    status: Literal["open", "tied", "resolved", "invalidated"]
    options: list[RoundOption]
    my_vote: str | None
    voter_count: int
    voted_count: int
    can_vote: bool
    result_id: str | None
    resolved_by: Literal["vote", "draw", "only_option"] | None
    resolved_at: str | None


class FunCard(Model):
    target_id: str
    target_name: str
    remaining_seconds: int


class OutingView(Model):
    id: str
    circle_id: str
    title: str
    owner_name: str
    coordinator_name: str
    coordinator_id: str
    status: Literal["open", "closed"]
    settings: Settings
    plan: Plan
    participants: list[Participant]
    my_member_id: str
    can_manage: bool
    is_owner: bool
    eligible_ids: list[str]
    round: RoundView | None
    cards: list[FunCard]
    planning_revision: int
