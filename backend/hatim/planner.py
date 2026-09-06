"""Pure, deterministic ranking. Time only truncates the ranking; it never reshuffles it."""

from .models import Decision, Experience, Member, Plan, PocketItem, Settings


def evaluate(experience: Experience, members: list[Member]) -> tuple[list[str], list[str], float]:
    blocked: list[str] = []
    adaptations: list[str] = []
    affinities: list[float] = []
    for member in members:
        p = member.preferences
        for allergy in dict.fromkeys(p.allergies):
            if allergy in experience.allergens:
                blocked.append(
                    f"تعارض مع حساسية {allergy} لدى {p.name}؛ لا نقترح إزالة المكوّن كحل."
                )
            elif allergy not in experience.verified_free_of:
                blocked.append(f"سلامة {p.name} من {allergy} غير موثّقة، بما فيها التلامس العرضي.")
        if p.vegetarian and not experience.vegetarian:
            if experience.vegetarian_option:
                adaptations.append(f"لـ{p.name}: {experience.vegetarian_option}")
            else:
                blocked.append(f"لا يتوفر خيار نباتي يناسب {p.name}.")
        if experience.price > p.budget:
            blocked.append(f"تتجاوز ميزانية {p.name} ({p.budget} ر.س للشخص).")
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


def build_plan(catalog: list[Experience], members: list[Member], settings: Settings) -> Plan:
    candidates: list[Decision] = []
    pocket: list[PocketItem] = []
    anchor_issue = None
    for experience in catalog:
        if experience.id in settings.completed_ids:
            continue
        if experience.id in settings.pocket_ids:
            pocket.append(
                PocketItem(experience_id=experience.id, reason="حفظتوها لوقت ثاني، بلا ضغط.")
            )
            continue
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
    candidates.sort(
        key=lambda item: (item.experience_id != settings.anchor_id, -item.score, item.experience_id)
    )
    for index, item in enumerate(candidates):
        if item.priority != "ركيزة":
            item.priority = "أساسية" if index < 3 else "مرنة"
    remaining = settings.slots - len(settings.completed_ids)
    # Reserve the blocked dream's slot instead of silently replacing it.
    capacity = max(0, remaining - (1 if anchor_issue and remaining else 0))
    selected = candidates[:capacity]
    for item in candidates[capacity:]:
        pocket.append(
            PocketItem(
                experience_id=item.experience_id,
                reason="ضاق الوقت، مو الطموح. ترجع تلقائيًا إذا زادت الخانات.",
            )
        )
    return Plan(
        selected=selected,
        pocket=pocket,
        anchor_issue=anchor_issue,
        consumed=len(settings.completed_ids),
        available=remaining,
        unfilled=remaining - len(selected),
    )
