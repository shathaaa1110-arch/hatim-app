import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from hatim.domain.models import Member, Plan, Preferences, Settings
from hatim.domain.planner import build_plan, evaluate
from hatim.features.experiences.fixtures import CATALOG

CASES = json.loads((Path(__file__).parent / "fixtures" / "planner-parity.json").read_text())


@pytest.mark.parametrize("case", CASES, ids=[str(index) for index in range(len(CASES))])
def test_existing_decisions_are_preserved(case):
    people = [Member.model_validate(member) for member in case["members"]]
    settings = Settings.model_validate(case["settings"])
    assert build_plan(CATALOG, people, settings) == Plan.model_validate(case["plan"])


def member(**kwargs):
    return Member(id="a", preferences=Preferences(name="أمل", **kwargs))


def test_shrinking_is_a_nested_prefix_and_every_experience_is_accounted_for():
    people = [member(cuisines=["ياباني", "سعودي"])]
    complete = build_plan(CATALOG, people, Settings(slots=9))
    for slots in range(1, 10):
        plan = build_plan(CATALOG, people, Settings(slots=slots))
        assert plan.selected == complete.selected[:slots]
        assert plan.selected[0].experience_id == "fire"
        ids = [d.experience_id for d in plan.selected] + [p.experience_id for p in plan.pocket]
        assert len(ids) == len(set(ids)) == len(CATALOG)


def test_allergy_never_becomes_an_ingredient_removal_workaround():
    plan = build_plan(CATALOG, [member(allergies=["حليب"])], Settings(slots=1))
    assert not plan.selected
    assert plan.anchor_issue
    assert len(plan.pocket) == len(CATALOG)
    assert all(item.blocked for item in plan.pocket)
    assert any("غير موثّقة" in item.reason for item in plan.pocket)


def test_only_explicit_cross_contact_verification_allows_an_allergy():
    meal = CATALOG[0].model_copy(update={"verified_free_of": ["مكسرات"]})
    assert evaluate(meal, [member(allergies=["مكسرات"])])[0] == []
    # A contradictory allergen declaration wins over the free-of list.
    meal = meal.model_copy(update={"allergens": ["مكسرات"]})
    assert evaluate(meal, [member(allergies=["مكسرات"])])[0]


def test_vegetarian_gets_a_concrete_adaptation_without_losing_the_anchor():
    plan = build_plan(CATALOG, [member(vegetarian=True)], Settings(slots=1))
    assert plan.selected[0].experience_id == "fire"
    assert "قرنبيط" in plan.selected[0].adaptations[0]
    assert not plan.anchor_issue


def test_the_lowest_members_budget_is_hard_and_blocked_anchor_is_not_replaced():
    people = [member(budget=200), Member(id="b", preferences=Preferences(name="بدر", budget=100))]
    plan = build_plan(CATALOG, people, Settings(slots=1))
    assert plan.selected == []
    assert "بدر" in plan.anchor_issue
    assert plan.unfilled == 1
    expanded = build_plan(CATALOG, people, Settings(slots=3))
    assert len(expanded.selected) == 2
    assert expanded.unfilled == 1


def test_soft_preference_has_a_workaround_and_does_not_exclude():
    bao = next(x for x in CATALOG if x.id == "bao")
    blocked, adaptations, _ = evaluate(bao, [member(mild=True)])
    assert not blocked
    assert "على الجانب" in adaptations[0]


def test_manual_pocket_is_preserved_when_time_expands():
    for slots in (1, 9):
        plan = build_plan(CATALOG, [member()], Settings(slots=slots, pocket_ids=["sushi"]))
        assert "sushi" not in [d.experience_id for d in plan.selected]
        assert "لوقت ثاني" in next(p.reason for p in plan.pocket if p.experience_id == "sushi")


def test_consumed_slots_do_not_come_back_or_duplicate_experiences():
    plan = build_plan(CATALOG, [member()], Settings(slots=2, completed_ids=["fire"]))
    assert plan.consumed == 1 and plan.available == 1 and len(plan.selected) == 1
    assert "fire" not in [d.experience_id for d in plan.selected] + [
        p.experience_id for p in plan.pocket
    ]
    with pytest.raises(ValidationError):
        Settings(slots=1, completed_ids=["fire", "sushi"])
    with pytest.raises(ValidationError):
        Settings(pocket_ids=["fire"])
    with pytest.raises(ValidationError):
        Settings(completed_ids=["sushi", "sushi"])


def test_ranking_is_independent_of_member_order():
    people = [
        member(cuisines=["سعودي"], role="زائر"),
        Member(id="b", preferences=Preferences(name="بدر", cuisines=["ياباني"])),
    ]
    a = build_plan(CATALOG, people, Settings())
    b = build_plan(CATALOG, list(reversed(people)), Settings())
    assert [d.experience_id for d in a.selected] == [d.experience_id for d in b.selected]
