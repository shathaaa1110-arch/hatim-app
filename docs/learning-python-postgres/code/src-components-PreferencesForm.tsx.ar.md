# شرح `src/components/PreferencesForm.tsx`

[فهرس الكود](README.ar.md) · [دروس البداية](../README.ar.md) · [قاموس الرموز](../01-foundations.ar.md) · [التنسيق](../08-components.ar.md)

المصدر: [الملف في النسخة المرجعية](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/components/PreferencesForm.tsx) · [الملف المحلي](../../../src/components/PreferencesForm.tsx). عدد الأسطر: 220. المقاطع التالية تعرض المصدر نفسه دون تعديل، والشرح خارج الكود.

## نموذج مشترك

[الأسطر 1–9](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/components/PreferencesForm.tsx#L1): نستورد نوع Preferences وأدوات العرض. نفس النموذج يخدم إنشاء المنظم وانضمام العضو وتعديل ملفه، لكن onSave تحدد الطلب المناسب.

```tsx
import { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { Host, Slider } from "@expo/ui";
import { Check, Leaf, ShieldCheck } from "lucide-react-native";
import type { Preferences } from "../api/client";
import { colors as c, fonts, ar } from "../theme";
import { Button, Chip, Notice, Row, T } from "./ui";
import { Toggle } from "./Toggle";

```

## خيارات المطابخ

[الأسطر 10–17](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/components/PreferencesForm.tsx#L10): cuisines قائمة القيم العربية نفسها التي يقبلها الخادم. NonNullable تزيل احتمال undefined من نوع القائمة المولد. كل قيمة تستعمل كعنوان Chip وكقيمة مرسلة، ولا يوجد قاموس تحويل لقيم إنجليزية.

```tsx
const cuisines: NonNullable<Preferences["cuisines"]> = [
  "سعودي",
  "ياباني",
  "إيطالي",
  "شامي",
  "آسيوي",
  "قهوة وحلى",
];
```

## خيارات الحساسية

[الأسطر 18–29](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/components/PreferencesForm.tsx#L18): allergens قائمة القيم العربية للحساسيات المقبولة. الاختيار قيد صلب في planner. نوع NonNullable يمنع اعتبار تعريف هذه القائمة نفسه undefined.

```tsx
const allergens: NonNullable<Preferences["allergies"]> = [
  "مكسرات",
  "فول سوداني",
  "حليب",
  "قمح",
  "سمسم",
  "قشريات",
  "سمك",
  "بيض",
  "صويا",
];

```

## مدخلات النموذج

[الأسطر 30–40](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/components/PreferencesForm.tsx#L30): initial قيم البداية، onSave تستقبل Preferences وتعيد Promise<void>، label نص زر الحفظ، و busy تمنع إرسالًا مكررًا من الزر. لا تحفظي مباشرة بمجرد وصول initial.

```tsx
export function PreferencesForm({
  initial,
  onSave,
  label = "حفظ ذوقي",
  busy = false,
}: {
  initial: Preferences;
  onSave: (p: Preferences) => Promise<void>;
  label?: string;
  busy?: boolean;
}) {
```

## المسودة المحلية

[الأسطر 41–43](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/components/PreferencesForm.tsx#L41): useState تحفظ value ومسودة error. patch تستعمل Partial<Preferences> ثم updater ينسخ الكائن السابق ويدمج الحقول. لا نغير initial نفسها ولا نحفظ للشبكة مع كل حرف.

```tsx
  const [value, setValue] = useState<Preferences>(initial);
  const [error, setError] = useState<string | null>(null);
  const patch = (p: Partial<Preferences>) => setValue((v) => ({ ...v, ...p }));
```

## التحقق قبل الحفظ

[الأسطر 44–55](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/components/PreferencesForm.tsx#L44): ننظف الاسم ونمنع إرسال اسم فارغ. ثم ننتظر onSave داخل try. الواجهة تساعد المستخدم؛ Pydantic يعيد التحقق بالخادم لأن أي عميل يستطيع إرسال طلب مباشر.

```tsx
  const save = async () => {
    if (!value.name.trim()) {
      setError("وش الاسم اللي ينادونك فيه؟");
      return;
    }
    setError(null);
    try {
      await onSave({ ...value, name: value.name.trim() });
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذّر الحفظ. حاول مرة ثانية.");
    }
  };
```

## الاسم

[الأسطر 56–70](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/components/PreferencesForm.tsx#L56): TextInput قيمة controlled: value تأتي من draft و onChangeText تحدثها. حد الطول والتسمية يساعدان إدخالًا واضحًا، والاسم يدخل JSON عند الحفظ.

```tsx
  return (
    <View style={{ gap: 24 }}>
      <View style={{ gap: 8 }}>
        <T weight="medium">وش نناديك؟</T>
        <TextInput
          accessibilityLabel="اسمك"
          placeholder="اسمك بين الربع"
          placeholderTextColor={c.muted}
          value={value.name}
          onChangeText={(name) => patch({ name })}
          maxLength={30}
          autoComplete="given-name"
          style={s.input}
        />
      </View>
```

## مقيم أو زائر

[الأسطر 71–82](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/components/PreferencesForm.tsx#L71): الأزرار تغير role. هذا سياق لترجيح كنز محلي أو تجربة مناسبة للزائر؛ لا يمنح صلاحية إدارة.

```tsx
      <Row>
        <Chip
          label="مقيم في الرياض"
          selected={value.role === "مقيم"}
          onPress={() => patch({ role: "مقيم" })}
        />
        <Chip
          label="جاي أزورها"
          selected={value.role === "زائر"}
          onPress={() => patch({ role: "زائر" })}
        />
      </Row>
```

## اختيار عدة مطابخ

[الأسطر 83–104](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/components/PreferencesForm.tsx#L83): map يرسم Chip لكل خيار. الضغط يزيله بـ filter إذا كان موجودًا أو يضيفه بمصفوفة جديدة. ترتيب التفضيل هنا ليس ترتيب نقاط منفصلًا.

```tsx
      <View style={{ gap: 10 }}>
        <T weight="semibold" style={s.heading}>
          وين يودّيك ذوقك؟
        </T>
        <T style={s.caption}>اختَر اللي تحبّه، ونخلّي مساحة للجديد.</T>
        <View style={s.wrap}>
          {cuisines.map((cuisine) => (
            <Chip
              key={cuisine}
              label={cuisine}
              selected={value.cuisines?.includes(cuisine)}
              onPress={() =>
                patch({
                  cuisines: value.cuisines?.includes(cuisine)
                    ? value.cuisines.filter((x) => x !== cuisine)
                    : [...(value.cuisines ?? []), cuisine],
                })
              }
            />
          ))}
        </View>
      </View>
```

## النباتي والحرارة

[الأسطر 105–131](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/components/PreferencesForm.tsx#L105): Toggle تغيّر boolean. النص يشرح طبيعة الطلب. الخوارزمية تبحث عن مسار نباتي أو تعديل حار موثق؛ لا تعتمد على شكل السويتش في اتخاذ القرار.

```tsx
      <View style={s.controlCard}>
        <Row>
          <Leaf size={20} color={c.green} />
          <View style={{ flex: 1 }}>
            <T weight="medium">أكلي نباتي</T>
            <T style={s.caption}>قيد أساسي، ونبحث عن خيار يناسبك.</T>
          </View>
          <Toggle
            testID="vegetarian-switch"
            label="أكلي نباتي"
            value={value.vegetarian ?? false}
            onValueChange={(vegetarian) => patch({ vegetarian })}
          />
        </Row>
        <View style={s.line} />
        <Row>
          <T style={{ flex: 1 }} weight="medium">
            أفضل الأكل بدون حار
          </T>
          <Toggle
            testID="mild-switch"
            label="أفضل الأكل بدون حار"
            value={value.mild ?? false}
            onValueChange={(mild) => patch({ mild })}
          />
        </Row>
      </View>
```

## اختيار الحساسية

[الأسطر 132–164](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/components/PreferencesForm.tsx#L132): نفس نمط الإضافة والإزالة يستخدم قائمة allergies. الملاحظة تؤكد أن غياب التوثيق لا يُعامل كسلامة مؤكدة.

```tsx
      <View style={{ gap: 10 }}>
        <Row>
          <ShieldCheck size={20} color={c.warning} />
          <T weight="semibold" style={s.heading}>
            حساسية أكل؟ نأخذها بجدّية.
          </T>
        </Row>
        <T style={s.caption}>
          اتركها فارغة إذا ما عندك حساسية. التفضيل شيء، والسلامة شيء ثاني.
        </T>
        <View style={s.wrap}>
          {allergens.map((allergy) => (
            <Chip
              key={allergy}
              label={allergy}
              selected={value.allergies?.includes(allergy)}
              onPress={() =>
                patch({
                  allergies: value.allergies?.includes(allergy)
                    ? value.allergies.filter((x) => x !== allergy)
                    : [...(value.allergies ?? []), allergy],
                })
              }
            />
          ))}
        </View>
        {!!value.allergies?.length && (
          <Notice
            warning
            text="بيانات هذه النسخة تجريبية وغير موثّقة للحساسية. ستُعلَّق التجارب التي لا نقدر نثبت توافقها؛ إزالة المكوّن وحدها ما تكفي."
          />
        )}
      </View>
```

## الميزانية

[الأسطر 165–183](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/components/PreferencesForm.tsx#L165): Slider تقرّب القيمة وتحفظها في draft. الرقم المعروض منسق، والقيمة المحفوظة عدد. هذا سقف للشخص وليس متوسط ميزانية المجموعة.

```tsx
      <View style={s.controlCard}>
        <Row style={{ justifyContent: "space-between" }}>
          <T weight="semibold">حدّ ميزانيتي لكل تجربة</T>
          <T weight="semibold" style={{ color: c.green }}>
            {ar(value.budget ?? 200)} ر.س
          </T>
        </Row>
        <Host seedColor={c.green} colorScheme="light" style={{ height: 42 }}>
          <Slider
            testID="budget-slider"
            value={value.budget ?? 200}
            min={30}
            max={500}
            step={10}
            onValueChange={(budget) => patch({ budget: Math.round(budget) })}
          />
        </Host>
        <T style={s.caption}>سقف للشخص الواحد، نلتزم فيه.</T>
      </View>
```

## زر الإرسال

[الأسطر 184–192](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/components/PreferencesForm.tsx#L184): العنوان والحالة يتغيران حسب props. بعد الضغط save تستدعي onSave. نجاح حفظ الخادم، لا مجرد تحريك السويتش، هو ما يثبت الملف.

```tsx
      {error && <Notice warning text={error} />}
      <Button label={label} onPress={save} icon={Check} busy={busy} />
      <T style={[s.caption, { textAlign: "center" }]}>
        المنظّم يشوف تفضيلاتك وقيودك لترتيب الخطة.
      </T>
    </View>
  );
}

```

## التنسيق البصري

[الأسطر 193–220](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/components/PreferencesForm.tsx#L193): أنماط عنوان الحقل وخيارات السياق وصندوق التنبيه والمسافات بين أجزاء النموذج. كل خاصية تنسيق مشروحة في جدول الدرس 08. الكائنات هنا أسماء أنماط نمررها إلى style؛ لا ترسل طلبات ولا تعدل DB. ترتيب مصفوفة style يسمح للخصائص اللاحقة بتعديل الأساسية.

```tsx
const s = StyleSheet.create({
  input: {
    backgroundColor: c.white,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 15,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: c.ink,
    textAlign: "right",
    writingDirection: "rtl",
    minHeight: 52,
  },
  heading: { fontSize: 17 },
  caption: { color: c.muted, fontSize: 12, lineHeight: 22 },
  wrap: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 },
  controlCard: {
    padding: 17,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 20,
    gap: 10,
    backgroundColor: c.white,
  },
  line: { height: 1, backgroundColor: c.line, marginVertical: 4 },
});
```

## تأكدي من فهمك

اختاري مقطعًا واشرحي مدخلاته ونتيجته وما الذي يغيّره. ثم اكتبي مثالًا أصغر بنفس الفكرة في مجلد تدريب، واذكري ما يجب اختباره قبل دمجه.
