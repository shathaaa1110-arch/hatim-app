# شرح `src/screens/PlanScreen.tsx`

[فهرس الكود](README.ar.md) · [دروس البداية](../README.ar.md) · [قاموس الرموز](../01-foundations.ar.md) · [التنسيق](../08-components.ar.md)

المصدر: [الملف في النسخة المرجعية](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/PlanScreen.tsx) · [خريطة الملفات الحالية](../../architecture-modules.ar.md). عدد الأسطر: 264. المقاطع التالية تعرض المصدر نفسه دون تعديل، والشرح خارج الكود.

## قراءة الخطة

[الأسطر 1–15](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/PlanScreen.tsx#L1): تستورد أنواع المجموعة والتجربة ومكونات العرض. القرار موجود في group.plan؛ هذه الشاشة تشرحه وترسل نية التعديل.

```tsx
import { Image, Pressable, StyleSheet, View } from "react-native";
import {
  Bookmark,
  Check,
  ChevronLeft,
  CircleCheck,
  Leaf,
  Sparkles,
  Utensils,
} from "lucide-react-native";
import type { Experience, Group, Settings } from "../api/client";
import { ar, colors as c, photos } from "../theme";
import { Button, Chip, Empty, Notice, Row, T } from "../components/ui";
import { MealControl } from "../components/MealControl";

```

## العقد وربط التجارب

[الأسطر 16–30](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/PlanScreen.tsx#L16): props تمرر group و catalog و busy و callbacks. معرف القرار يربط بالكتالوج لإكمال الاسم والصورة؛ لا يخزن Decision نسخة كاملة من Experience.

```tsx
export function PlanScreen({
  group,
  catalog,
  update,
  busy,
  onOpen,
  onPocket,
}: {
  group: Group;
  catalog: Experience[];
  update: (s: Settings) => Promise<void>;
  busy: boolean;
  onOpen: (e: Experience) => void;
  onPocket: () => void;
}) {
```

## عنوان الخطة

[الأسطر 31–43](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/PlanScreen.tsx#L31): العداد يوضح ما بقي وما استُهلك وفق Plan، والنص يطمئن المستخدم عند تغير الوقت.

```tsx
  return (
    <View style={{ gap: 23 }}>
      <View>
        <T style={{ fontSize: 12, color: c.muted }}>
          على قدّ وقتكم، وعلى ذوقكم
        </T>
        <T weight="semibold" style={{ fontSize: 34 }}>
          خطّة تعرف تتغيّر.
        </T>
        <T style={{ color: c.muted, lineHeight: 25 }}>
          الأهم يبقى. وكل اختيار له سبب واضح.
        </T>
      </View>
```

## التحكم بالخانات

[الأسطر 44–49](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/PlanScreen.tsx#L44): MealControl تستقبل slots و consumed، و onChange يمرر العدد للأب الذي يرسل Settings كاملة.

```tsx
      <MealControl
        slots={group.settings.slots ?? 9}
        consumed={group.plan.consumed}
        onChange={(slots) => update({ ...group.settings, slots })}
        busy={busy}
      />
```

## مشكلة الركيزة

[الأسطر 50–58](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/PlanScreen.tsx#L50): عند وجود anchor_issue نعرض التحذير الواضح. لا نعرض بديلًا جديدًا على أنه حلم المستخدم القديم.

```tsx
      {group.plan.anchor_issue && (
        <View style={{ gap: 9 }}>
          <Notice warning text={group.plan.anchor_issue} />
          <T style={{ fontSize: 12, color: c.warning }}>
            خانة الركيزة محفوظة. غيّر الركيزة بنفسك من تفاصيل تجربة، أو راجع
            قيود المجموعة.
          </T>
        </View>
      )}
```

## قائمة ما بقي

[الأسطر 59–64](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/PlanScreen.tsx#L59): العنوان يفصل المختار حاليًا عن المحفوظ والمستهلك.

```tsx
      <Row style={{ justifyContent: "space-between" }}>
        <T weight="semibold" style={{ fontSize: 22 }}>
          اللي يبقى في خطّتكم
        </T>
        <Chip label={`${ar(group.plan.selected.length)} تجارب`} />
      </Row>
```

## رسم كل قرار

[الأسطر 65–110](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/PlanScreen.tsx#L65): map تمر على selected المرتبة من الخادم. key ثابت. لكل قرار نبحث عن Experience ثم نعرض الرتبة والتجربة؛ عدم العثور يعالج دون اختلاق محتوى.

```tsx
      {group.plan.selected.map((decision, index) => {
        const e = catalog.find((x) => x.id === decision.experience_id);
        if (!e) return null;
        const anchor = decision.priority === "ركيزة";
        return (
          <View
            key={e.id}
            style={[
              s.planCard,
              anchor && { borderColor: "#C4D3B9", backgroundColor: "#F3F6EE" },
            ]}
          >
            <Row style={{ alignItems: "flex-start", gap: 15 }}>
              <Pressable
                onPress={() => onOpen(e)}
                accessibilityRole="button"
                accessibilityLabel={`تفاصيل ${e.title}`}
              >
                <Image source={photos[e.image]} style={s.thumb} />
              </Pressable>
              <View style={{ flex: 1, gap: 5 }}>
                <Row style={{ justifyContent: "space-between" }}>
                  <Row style={{ gap: 5 }}>
                    {anchor && <Sparkles size={13} color={c.green} />}
                    <T
                      weight="semibold"
                      style={{
                        fontSize: 12,
                        color: anchor ? c.green : c.coral,
                      }}
                    >
                      {decision.priority}
                    </T>
                  </Row>
                  <T style={{ color: c.muted, fontSize: 11 }}>
                    خانة {ar(group.plan.consumed + index + 1)}
                  </T>
                </Row>
                <T weight="semibold" style={{ fontSize: 21 }}>
                  {e.title}
                </T>
                <T style={{ color: c.muted, fontSize: 12 }}>
                  {e.venue} · {ar(e.price)} ر.س للشخص
                </T>
              </View>
            </Row>
```

## سبب الرتبة

[الأسطر 111–118](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/PlanScreen.tsx#L111): reason نص الخادم يكشف أساس الاختيار. عرض السبب جزء أساسي من المنتج، لا سجل debugging.

```tsx
            <View style={s.reason}>
              <T weight="medium" style={{ fontSize: 12, marginBottom: 4 }}>
                ليش {decision.priority}؟
              </T>
              <T style={{ color: "#66776A", fontSize: 13, lineHeight: 24 }}>
                {decision.reason}
              </T>
            </View>
```

## المخارج والتنبيهات

[الأسطر 119–133](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/PlanScreen.tsx#L119): adaptations قائمة التعديلات لكل شخص. map تعطي كل تعديل سطرًا واضحًا. القائمة قد تشمل تنبيه حار غير قابل للتعديل لأنه تفضيل مرن.

```tsx
            {decision.adaptations?.map((text, i) => (
              <Row key={i} style={{ alignItems: "flex-start" }}>
                <Leaf size={16} color={c.green} />
                <T
                  style={{
                    flex: 1,
                    fontSize: 12,
                    color: c.green,
                    lineHeight: 23,
                  }}
                >
                  {text}
                </T>
              </Row>
            ))}
```

## إتمام تجربة

[الأسطر 134–164](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/PlanScreen.tsx#L134): الإجراء يرسل نسخة Settings مع إضافة المعرف إلى completed_ids. بقية الحقول تبقى كما هي؛ التجربة المختارة ليست في الجيب اليدوي أصلًا. بعد رد الخادم تختفي من selected وتظهر ضمن المكتمل، فيقل available.

```tsx
            <Row>
              <View style={{ flex: 1 }}>
                <Button
                  small
                  label="عشناها"
                  icon={Check}
                  secondary
                  busy={busy}
                  onPress={() =>
                    update({
                      ...group.settings,
                      completed_ids: [
                        ...(group.settings.completed_ids ?? []),
                        e.id,
                      ],
                    })
                  }
                />
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`عرض ${e.title}`}
                onPress={() => onOpen(e)}
                style={{ padding: 12 }}
              >
                <ChevronLeft size={20} color={c.green} />
              </Pressable>
            </Row>
          </View>
        );
      })}
```

## لا تجربة مختارة

[الأسطر 165–179](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/PlanScreen.tsx#L165): Empty تشرح أن الظروف الحالية لا تعطي خطة، ولا تخفي احتمال تعذر الركيزة أو القيود.

```tsx
      {group.plan.selected.length === 0 && (
        <Empty
          icon={Utensils}
          title={
            group.plan.available === 0
              ? "لحظات عشتوها، وحكايات بقيت."
              : "نحتاج نراجعها مع بعض"
          }
          text={
            group.plan.available === 0
              ? "استهلكتم خاناتكم. باقي الطموح محفوظ في الجيب."
              : "ما فيه تجربة مناسبة للخانات الحالية. القيود والركيزة واضحة فوق، وما غيّرنا حلمكم بصمت."
          }
        />
      )}
```

## خانات غير ممتلئة

[الأسطر 180–184](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/PlanScreen.tsx#L180): unfilled قد يبقى موجبًا حتى مع وقت متاح، مثل خانة الركيزة المعلقة. لا نفترض أن التطبيق معطل لمجرد وجود خانة فارغة.

```tsx
      {group.plan.unfilled > 0 && (
        <Notice
          text={`${ar(group.plan.unfilled)} خانات ما عبّيناها؛ ما نفرض تجربة على حساب قيودكم.`}
        />
      )}
```

## الذهاب إلى الجيب

[الأسطر 185–203](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/PlanScreen.tsx#L185): هذا رابط تبويب في التطبيق، وليس طلب استرجاع جميع التجارب إلى الخطة فورًا.

```tsx
      {group.plan.pocket.length > 0 && (
        <Pressable
          onPress={onPocket}
          accessibilityRole="button"
          accessibilityLabel="افتح الجيب"
          style={s.pocket}
        >
          <Bookmark size={23} color={c.green} />
          <View style={{ flex: 1 }}>
            <T weight="semibold">
              {ar(group.plan.pocket.length)} تجارب محفوظة في الجيب
            </T>
            <T style={{ color: c.muted, fontSize: 12 }}>
              اللي خرج من الخطة، ما ضاع.
            </T>
          </View>
          <ChevronLeft size={20} color={c.green} />
        </Pressable>
      )}
```

## المكتمل والتراجع

[الأسطر 204–237](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/PlanScreen.tsx#L204): نربط completed_ids بالكتالوج ونعرض Undo. التراجع يزيل المعرف ويعيد فرصة واحدة، ثم يعاد الحساب. لا نمسح تاريخًا منفصلًا لأن النسخة لا تملك جدول زيارات.

```tsx
      {!!group.settings.completed_ids?.length && (
        <View style={{ gap: 12 }}>
          <T weight="semibold" style={{ fontSize: 22 }}>
            لحظات عشتوها
          </T>
          {group.settings.completed_ids.map((id) => (
            <Row key={id} style={s.completed}>
              <CircleCheck size={20} color={c.green} />
              <T style={{ flex: 1 }}>
                {catalog.find((e) => e.id === id)?.title}
              </T>
              <Pressable
                disabled={busy}
                accessibilityRole="button"
                onPress={() =>
                  update({
                    ...group.settings,
                    completed_ids: group.settings.completed_ids?.filter(
                      (x) => x !== id,
                    ),
                  })
                }
                style={{ padding: 10 }}
              >
                <T style={{ color: c.muted, fontSize: 12 }}>تراجع</T>
              </Pressable>
            </Row>
          ))}
        </View>
      )}
    </View>
  );
}

```

## التنسيق البصري

[الأسطر 238–264](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/screens/PlanScreen.tsx#L238): أنماط القرارات والرتب وصندوق الإتمام وأزرار التراجع والمسافات. كل خاصية تنسيق مشروحة في جدول الدرس 08. الكائنات هنا أسماء أنماط نمررها إلى style؛ لا ترسل طلبات ولا تعدل DB. ترتيب مصفوفة style يسمح للخصائص اللاحقة بتعديل الأساسية.

```tsx
const s = StyleSheet.create({
  planCard: {
    padding: 20,
    borderRadius: 24,
    backgroundColor: c.white,
    borderWidth: 1,
    borderColor: c.line,
    gap: 14,
  },
  thumb: { width: 85, height: 90, borderRadius: 15 },
  reason: { paddingTop: 14, borderTopWidth: 1, borderColor: c.line },
  pocket: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 14,
    borderRadius: 20,
    backgroundColor: c.sage,
    padding: 20,
  },
  completed: {
    padding: 12,
    backgroundColor: c.white,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 16,
  },
});
```

## تأكدي من فهمك

اختاري مقطعًا واشرحي مدخلاته ونتيجته وما الذي يغيّره. ثم اكتبي مثالًا أصغر بنفس الفكرة في مجلد تدريب، واذكري ما يجب اختباره قبل دمجه.
