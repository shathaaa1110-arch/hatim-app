from hatim.domain.models import Experience, Member, Settings
from hatim.domain.planner import build_plan

from .models import QuickRequest, QuickResult


def decide(entries: list[Experience], request: QuickRequest) -> QuickResult:
    # Filtering duration does not relax a single participant's hard constraints.
    candidates = [
        e
        for e in entries
        if e.minutes <= request.minutes
        and (request.neighborhood is None or e.neighborhood == request.neighborhood)
        and e.id not in request.excluded_ids
    ]
    people = [Member(id=str(i), preferences=p) for i, p in enumerate(request.members)]
    plan = build_plan(
        candidates, people, Settings(slots=3, anchor_id=None, context=request.context)
    )
    by_id = {e.id: e for e in candidates}
    for choice in plan.selected:
        choice.reason = (
            f"مدة التجربة نحو {by_id[choice.experience_id].minutes} دقيقة، ضمن الوقت الذي حددته. "
            + choice.reason
        )
    if plan.selected:
        message = "اختيارات قليلة، وسبب واضح لكل واحدة. اعتماد تجربة يحفظ تفضيلات هذه الطلعة."
    elif not candidates:
        message = "ما لقينا تجربة ضمن هذا الحي والوقت. جرّب حيًا آخر أو وقتًا أطول؛ اختيارات الجيب واللحظات المكتملة مستثناة."
    else:
        message = "ما لقينا تجربة تراعي قيود الجميع ضمن هذا الحي والوقت. راجع بيانات القيود إذا كانت غير دقيقة، أو وسّع البحث؛ ما خففناها لأجل نتيجة."
    return QuickResult(choices=plan.selected, message=message)
