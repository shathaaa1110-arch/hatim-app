from pydantic import Field

from hatim.core.models import Model
from hatim.domain.models import Decision, OutingContext, Preferences


class QuickRequest(Model):
    members: list[Preferences] = Field(min_length=1, max_length=12)
    minutes: int = Field(ge=15, le=240)
    neighborhood: str | None = Field(default=None, min_length=1, max_length=60)
    context: OutingContext = Field(default_factory=OutingContext)
    excluded_ids: list[str] = Field(default_factory=list, max_length=30)


class QuickResult(Model):
    choices: list[Decision]
    message: str
    duration_note: str = "مدة التجربة تقديرية؛ لا تشمل الطريق أو الانتظار. تأكد من وقت الفتح وتوفر التجربة قبل الذهاب."
