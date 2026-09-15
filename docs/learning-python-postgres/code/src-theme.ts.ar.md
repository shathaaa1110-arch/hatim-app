# شرح `src/theme.ts`

[فهرس الكود](README.ar.md) · [دروس البداية](../README.ar.md) · [قاموس الرموز](../01-foundations.ar.md) · [التنسيق](../08-components.ar.md)

المصدر: [الملف في النسخة المرجعية](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/theme.ts) · [الملف المحلي](../../../src/theme.ts). عدد الأسطر: 33. المقاطع التالية تعرض المصدر نفسه دون تعديل، والشرح خارج الكود.

## ألوان بأسماء مقصودة

[الأسطر 1–14](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/theme.ts#L1): colors تجمع قيم hex في مكان واحد. تغييرها يغير المظهر حيث استُخدمت. الاسم ink أو muted يشرح وظيفة اللون بدل تكرار رقم مبهم في الشاشات.

```typescript
export const colors = {
  background: "#F8F8F2",
  surface: "#FFFFFF",
  ink: "#193D32",
  green: "#215943",
  muted: "#78847B",
  line: "#E6E9E0",
  sage: "#EAF0E4",
  sageDark: "#D9E5D2",
  coral: "#D77A57",
  peach: "#F7EADF",
  warning: "#A45034",
  white: "#FFFFFF",
};
```

## أسماء الخطوط

[الأسطر 15–20](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/theme.ts#L15): fonts تربط درجات الخط بالأسماء المسجلة عبر useFonts في App. الاسم لا يجلب الخط من الإنترنت وقت كل عرض.

```typescript
export const fonts = {
  regular: "IBMPlexSansArabic_400Regular",
  medium: "IBMPlexSansArabic_500Medium",
  semibold: "IBMPlexSansArabic_600SemiBold",
  bold: "IBMPlexSansArabic_700Bold",
};
```

## عرض أرقام عربية

[الأسطر 21–22](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/theme.ts#L21): ar تستدعي n.toLocaleString مع ar-SA لإظهار الأرقام. نتيجة التنسيق نص للعرض فقط؛ API تستقبل slots كعدد عادي.

```typescript
export const ar = (n: number) => n.toLocaleString("ar-SA");

```

## صور محلية ثابتة

[الأسطر 23–33](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/theme.ts#L23): photos كائن Record<string,number> يربط مفاتيح image بـ require ثابت. Metro يضم الملفات إلى الحزمة. استعمال photos[e.image] يفصل مفتاح الصورة عن id التجربة، ولو تطابقت القيم الحالية. الصور توضيحية.

```typescript
export const photos: Record<string, number> = {
  fire: require("../assets/food/fire.jpg"),
  sushi: require("../assets/food/sushi.jpg"),
  levant: require("../assets/food/levant.jpg"),
  pasta: require("../assets/food/pasta.jpg"),
  breakfast: require("../assets/food/breakfast.jpg"),
  bao: require("../assets/food/bao.jpg"),
  pizza: require("../assets/food/pizza.jpg"),
  coffee: require("../assets/food/coffee.jpg"),
  dessert: require("../assets/food/dessert.jpg"),
};
```

## تأكدي من فهمك

اختاري مقطعًا واشرحي مدخلاته ونتيجته وما الذي يغيّره. ثم اكتبي مثالًا أصغر بنفس الفكرة في مجلد تدريب، واذكري ما يجب اختباره قبل دمجه.
