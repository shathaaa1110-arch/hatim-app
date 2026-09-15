# شرح `backend/tests/test_planner.py`

[فهرس الكود](README.ar.md) · [دروس البداية](../README.ar.md) · [قاموس الرموز](../01-foundations.ar.md) · [التنسيق](../08-components.ar.md)

المصدر: [الملف في النسخة المرجعية](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/tests/test_planner.py) · [الملف المحلي](../../../backend/tests/test_planner.py). عدد الأسطر: 106. المقاطع التالية تعرض المصدر نفسه دون تعديل، والشرح خارج الكود.

## اختبار منطق بلا HTTP

[الأسطر 1–10](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/tests/test_planner.py#L1): نستورد build_plan و evaluate والنماذج والكتالوج. اختبارات هذه الوحدة تستدعي الدوال مباشرة؛ لا تحتاج قاعدة لمجرد حساب خطة.

```python
import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from hatim.catalog import CATALOG
from hatim.models import Member, Plan, Preferences, Settings
from hatim.planner import build_plan, evaluate

```

## بيانات مرجعية

[الأسطر 11–13](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/tests/test_planner.py#L11): CASES تقرأ ملف 180 حالة محفوظة. Path يبني المسار بالنسبة للاختبار، و json.loads يحول النص إلى قوائم وكائنات.

```python
CASES = json.loads((Path(__file__).parent / "fixtures" / "planner-parity.json").read_text())


```

## المقارنة بالحالات السابقة

[الأسطر 14–20](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/tests/test_planner.py#L14): parametrize تحول كل case إلى اختبار مستقل. نتحقق من صحة بيانات fixture عبر Pydantic ثم نقارن Plan كاملة بنتيجة محفوظة. هذا يحمي التوافق لكنه لا يثبت وحده صحة القواعد؛ لذلك توجد اختبارات خصائص أدناه.

```python
@pytest.mark.parametrize("case", CASES, ids=[str(index) for index in range(len(CASES))])
def test_existing_decisions_are_preserved(case):
    people = [Member.model_validate(member) for member in case["members"]]
    settings = Settings.model_validate(case["settings"])
    assert build_plan(CATALOG, people, settings) == Plan.model_validate(case["plan"])


```

## عضو اختباري

[الأسطر 21–24](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/tests/test_planner.py#L21): **kwargs تسمح بتمرير تفضيلات مختلفة مع اسم ثابت. يقلل التكرار من دون إخفاء القيد الذي يختبره كل سيناريو.

```python
def member(**kwargs):
    return Member(id="a", preferences=Preferences(name="أمل", **kwargs))


```

## التقلص لا يعيد الخلط

[الأسطر 25–35](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/tests/test_planner.py#L25): نتحقق أن كل خطة أصغر تساوي مقدمة الخطة الكبيرة عند ثبات الأعضاء والإعدادات الأخرى. نجمع معرفات المختار والجيب للتأكد أن لا تجربة ضاعت أو تكررت.

```python
def test_shrinking_is_a_nested_prefix_and_every_experience_is_accounted_for():
    people = [member(cuisines=["ياباني", "سعودي"])]
    complete = build_plan(CATALOG, people, Settings(slots=9))
    for slots in range(1, 10):
        plan = build_plan(CATALOG, people, Settings(slots=slots))
        assert plan.selected == complete.selected[:slots]
        assert plan.selected[0].experience_id == "fire"
        ids = [d.experience_id for d in plan.selected] + [p.experience_id for p in plan.pocket]
        assert len(ids) == len(set(ids)) == len(CATALOG)


```

## الحساسية ليست تعديل مكون

[الأسطر 36–44](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/tests/test_planner.py#L36): حساسية مع غياب التوثيق تمنع الترشيح وتعلق الركيزة. assert all يفحص جميع عناصر الجيب.

```python
def test_allergy_never_becomes_an_ingredient_removal_workaround():
    plan = build_plan(CATALOG, [member(allergies=["حليب"])], Settings(slots=1))
    assert not plan.selected
    assert plan.anchor_issue
    assert len(plan.pocket) == len(CATALOG)
    assert all(item.blocked for item in plan.pocket)
    assert any("غير موثّقة" in item.reason for item in plan.pocket)


```

## التوثيق والتناقض

[الأسطر 45–52](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/tests/test_planner.py#L45): ننشئ نسخة Experience للتجربة الاختبارية فقط. غياب موثق يسمح؛ تصريح وجود المادة نفسها يمنع حتى لو وضعت في verified_free_of أيضًا.

```python
def test_only_explicit_cross_contact_verification_allows_an_allergy():
    meal = CATALOG[0].model_copy(update={"verified_free_of": ["مكسرات"]})
    assert evaluate(meal, [member(allergies=["مكسرات"])])[0] == []
    # A contradictory allergen declaration wins over the free-of list.
    meal = meal.model_copy(update={"allergens": ["مكسرات"]})
    assert evaluate(meal, [member(allergies=["مكسرات"])])[0]


```

## مخرج نباتي ملموس

[الأسطر 53–59](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/tests/test_planner.py#L53): نتأكد أن الركيزة باقية مع نص خيار القرنبيط، لا مجرد كلمة يناسب النباتي.

```python
def test_vegetarian_gets_a_concrete_adaptation_without_losing_the_anchor():
    plan = build_plan(CATALOG, [member(vegetarian=True)], Settings(slots=1))
    assert plan.selected[0].experience_id == "fire"
    assert "قرنبيط" in plan.selected[0].adaptations[0]
    assert not plan.anchor_issue


```

## ميزانية أضعف قدرة

[الأسطر 60–70](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/tests/test_planner.py#L60): مجموعة بميزانيتين توضح أن سقف الشخص الأقل يمنع الركيزة. مع خانة واحدة لا يستبدلها، ومع 3 خانات يختار 2 ويحجز واحدة للمشكلة.

```python
def test_the_lowest_members_budget_is_hard_and_blocked_anchor_is_not_replaced():
    people = [member(budget=200), Member(id="b", preferences=Preferences(name="بدر", budget=100))]
    plan = build_plan(CATALOG, people, Settings(slots=1))
    assert plan.selected == []
    assert "بدر" in plan.anchor_issue
    assert plan.unfilled == 1
    expanded = build_plan(CATALOG, people, Settings(slots=3))
    assert len(expanded.selected) == 2
    assert expanded.unfilled == 1


```

## تفضيل الحار

[الأسطر 71–77](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/tests/test_planner.py#L71): evaluate للباو مع mild تنتج تعديلًا دون منع. الاختبار يطابق قاعدة مرنة محددة، لا يفترض جميع التفضيلات قيودًا صلبة.

```python
def test_soft_preference_has_a_workaround_and_does_not_exclude():
    bao = next(x for x in CATALOG if x.id == "bao")
    blocked, adaptations, _ = evaluate(bao, [member(mild=True)])
    assert not blocked
    assert "على الجانب" in adaptations[0]


```

## الجيب اليدوي مستقل عن التوسع

[الأسطر 78–84](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/tests/test_planner.py#L78): التجربة المحفوظة يدويًا لا تعود إلى selected عند زيادة السعة. تستمر رسالة الحفظ لوقت آخر.

```python
def test_manual_pocket_is_preserved_when_time_expands():
    for slots in (1, 9):
        plan = build_plan(CATALOG, [member()], Settings(slots=slots, pocket_ids=["sushi"]))
        assert "sushi" not in [d.experience_id for d in plan.selected]
        assert "لوقت ثاني" in next(p.reason for p in plan.pocket if p.experience_id == "sushi")


```

## المكتمل والاتساق

[الأسطر 85–98](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/tests/test_planner.py#L85): المكتمل يستهلك خانة ويختفي من المختار والجيب. pytest.raises يتوقع فشل Settings غير المتسقة: خانات أقل من المكتمل، الركيزة في الجيب، أو تكرار مكتمل.

```python
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


```

## ترتيب الأشخاص

[الأسطر 99–106](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/tests/test_planner.py#L99): نعكس قائمة الأعضاء ونقارن معرفات الترتيب. ترتيب إدخال الأسماء لا يعطي أولوية خفية لشخص، مع بقاء احتمال اختلاف ترتيب نصوص الأسباب.

```python
def test_ranking_is_independent_of_member_order():
    people = [
        member(cuisines=["سعودي"], role="زائر"),
        Member(id="b", preferences=Preferences(name="بدر", cuisines=["ياباني"])),
    ]
    a = build_plan(CATALOG, people, Settings())
    b = build_plan(CATALOG, list(reversed(people)), Settings())
    assert [d.experience_id for d in a.selected] == [d.experience_id for d in b.selected]
```

## تأكدي من فهمك

اختاري مقطعًا واشرحي مدخلاته ونتيجته وما الذي يغيّره. ثم اكتبي مثالًا أصغر بنفس الفكرة في مجلد تدريب، واذكري ما يجب اختباره قبل دمجه.
