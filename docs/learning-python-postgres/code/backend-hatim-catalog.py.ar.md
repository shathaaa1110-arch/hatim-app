# شرح `backend/hatim/catalog.py`

[فهرس الكود](README.ar.md) · [دروس البداية](../README.ar.md) · [قاموس الرموز](../01-foundations.ar.md) · [التنسيق](../08-components.ar.md)

المصدر: [الملف في النسخة المرجعية](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/catalog.py) · [الملف المحلي](../../../backend/hatim/catalog.py). عدد الأسطر: 154. المقاطع التالية تعرض المصدر نفسه دون تعديل، والشرح خارج الكود.

## مصدر التجارب التوضيحي

[الأسطر 1–5](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/catalog.py#L1): Docstring يعلن أنها بيانات مصطنعة. Experience يتحقق من شكل كل عنصر. CATALOG قائمة من كائنات، لا طلب شبكة ولا قراءة مطاعم حقيقية. كل حقل معرف في درس النماذج.

```python
"""Fictional editorial fixtures. No venue, availability, price, or allergy claim is live."""

from .models import Experience

CATALOG = [
```

## الحطب fire

[الأسطر 6–21](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/catalog.py#L6): ركيزة الإعداد الافتراضي، 145 ريال و 90 دقيقة و editorial=96. خيار نباتي نصه قرنبيط بدل اللحم. image=fire تربط بصورة محلية. المواد الحساسة المعلنة ليست قائمة توثيق غياب.

```python
    Experience(
        id="fire",
        title="على مهل… وعلى الحطب",
        venue="مائدة الحطب",
        neighborhood="حي حطين",
        category="طبق ولحظة",
        cuisine="سعودي",
        image="fire",
        price=145,
        minutes=90,
        editorial=96,
        description="رائحة الحطب أول الترحيب. أطباق سعودية بروح جديدة، ومائدة تكبر بالسوالف. لحظة تستاهل تجمعكم حولها.",
        why="تجربة مشاركة تعطي اللمة مساحة، ونكهة محلية تستحق وقتها.",
        vegetarian_option="قرنبيط مشوي على الحطب مع أرز الأعشاب بدل اللحم.",
        allergens=["حليب", "قمح"],
    ),
```

## اليابان sushi

[الأسطر 22–37](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/catalog.py#L22): مطبخ ياباني ضمن المطابخ الجديدة، بسعر 180 ونقاط 91 وخيار ماكي نباتي. هوية id ثابتة حتى لو غير المحرر العنوان.

```python
    Experience(
        id="sushi",
        title="رحلة صغيرة إلى اليابان",
        venue="طاولة نوري",
        neighborhood="حي الملقا",
        category="مطابخ جديدة",
        cuisine="ياباني",
        image="sushi",
        price=180,
        minutes=75,
        editorial=91,
        description="اجلسوا قريبًا من الشيف. قطع صغيرة، تفاصيل كثيرة، وقائمة تذوّق تأخذكم من نكهة إلى حكاية.",
        why="مطبخ مختلف يوسّع التجربة خارج اختياراتكم المعتادة.",
        vegetarian_option="قائمة ماكي بالخضار والفطر.",
        allergens=["سمك", "قشريات", "صويا", "سمسم", "قمح"],
    ),
```

## الشام levant

[الأسطر 38–53](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/catalog.py#L38): كنز مخفي بسعر 85 ونقاط 90 و vegetarian=True. المقيم يحصل على خمس نقاط سياق إضافية لهذا التصنيف.

```python
    Experience(
        id="levant",
        title="باب صغير، سفرة كبيرة",
        venue="دار الزيتون",
        neighborhood="حي الروضة",
        category="كنوز مخفية",
        cuisine="شامي",
        image="levant",
        price=85,
        minutes=60,
        editorial=90,
        description="في شارع هادئ، خبز يطلع من الفرن ومزّات تتشاركها الأيادي. من الأماكن اللي ودّك تحتفظ بسرّها.",
        why="كنز هادئ، ميزانية مريحة، وخيارات نباتية من أصل المطبخ.",
        vegetarian=True,
        allergens=["سمسم", "قمح", "حليب"],
    ),
```

## الباستا pasta

[الأسطر 54–69](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/catalog.py#L54): افتتاح إيطالي بسعر 120 ونقاط 87 ونباتي. النصوص محتوى عرض، وليست تعليمات Python منفذة.

```python
    Experience(
        id="pasta",
        title="الباستا تُصنع قدّامك",
        venue="مختبر العجين",
        neighborhood="حي العليا",
        category="افتتاحات",
        cuisine="إيطالي",
        image="pasta",
        price=120,
        minutes=70,
        editorial=87,
        description="عجين طازج، مطبخ مفتوح، وصلصة بسيطة تعطي المكوّن حقّه. بداية جديدة لسه ما يعرفها الكل.",
        why="تجربة افتتاح تجمع عرض التحضير مع طبق مألوف ومحبوب.",
        vegetarian=True,
        allergens=["قمح", "بيض", "حليب"],
    ),
```

## الفطور breakfast

[الأسطر 70–85](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/catalog.py#L70): كنز سعودي بسعر 65 ونقاط 85 ونباتي؛ قد يحصل زائر أو مقيم على زيادة سياق وفق قواعد evaluate المختلفة.

```python
    Experience(
        id="breakfast",
        title="صباح بطعم أوّل",
        venue="فناء الصباح",
        neighborhood="حي الدرعية",
        category="كنوز مخفية",
        cuisine="سعودي",
        image="breakfast",
        price=65,
        minutes=60,
        editorial=85,
        description="تميس دافئ، شكشوكة، وقهوة على طرف الفناء. فطور ما يستعجل الصباح ولا سوالفكم.",
        why="بداية محلية خفيفة على الميزانية قبل يوم طويل.",
        vegetarian=True,
        allergens=["قمح", "بيض", "حليب"],
    ),
```

## الباو bao

[الأسطر 86–103](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/catalog.py#L86): آسيوي بسعر 95 ونقاط 83. خيار نباتي وخيار صلصة على الجانب. spicy=True يسمح باختبار تفضيل الحار وتعديله.

```python
    Experience(
        id="bao",
        title="لقمة من آخر العالم",
        venue="بيت الباو",
        neighborhood="حي السليمانية",
        category="مطابخ جديدة",
        cuisine="آسيوي",
        image="bao",
        price=95,
        minutes=45,
        editorial=83,
        description="خبز باو طري وحشوات مليانة نكهة. اطلبوا أكثر من صنف وخلّوا كل لقمة مفاجأة.",
        why="مغامرة صغيرة بالنكهة، تناسب خانة وجبة قصيرة.",
        vegetarian_option="باو الفطر بدل الدجاج.",
        spicy=True,
        mild_option="الصلصة الحارة على الجانب.",
        allergens=["قمح", "صويا", "سمسم"],
    ),
```

## البيتزا pizza

[الأسطر 104–119](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/catalog.py#L104): افتتاح إيطالي ونباتي بسعر 80 ونقاط 81. يستعمل نفس مخطط البيانات؛ لا توجد دالة مختلفة لكل مطعم.

```python
    Experience(
        id="pizza",
        title="حواف تستاهل الانتظار",
        venue="فرن الحارة",
        neighborhood="حي النرجس",
        category="افتتاحات",
        cuisine="إيطالي",
        image="pizza",
        price=80,
        minutes=55,
        editorial=81,
        description="فرن صغير وعجينة تأخذ وقتها. بيتزا نابولية إلى وسط الطاولة، عشان كل أحد يذوق.",
        why="اختيار مشاركة مرن يقرّب الأذواق المختلفة.",
        vegetarian=True,
        allergens=["قمح", "حليب"],
    ),
```

## القهوة coffee

[الأسطر 120–135](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/catalog.py#L120): قهوة وحلى بسعر 45 ونقاط 78. رغم قصرها تستهلك خانة كاملة في هذا النموذج.

```python
    Experience(
        id="coffee",
        title="قهوة… وباقي الحكاية",
        venue="ظل البن",
        neighborhood="حي الياسمين",
        category="طبق ولحظة",
        cuisine="قهوة وحلى",
        image="coffee",
        price=45,
        minutes=40,
        editorial=78,
        description="قهوة مقطّرة وحلى تمر دافئ في ركن هادئ. خلوها موعدًا كاملًا، مو محطة مستعجلة.",
        why="وقفة هادئة للنهاية؛ مرنة إذا احتاجت وجبة ثانية مكانها.",
        vegetarian=True,
        allergens=["حليب", "قمح", "مكسرات"],
    ),
```

## الحلى dessert

[الأسطر 136–153](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/catalog.py#L136): آخر عنصر بسعر 50 ونقاط 75. نختم الكائن والقائمة بالأقواس الصحيحة. كل verified_free_of بقيت بالقيمة الافتراضية الفارغة.

```python
    Experience(
        id="dessert",
        title="ختامها فستق",
        venue="قطعة سكر",
        neighborhood="حي العقيق",
        category="طبق ولحظة",
        cuisine="قهوة وحلى",
        image="dessert",
        price=50,
        minutes=40,
        editorial=75,
        description="طبقات خفيفة وفستق محمّص. ختام حلو تتقاسمونه، وتطوّلون عنده السالفة.",
        why="لحظة حلوة إضافية نحفظها إذا ما وسعها الوقت.",
        vegetarian=True,
        allergens=["مكسرات", "قمح", "حليب", "بيض"],
    ),
]

```

## فهرس المعرفات

[الأسطر 154–154](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/catalog.py#L154): set comprehension تجمع ids الفريدة للاستعمال في تحقق settings. مجموعة القيم تجعل فحص العضوية واضحًا، وليست جدولًا في DB.

```python
CATALOG_IDS = {item.id for item in CATALOG}
```

## تأكدي من فهمك

اختاري مقطعًا واشرحي مدخلاته ونتيجته وما الذي يغيّره. ثم اكتبي مثالًا أصغر بنفس الفكرة في مجلد تدريب، واذكري ما يجب اختباره قبل دمجه.
