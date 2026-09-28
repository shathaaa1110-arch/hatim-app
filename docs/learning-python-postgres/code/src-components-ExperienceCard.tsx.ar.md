# شرح `src/components/ExperienceCard.tsx`

[فهرس الكود](README.ar.md) · [دروس البداية](../README.ar.md) · [قاموس الرموز](../01-foundations.ar.md) · [التنسيق](../08-components.ar.md)

المصدر: [الملف في النسخة المرجعية](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/components/ExperienceCard.tsx) · [خريطة الملفات الحالية](../../architecture-modules.ar.md). عدد الأسطر: 126. المقاطع التالية تعرض المصدر نفسه دون تعديل، والشرح خارج الكود.

## بطاقة تجربة

[الأسطر 1–6](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/components/ExperienceCard.tsx#L1): Image و Pressable و StyleSheet و View أدوات React Native. نقرأ Experience والصور والألوان من ملفاتنا. الصورة Image عادية؛ التدرج موجود في مقدمة Discover، لا هذه البطاقة.

```tsx
import { Image, Pressable, StyleSheet, View } from "react-native";
import { ArrowUpLeft, Bookmark, Clock, MapPin } from "lucide-react-native";
import type { Experience } from "../api/client";
import { ar, colors as c, photos } from "../theme";
import { IconButton, Row, T } from "./ui";

```

## عقد البطاقة

[الأسطر 7–21](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/components/ExperienceCard.tsx#L7): experience يعاد تسميتها محليًا e. onOpen مطلوب للتفاصيل. onSave اختياري للجيب و saved حالته، و priority نص رتبة اختياري، و compact يقلل ارتفاع الصورة. المكوّن لا يجلب تجربة بنفسه.

```tsx
export function ExperienceCard({
  experience: e,
  onOpen,
  onSave,
  saved,
  priority,
  compact,
}: {
  experience: Experience;
  onOpen: () => void;
  onSave?: () => void;
  saved?: boolean;
  priority?: string;
  compact?: boolean;
}) {
```

## الصورة والإطار

[الأسطر 22–35](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/components/ExperienceCard.tsx#L22): الحاوية View، و Pressable للصورة تستدعي onOpen. Image تختار photos[e.image]؛ مفتاح الصورة هو image في التجربة، وليس افتراض أن id دائمًا مطابق. compact يقلل الارتفاع إلى 185.

```tsx
  return (
    <View style={s.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`تفاصيل ${e.title}`}
        onPress={onOpen}
        style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
      >
        <Image
          source={photos[e.image]}
          style={[s.image, compact && { height: 185 }]}
          accessibilityLabel={e.title}
        />
      </Pressable>
```

## الفئة

[الأسطر 36–40](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/components/ExperienceCard.tsx#L36): شارة تعرض نوع التجربة مع اللون/النص المحدد. category موجودة في الكتالوج، وليست نتيجة ذكاء اصطناعي.

```tsx
      <View style={s.category}>
        <T weight="medium" style={{ fontSize: 11 }}>
          {e.category}
        </T>
      </View>
```

## حفظ مستقل

[الأسطر 41–53](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/components/ExperienceCard.tsx#L41): زر الجيب في View مستقلة بجوار Pressable الصورة، لا داخلها. onSave فقط تنفذ عند ضغطه؛ لا يوجد stopPropagation في هذا الملف. saved يغير اسم الوصول والتعبئة.

```tsx
      {onSave && (
        <View style={s.bookmark}>
          <IconButton
            light
            icon={Bookmark}
            label={
              saved ? `إزالة ${e.title} من الجيب` : `حفظ ${e.title} في الجيب`
            }
            active={saved}
            onPress={onSave}
          />
        </View>
      )}
```

## جسم البطاقة

[الأسطر 54–59](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/components/ExperienceCard.tsx#L54): نستخدم الأنماط المناسبة للوضع المختصر. التنسيق لا يقرر أهلية التجربة؛ ذلك يأتي من planner.

```tsx
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`افتح ${e.title}`}
        onPress={onOpen}
        style={s.body}
      >
```

## معلومات سياقية

[الأسطر 60–72](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/components/ExperienceCard.tsx#L60): المطبخ والحي والبيانات المختصرة تساعد على القراءة قبل التفاصيل. map/شرط JSX يبني العناصر المتكررة.

```tsx
        <Row style={{ justifyContent: "space-between" }}>
          <Row style={{ gap: 4 }}>
            <MapPin size={12} color={c.muted} />
            <T style={s.meta}>{e.neighborhood}</T>
          </Row>
          {priority ? (
            <T weight="medium" style={{ fontSize: 11, color: c.green }}>
              {priority === "ركيزة" ? "✦ ركيزتكم" : priority}
            </T>
          ) : (
            <T style={s.meta}>{e.cuisine}</T>
          )}
        </Row>
```

## اسم التجربة والمكان

[الأسطر 73–79](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/components/ExperienceCard.tsx#L73): العنوان يركز التجربة ثم يعرض venue. الوحدة الأساسية تجربة ولو شاركت أخرى في نفس المكان.

```tsx
        <T weight="semibold" numberOfLines={1} style={s.title}>
          {e.title}
        </T>
        <T style={s.subtitle}>
          {e.venue} · {e.cuisine}
        </T>
        <View style={s.divider} />
```

## السعر والمدة

[الأسطر 80–96](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/components/ExperienceCard.tsx#L80): أيقونات توضح SAR والدقائق. مدة الزيارة معلومة عرض؛ لا يضغط planner عدة تجارب في خانة بناءً عليها.

```tsx
        <Row style={{ justifyContent: "space-between" }}>
          <Row style={{ gap: 14 }}>
            <T weight="medium" style={{ fontSize: 13 }}>
              {ar(e.price)} <T style={s.meta}>ر.س / شخص</T>
            </T>
            <Row style={{ gap: 4 }}>
              <Clock size={12} color={c.muted} />
              <T style={s.meta}>{ar(e.minutes)} د</T>
            </Row>
          </Row>
          <ArrowUpLeft size={18} color={c.green} />
        </Row>
      </Pressable>
    </View>
  );
}

```

## التنسيق البصري

[الأسطر 97–126](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/components/ExperienceCard.tsx#L97): مقاسات الصورة والإطار والشارة والنص في الوضعين العادي والمختصر. كل خاصية تنسيق مشروحة في جدول الدرس 08. الكائنات هنا أسماء أنماط نمررها إلى style؛ لا ترسل طلبات ولا تعدل DB. ترتيب مصفوفة style يسمح للخصائص اللاحقة بتعديل الأساسية.

```tsx
const s = StyleSheet.create({
  card: {
    backgroundColor: c.white,
    borderRadius: 25,
    overflow: "hidden",
    borderColor: c.line,
    borderWidth: 1,
  },
  image: { width: "100%", height: 228, backgroundColor: c.sage },
  category: {
    position: "absolute",
    top: 15,
    right: 15,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,.93)",
  },
  bookmark: { position: "absolute", top: 10, left: 10 },
  body: { padding: 18, gap: 6 },
  title: { fontSize: 21, lineHeight: 32 },
  meta: { fontSize: 11, color: c.muted },
  subtitle: { fontSize: 12, color: c.muted },
  divider: {
    height: 1,
    backgroundColor: c.line,
    marginTop: 9,
    marginBottom: 8,
  },
});
```

## تأكدي من فهمك

اختاري مقطعًا واشرحي مدخلاته ونتيجته وما الذي يغيّره. ثم اكتبي مثالًا أصغر بنفس الفكرة في مجلد تدريب، واذكري ما يجب اختباره قبل دمجه.
