# شرح `src/components/MealControl.tsx`

[فهرس الكود](README.ar.md) · [دروس البداية](../README.ar.md) · [قاموس الرموز](../01-foundations.ar.md) · [التنسيق](../08-components.ar.md)

المصدر: [الملف في النسخة المرجعية](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/components/MealControl.tsx) · [خريطة الملفات الحالية](../../architecture-modules.ar.md). عدد الأسطر: 108. المقاطع التالية تعرض المصدر نفسه دون تعديل، والشرح خارج الكود.

## أدوات التحكم بالخانات

[الأسطر 1–7](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/components/MealControl.tsx#L1): نستورد Slider من Expo UI وأدوات العرض. الخانات تعد وجبات؛ ليست تقدير أيام مضروبًا بقيمة ثابتة داخل الخوارزمية.

```tsx
import { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { Host, Slider } from "@expo/ui";
import { Clock3, Sparkles, Utensils } from "lucide-react-native";
import { colors as c, ar } from "../theme";
import { Button, Chip, Row, T } from "./ui";

```

## العقد والمسودة

[الأسطر 8–18](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/components/MealControl.tsx#L8): slots و consumed و busy تأتي من الأب، و onChange تستقبل العدد الجديد وترجع Promise. useState تحفظ draft أثناء تعديل المنزلق، فلا نرسل PUT عند كل حركة.

```tsx
export function MealControl({
  slots,
  consumed,
  onChange,
  busy,
}: {
  slots: number;
  consumed: number;
  onChange: (slots: number) => Promise<void>;
  busy?: boolean;
}) {
```

## مزامنة قيمة محفوظة

[الأسطر 19–20](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/components/MealControl.tsx#L19): useEffect تعيد draft إلى slots عندما تتغير قيمة slots القادمة. تغير consumed وحده لا يشغّل هذا التأثير لأنه ليس في قائمة الاعتماد.

```tsx
  const [draft, setDraft] = useState(slots);
  useEffect(() => setDraft(slots), [slots]);
```

## العنوان والتفسير

[الأسطر 21–40](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/components/MealControl.tsx#L21): نعرض عدد الفرص والنص المساند. الحساب البصري منفصل عن حساب planner، والذي يعاد على الخادم عند الحفظ.

```tsx
  return (
    <View style={s.card}>
      <Row style={{ justifyContent: "space-between" }}>
        <Row>
          <View style={s.icon}>
            <Clock3 size={23} color={c.green} strokeWidth={1.5} />
          </View>
          <View>
            <T weight="semibold" style={{ fontSize: 20 }}>
              تغيّر وقتكم؟ عادي.
            </T>
            <T style={{ color: c.muted, fontSize: 12 }}>
              نصغّر الخطة، ونحفظ اللي يستاهل.
            </T>
          </View>
        </Row>
        <T weight="semibold" style={s.number}>
          {ar(draft)}
        </T>
      </Row>
```

## اختيارات جاهزة

[الأسطر 41–54](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/components/MealControl.tsx#L41): الأزرار تختار أعدادًا قليلة شائعة. اختيار preset يغير المسودة، ويظل زر الحفظ هو تنفيذ الطلب.

```tsx
      <Row style={{ flexWrap: "wrap", marginTop: 8 }}>
        {[
          { n: 9, label: "٤ أيام · ٩ خانات" },
          { n: 5, label: "يومين · ٥ خانات" },
          { n: 1, label: "عشاء واحد" },
        ].map(({ n, label }) => (
          <Chip
            key={n}
            label={label}
            selected={draft === n}
            onPress={consumed <= n ? () => setDraft(n) : undefined}
          />
        ))}
      </Row>
```

## المنزلق

[الأسطر 55–67](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/components/MealControl.tsx#L55): الحد الأدنى يراعي ما استُهلك، والأقصى 9. onValueChange يحدث عددًا صحيحًا. لا يمكن استعادة المعدة بإخفاء سجل completed من العرض.

```tsx
      {consumed < 9 && (
        <Host seedColor={c.green} colorScheme="light" style={{ height: 45 }}>
          <Slider
            testID="meal-slider"
            value={draft}
            onValueChange={(v) => setDraft(Math.round(v))}
            min={Math.max(1, consumed)}
            max={9}
            step={1}
            disabled={busy}
          />
        </Host>
      )}
```

## إجمالي ومستهلَك

[الأسطر 68–76](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/components/MealControl.tsx#L68): الأرقام توضح لماذا يختلف total عن المتبقي. total=4 مع consumed=2 يتيح فرصتين فقط.

```tsx
      <Row style={{ justifyContent: "space-between" }}>
        <Row style={{ gap: 6 }}>
          <Utensils size={13} color={c.muted} />
          <T style={{ fontSize: 12, color: c.muted }}>
            {ar(consumed)} استُهلكت · {ar(draft - consumed)} متبقية
          </T>
        </Row>
        <T style={{ fontSize: 11, color: c.muted }}>نعدّ الوجبات، مو الأيام</T>
      </Row>
```

## تطبيق العدد

[الأسطر 77–89](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/components/MealControl.tsx#L77): زر الحفظ يظهر فقط إذا draft تختلف عن slots، و busy تعطل تكرار ضغطه. onChange تعيد العملية إلى الأب ليستدعي API. هذا المكوّن لا يملك onSave باسم آخر ولا يعرف عنوان الخادم.

```tsx
      {draft !== slots && (
        <Button
          small
          label={`حدّث الخطة إلى ${ar(draft)} خانات`}
          icon={Sparkles}
          busy={busy}
          onPress={() => onChange(draft)}
        />
      )}
    </View>
  );
}

```

## التنسيق البصري

[الأسطر 90–108](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/components/MealControl.tsx#L90): صندوق التحكم وأزرار الأعداد وتوزيع نصوص العدادات. كل خاصية تنسيق مشروحة في جدول الدرس 08. الكائنات هنا أسماء أنماط نمررها إلى style؛ لا ترسل طلبات ولا تعدل DB. ترتيب مصفوفة style يسمح للخصائص اللاحقة بتعديل الأساسية.

```tsx
const s = StyleSheet.create({
  card: {
    borderRadius: 25,
    padding: 23,
    backgroundColor: "#EFF3E9",
    borderWidth: 1,
    borderColor: "#E2E9DB",
    gap: 10,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: "#DFE8D7",
    alignItems: "center",
    justifyContent: "center",
  },
  number: { fontSize: 43, lineHeight: 60, color: c.green },
});
```

## تأكدي من فهمك

اختاري مقطعًا واشرحي مدخلاته ونتيجته وما الذي يغيّره. ثم اكتبي مثالًا أصغر بنفس الفكرة في مجلد تدريب، واذكري ما يجب اختباره قبل دمجه.
