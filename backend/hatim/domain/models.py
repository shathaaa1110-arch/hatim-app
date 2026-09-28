from typing import Annotated, Literal

from pydantic import Field, model_validator

from hatim.core.models import Model

Cuisine = Literal["سعودي", "ياباني", "إيطالي", "شامي", "آسيوي", "قهوة وحلى"]
Allergen = Literal["مكسرات", "فول سوداني", "حليب", "قمح", "سمسم", "قشريات", "سمك", "بيض", "صويا"]
Category = Literal["مطابخ جديدة", "كنوز مخفية", "افتتاحات", "طبق ولحظة"]
OutingPriority = Literal["quiet", "sharing", "discovery"]


class OutingContext(Model):
    kind: Literal["any", "family", "friends"] = "any"
    priorities: list[OutingPriority] = Field(default_factory=list, max_length=3)

    @model_validator(mode="after")
    def unique_priorities(self):
        if len(set(self.priorities)) != len(self.priorities):
            raise ValueError("Repeated outing priority")
        return self


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
    outing_traits: list[OutingPriority] = Field(default_factory=list)
    suggested_dishes: list[Annotated[str, Field(min_length=1, max_length=100)]] = Field(
        default_factory=list, max_length=5
    )
    google_place_id: str | None = Field(default=None, pattern=r"^[A-Za-z0-9_-]{3,255}$")
    is_demo: bool = True


class Settings(Model):
    slots: int = Field(default=9, ge=1, le=9)
    anchor_id: str | None = "fire"
    pocket_ids: list[str] = Field(default_factory=list, max_length=30)
    completed_ids: list[str] = Field(default_factory=list, max_length=9)
    context: OutingContext = Field(default_factory=OutingContext)

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
        if any(not value for value in self.pocket_ids + self.completed_ids):
            raise ValueError("Experience IDs must not be empty")
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


class ShareablePlan(Model):
    """Feature boundary for sharing; never carries accounts, tokens or member profiles."""

    title: str
    settings: Settings
    plan: Plan
    archived: bool = False
