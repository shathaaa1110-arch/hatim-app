# شرح `backend/hatim/models.py`

[فهرس الكود](README.ar.md) · [دروس البداية](../README.ar.md) · [قاموس الرموز](../01-foundations.ar.md) · [التنسيق](../08-components.ar.md)

المصدر: [الملف في النسخة المرجعية](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/models.py) · [خريطة الملفات الحالية](../../architecture-modules.ar.md). عدد الأسطر: 132. المقاطع التالية تعرض المصدر نفسه دون تعديل، والشرح خارج الكود.

## الأنواع المشتركة

[الأسطر 1–9](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/models.py#L1): typing و Pydantic أداتان مستوردتان. Literal يقيد النص بقائمة أسماء مطابخ أو حساسيات أو فئات. إعلان النوع لا يضيف صفوفًا إلى قاعدة البيانات.

```python
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

Cuisine = Literal["سعودي", "ياباني", "إيطالي", "شامي", "آسيوي", "قهوة وحلى"]
Allergen = Literal["مكسرات", "فول سوداني", "حليب", "قمح", "سمسم", "قشريات", "سمك", "بيض", "صويا"]
Category = Literal["مطابخ جديدة", "كنوز مخفية", "افتتاحات", "طبق ولحظة"]


```

## قاعدة النماذج

[الأسطر 10–13](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/models.py#L10): Model ترث BaseModel. extra=forbid يرفض الحقول غير المعروفة، و str_strip_whitespace يزيل الفراغات الطرفية، و strict يمنع التحويلات المتساهلة مثل نص إلى عدد صحيح.

```python
class Model(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True, strict=True)


```

## شكل الخطأ

[الأسطر 14–17](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/models.py#L14): ErrorResponse يحتوي detail نصية. يستعمل لوصف رد التحقق 422 في OpenAPI حتى يطابق JSON الفعلية.

```python
class ErrorResponse(Model):
    detail: str


```

## تفضيلات الشخص

[الأسطر 18–27](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/models.py#L18): name مطلوبة وحدودها 1–30. role سياق زيارة لا صلاحية. القائمتان لهما مصنع قائمة وحد أقصى. vegetarian و mild افتراضهما False. budget عدد صحيح من 30 إلى 500 وافتراضيه 200. Field ينظم هذه القيود.

```python
class Preferences(Model):
    name: str = Field(min_length=1, max_length=30)
    role: Literal["مقيم", "زائر"] = "مقيم"
    cuisines: list[Cuisine] = Field(default_factory=list, max_length=6)
    allergies: list[Allergen] = Field(default_factory=list, max_length=9)
    vegetarian: bool = False
    mild: bool = False
    budget: int = Field(default=200, ge=30, le=500)


```

## العضو

[الأسطر 28–33](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/models.py#L28): Member تربط id بكائن Preferences وعلم organizer. id معرفة عضوية وليست كلمة مرور. default=False تعني أن العضو الجديد غير منظّم ما لم يحدد الخادم خلاف ذلك.

```python
class Member(Model):
    id: str
    preferences: Preferences
    organizer: bool = False


```

## التجربة

[الأسطر 34–55](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/models.py#L34): الحقول حتى editorial تصف هوية التجربة وعرضها ونقاط المحرر. بقية الحقول تحدد توفر النباتي وتعديل الحار والمواد الحساسة. str | None تسمح بنص أو غياب خيار. verified_free_of تتطلب توثيق الغياب والتلامس؛ وجود قائمة allergens ناقصة لا يعد توثيقًا. price والدقائق تعرضان في البطاقة، لكن minutes ليست مدخل سعة الخطة.

```python
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


```

## إعدادات الخطة

[الأسطر 56–61](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/models.py#L56): slots من 1 إلى 9. anchor_id افتراضيها fire ويمكن null. pocket_ids للحفظ اليدوي فقط، و completed_ids للمستهلك. ليست plan.pocket التي تجمع أيضًا المؤجل تلقائيًا والممنوع.

```python
class Settings(Model):
    slots: int = Field(default=9, ge=1, le=9)
    anchor_id: str | None = "fire"
    pocket_ids: list[str] = Field(default_factory=list, max_length=30)
    completed_ids: list[str] = Field(default_factory=list, max_length=9)

```

## تناسق الحقول

[الأسطر 62–78](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/models.py#L62): decorator mode=after ينفذ بعد تحقق الحقول. مقارنة len(set(...)) مع len تكشف التكرار. تقارن الخانات بالمكتمل، وترفض ركيزة محفوظة يدويًا، وتقاطع مجموعتَي الجيب والمكتمل، ومعرفات فارغة. raise يوقف الطلب؛ return self يعيد النموذج إذا اجتاز القواعد.

```python
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


```

## قرار اختيار تجربة

[الأسطر 79–86](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/models.py#L79): Decision تربط experience_id برتبة محددة و reason و adaptations و score. لا تنسخ وصف التجربة كله؛ العميل يربط المعرف بالكتالوج.

```python
class Decision(Model):
    experience_id: str
    priority: Literal["ركيزة", "أساسية", "مرنة"]
    reason: str
    adaptations: list[str] = Field(default_factory=list)
    score: float


```

## عنصر الجيب

[الأسطر 87–92](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/models.py#L87): PocketItem تحمل id وسبب الخروج و blocked. False قد تعني تأجيلًا يدويًا أو بسبب الوقت، وليست شهادة توافق مستقلة.

```python
class PocketItem(Model):
    experience_id: str
    reason: str
    blocked: bool = False


```

## الخطة الناتجة

[الأسطر 93–101](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/models.py#L93): selected المختار و pocket خارج الخطة. anchor_issue قد تغيب. consumed عدد المكتمل، available بعد طرح المكتمل، و unfilled ما بقي دون اختيار، وقد يتضمن خانة ركيزة معلّقة.

```python
class Plan(Model):
    selected: list[Decision]
    pocket: list[PocketItem]
    anchor_issue: str | None = None
    consumed: int
    available: int
    unfilled: int


```

## طلب الإنشاء

[الأسطر 102–106](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/models.py#L102): CreateGroup تعطي العنوان الافتراضي مع حدوده وتطلب preferences. العميل الحالي لا يعرض تعديل العنوان أثناء الإنشاء، فيستعمل الافتراضي.

```python
class CreateGroup(Model):
    title: str = Field(default="لَمّتنا في الرياض", min_length=1, max_length=60)
    preferences: Preferences


```

## رد المنظّم

[الأسطر 107–115](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/models.py#L107): GroupView تضم إعدادات وملفات أعضاء وخطة. هي أوسع من الرد العام للدعوة وتحتاج مفتاح المنظّم.

```python
class GroupView(Model):
    id: str
    title: str
    invite_code: str
    settings: Settings
    members: list[Member]
    plan: Plan


```

## رد الإنشاء والانضمام

[الأسطر 116–125](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/models.py#L116): GroupCreated و MemberCreated يعيدان المفتاح الخام عند إنشائه مع بيانات العرض. بقية قراءات المجموعة/العضو لا تعيد بصمات DB أو مفاتيح خام جديدة.

```python
class GroupCreated(Model):
    organizer_token: str
    group: GroupView


class MemberCreated(Model):
    member_token: str
    member: Member


```

## الرد العام

[الأسطر 126–132](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/models.py#L126): InviteView لا تحتوي preferences ولا قائمة members الكاملة. فقط أسماء وسعة واختيارات وتحذير عام ومستهلك. انتبهي: لا يوجد حقل code فيها؛ الرمز موجود أصلًا في عنوان الطلب.

```python
class InviteView(Model):
    title: str
    member_names: list[str]
    slots: int
    selected: list[Decision]
    anchor_issue: str | None = None
    consumed: int
```

## تأكدي من فهمك

اختاري مقطعًا واشرحي مدخلاته ونتيجته وما الذي يغيّره. ثم اكتبي مثالًا أصغر بنفس الفكرة في مجلد تدريب، واذكري ما يجب اختباره قبل دمجه.
