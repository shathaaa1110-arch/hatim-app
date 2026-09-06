from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

Cuisine = Literal["سعودي", "ياباني", "إيطالي", "شامي", "آسيوي", "قهوة وحلى"]
Allergen = Literal["مكسرات", "فول سوداني", "حليب", "قمح", "سمسم", "قشريات", "سمك", "بيض", "صويا"]
Category = Literal["مطابخ جديدة", "كنوز مخفية", "افتتاحات", "طبق ولحظة"]


class Model(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class Preferences(Model):
    name: str = Field(min_length=1, max_length=30)
    role: Literal["مقيم", "زائر"] = "مقيم"
    cuisines: list[Cuisine] = Field(default_factory=list, max_length=6)
    allergies: list[Allergen] = Field(default_factory=list, max_length=9)
    vegetarian: bool = False
    mild: bool = False
    budget: int = Field(default=200, ge=30, le=500)


class Member(Model):
    id: str
    preferences: Preferences
    organizer: bool = False


class Experience(Model):
    id: str
    title: str
    venue: str
    neighborhood: str
    category: Category
    cuisine: Cuisine
    description: str
    why: str
    image: str
    price: int
    minutes: int
    editorial: int
    vegetarian: bool = False
    vegetarian_option: str | None = None
    spicy: bool = False
    mild_option: str | None = None
    allergens: list[Allergen] = Field(default_factory=list)
    # Only allergens whose absence AND cross-contact handling were verified belong here.
    verified_free_of: list[Allergen] = Field(default_factory=list)


class Settings(Model):
    slots: int = Field(default=9, ge=1, le=9)
    anchor_id: str | None = "fire"
    pocket_ids: list[str] = Field(default_factory=list, max_length=30)
    completed_ids: list[str] = Field(default_factory=list, max_length=9)

    @model_validator(mode="after")
    def coherent(self):
        if len(set(self.completed_ids)) != len(self.completed_ids):
            raise ValueError("Repeated completed experience")
        if len(set(self.pocket_ids)) != len(self.pocket_ids):
            raise ValueError("Repeated pocket experience")
        if self.slots < len(self.completed_ids):
            raise ValueError("Consumed meal slots cannot disappear")
        if self.anchor_id in self.pocket_ids:
            raise ValueError("The anchor cannot be moved to the pocket")
        if set(self.pocket_ids) & set(self.completed_ids):
            raise ValueError("A completed experience cannot be in the pocket")
        return self


class Decision(Model):
    experience_id: str
    priority: Literal["ركيزة", "أساسية", "مرنة"]
    reason: str
    adaptations: list[str] = Field(default_factory=list)
    score: float


class PocketItem(Model):
    experience_id: str
    reason: str
    blocked: bool = False


class Plan(Model):
    selected: list[Decision]
    pocket: list[PocketItem]
    anchor_issue: str | None = None
    consumed: int
    available: int
    unfilled: int


class CreateGroup(Model):
    title: str = Field(default="لَمّتنا في الرياض", min_length=1, max_length=60)
    preferences: Preferences


class GroupView(Model):
    id: str
    title: str
    invite_code: str
    settings: Settings
    members: list[Member]
    plan: Plan


class GroupCreated(Model):
    organizer_token: str
    group: GroupView


class MemberCreated(Model):
    member_token: str
    member: Member


class InviteView(Model):
    title: str
    member_names: list[str]
    slots: int
    selected: list[Decision]
    anchor_issue: str | None = None
    consumed: int
