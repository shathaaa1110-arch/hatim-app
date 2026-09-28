# شرح `src/components/WebDocument.tsx`

[فهرس الكود](README.ar.md) · [دروس البداية](../README.ar.md) · [قاموس الرموز](../01-foundations.ar.md) · [التنسيق](../08-components.ar.md)

المصدر: [الملف في النسخة المرجعية](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/components/WebDocument.tsx) · [خريطة الملفات الحالية](../../architecture-modules.ar.md). عدد الأسطر: 3. المقاطع التالية تعرض المصدر نفسه دون تعديل، والشرح خارج الكود.

## نسخة المنصة الأصلية

[الأسطر 1–3](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/components/WebDocument.tsx#L1): المكوّن يرجع null لأن iOS لا يملك document أو HTML. Metro يختار الملف .web.tsx بدل هذا عند بناء المتصفح. الاستيراد الواحد في App يعمل على المنصتين.

```tsx
export function WebDocument() {
  return null;
}
```

## تأكدي من فهمك

اختاري مقطعًا واشرحي مدخلاته ونتيجته وما الذي يغيّره. ثم اكتبي مثالًا أصغر بنفس الفكرة في مجلد تدريب، واذكري ما يجب اختباره قبل دمجه.
