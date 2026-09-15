# شرح `backend/hatim/planner.py`

[فهرس الكود](README.ar.md) · [دروس البداية](../README.ar.md) · [قاموس الرموز](../01-foundations.ar.md) · [التنسيق](../08-components.ar.md)

المصدر: [الملف في النسخة المرجعية](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/planner.py) · [الملف المحلي](../../../backend/hatim/planner.py). عدد الأسطر: 111. المقاطع التالية تعرض المصدر نفسه دون تعديل، والشرح خارج الكود.

## دالة مستقلة

[الأسطر 1–5](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/planner.py#L1): استيراد نماذج فقط، بلا DB أو HTTP أو AI. هذا يجعل قاعدة القرار قابلة للاختبار والحساب اليدوي.

```python
"""Pure, deterministic ranking. Time only truncates the ranking; it never reshuffles it."""

from .models import Decision, Experience, Member, Plan, PocketItem, Settings


```

## مدخل التقييم

[الأسطر 6–11](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/planner.py#L6): evaluate تأخذ تجربة وقائمة أعضاء وترجع ثلاثة أشياء: أسباب منع، تعديلات، ونقاط. تبدأ قوائم جديدة لكل استدعاء ثم تزور تفضيلات كل عضو.

```python
def evaluate(experience: Experience, members: list[Member]) -> tuple[list[str], list[str], float]:
    blocked: list[str] = []
    adaptations: list[str] = []
    affinities: list[float] = []
    for member in members:
        p = member.preferences
```

## الحساسية

[الأسطر 12–18](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/planner.py#L12): dict.fromkeys تزيل تكرار الحساسية مع ترتيبها. وجود allergen يضيف منعًا. غياب التوثيق الصريح يضيف منعًا أيضًا. elif يجعل التعارض الصريح يتقدم حتى لو تناقض معه verified_free_of.

```python
        for allergy in dict.fromkeys(p.allergies):
            if allergy in experience.allergens:
                blocked.append(
                    f"تعارض مع حساسية {allergy} لدى {p.name}؛ لا نقترح إزالة المكوّن كحل."
                )
            elif allergy not in experience.verified_free_of:
                blocked.append(f"سلامة {p.name} من {allergy} غير موثّقة، بما فيها التلامس العرضي.")
```

## النباتي والميزانية

[الأسطر 19–25](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/planner.py#L19): النباتي إما موجود أصلًا أو له بديل نصي أو يمنع. السعر فوق سقف أي شخص يمنع. append تضيف تفسيرًا لكل حالة ولا توقف فحص بقية الأعضاء.

```python
        if p.vegetarian and not experience.vegetarian:
            if experience.vegetarian_option:
                adaptations.append(f"لـ{p.name}: {experience.vegetarian_option}")
            else:
                blocked.append(f"لا يتوفر خيار نباتي يناسب {p.name}.")
        if experience.price > p.budget:
            blocked.append(f"تتجاوز ميزانية {p.name} ({p.budget} ر.س للشخص).")
```

## الأذواق والنقاط

[الأسطر 26–44](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/planner.py#L26): 20 للمطبخ المحبوب. تفضيل غير الحار يحصل على تعديل أو خصم 20 وتنبيه. زائر مع سعودي +5، مقيم مع كنز مخفي +5. نجمع affinity كل شخص ثم editorial و 70% المتوسط و 30% الأدنى، مع حماية القسمة بقائمة غير فارغة وتقريب منزلتين.

```python
        affinity = 20.0 if experience.cuisine in p.cuisines else 0.0
        if p.mild and experience.spicy:
            if experience.mild_option:
                adaptations.append(f"لـ{p.name}: {experience.mild_option}")
            else:
                affinity -= 20
                adaptations.append(f"تنبيه لـ{p.name}: الطبق حار ولا يتوفر تعديل؛ هذا تفضيل مرن.")
        if p.role == "زائر" and experience.cuisine == "سعودي":
            affinity += 5
        if p.role == "مقيم" and experience.category == "كنوز مخفية":
            affinity += 5
        affinities.append(affinity)
    # The least-served member has an explicit share of the score.
    score = experience.editorial
    if affinities:
        score += 0.7 * sum(affinities) / len(affinities) + 0.3 * min(affinities)
    return blocked, adaptations, round(score, 2)


```

## مدخل الخطة

[الأسطر 45–49](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/planner.py#L45): build_plan تجمع candidates و pocket ومشكلة ركيزة. كل تجربة تمر عبر الفروع نفسها.

```python
def build_plan(catalog: list[Experience], members: list[Member], settings: Settings) -> Plan:
    candidates: list[Decision] = []
    pocket: list[PocketItem] = []
    anchor_issue = None
    for experience in catalog:
```

## المكتمل والجيب اليدوي

[الأسطر 50–56](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/planner.py#L50): المكتمل يستبعد من المرشحين والجيب. اليدوي يضاف بسبب الحفظ ثم continue؛ لا نعيده حين تتوسع السعة ولا نقيم blocked لهذا العنصر في هذا المسار.

```python
        if experience.id in settings.completed_ids:
            continue
        if experience.id in settings.pocket_ids:
            pocket.append(
                PocketItem(experience_id=experience.id, reason="حفظتوها لوقت ثاني، بلا ضغط.")
            )
            continue
```

## التجربة الممنوعة

[الأسطر 57–66](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/planner.py#L57): تفكيك الثلاثي يقرأ نتائج evaluate. blocked غير الفارغة تستدعي سبب جيب. إن كان id للركيزة نسجل anchor_issue، ثم continue يمنع إدخالها في المرشحين.

```python
        blocked, adaptations, score = evaluate(experience, members)
        if blocked:
            if experience.id == settings.anchor_id:
                anchor_issue = f"ركيزتكم «{experience.title}» لا تناسب المجموعة الآن. " + " ".join(
                    blocked
                )
            pocket.append(
                PocketItem(experience_id=experience.id, reason=" ".join(blocked), blocked=True)
            )
            continue
```

## Decision وسببها

[الأسطر 67–86](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/planner.py#L67): نحدد إن كانت ركيزة ونجمع أسماء محبي المطبخ. السبب الخاص للركيزة أو سبب تحريري مع أسماء. نحفظ النقاط والتعديلات في Decision. هذا عرض المنظم؛ endpoint الدعوة تعمم السبب لاحقًا.

```python
        anchor = experience.id == settings.anchor_id
        matched = [
            m.preferences.name for m in members if experience.cuisine in m.preferences.cuisines
        ]
        reason = (
            "اختياركم الذي نبني حوله الخطة؛ يبقى حتى لو صار الوقت عشاء واحدًا."
            if anchor
            else experience.why
        )
        if not anchor and matched:
            reason += f" ويتوافق مع ذوق {(' و'.join(matched))}."
        candidates.append(
            Decision(
                experience_id=experience.id,
                priority="ركيزة" if anchor else "أساسية",
                reason=reason,
                adaptations=adaptations,
                score=score,
            )
        )
```

## الترتيب والرتب

[الأسطر 87–92](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/planner.py#L87): tuple تقارن ركيزة أولًا، نقاطًا أعلى ثانيًا عبر السالب، ثم id لكسر التعادل. enumerate يعطي index. الرتب غير الركيزة أساسية لأول ثلاثة مواضع فقط، وما بعدها مرنة. لا توجد عتبة نقاط ثابتة للرتبة.

```python
    candidates.sort(
        key=lambda item: (item.experience_id != settings.anchor_id, -item.score, item.experience_id)
    )
    for index, item in enumerate(candidates):
        if item.priority != "ركيزة":
            item.priority = "أساسية" if index < 3 else "مرنة"
```

## حساب السعة

[الأسطر 93–96](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/planner.py#L93): نطرح المكتمل من slots. إن كانت ركيزة معلقة وبقي وقت نحجز لها خانة. max تمنع قيمة سالبة. slice [:capacity] يأخذ مقدمة الترتيب، لا يعيد حساب ترتيب جديد بناء على الزمن.

```python
    remaining = settings.slots - len(settings.completed_ids)
    # Reserve the blocked dream's slot instead of silently replacing it.
    capacity = max(0, remaining - (1 if anchor_issue and remaining else 0))
    selected = candidates[:capacity]
```

## تأجيل الوقت

[الأسطر 97–103](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/planner.py#L97): بقية المرشحين تدخل pocket بسبب ضيق الوقت. لا تضاف إلى settings.pocket_ids؛ لذلك تعود تلقائيًا إذا وسعت الخانات مع ثبات المدخلات الأخرى.

```python
    for item in candidates[capacity:]:
        pocket.append(
            PocketItem(
                experience_id=item.experience_id,
                reason="ضاق الوقت، مو الطموح. ترجع تلقائيًا إذا زادت الخانات.",
            )
        )
```

## النتيجة

[الأسطر 104–111](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/planner.py#L104): Plan تحتوي المختار والجيب والتحذير والعدادات. available هي المتبقي بعد المكتمل؛ unfilled المتبقي بعد الاختيار. المتبقي والمختار ليسا أسماء لنفس الشيء.

```python
    return Plan(
        selected=selected,
        pocket=pocket,
        anchor_issue=anchor_issue,
        consumed=len(settings.completed_ids),
        available=remaining,
        unfilled=remaining - len(selected),
    )
```

## تأكدي من فهمك

اختاري مقطعًا واشرحي مدخلاته ونتيجته وما الذي يغيّره. ثم اكتبي مثالًا أصغر بنفس الفكرة في مجلد تدريب، واذكري ما يجب اختباره قبل دمجه.
