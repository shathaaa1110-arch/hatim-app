# شرح `src/components/WebDocument.web.tsx`

[فهرس الكود](README.ar.md) · [دروس البداية](../README.ar.md) · [قاموس الرموز](../01-foundations.ar.md) · [التنسيق](../08-components.ar.md)

المصدر: [الملف في النسخة المرجعية](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/components/WebDocument.web.tsx) · [الملف المحلي](../../../src/components/WebDocument.web.tsx). عدد الأسطر: 20. المقاطع التالية تعرض المصدر نفسه دون تعديل، والشرح خارج الكود.

## تأثير خاص بالمتصفح

[الأسطر 1–3](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/components/WebDocument.web.tsx#L1): useEffect يعمل بعد تركيب المكوّن. لا نستدعي document في نسخة native. المكوّن لا يرسم صندوقًا مرئيًا.

```tsx
import { useEffect } from "react";
export function WebDocument() {
  useEffect(() => {
```

## بيانات الوثيقة

[الأسطر 4–9](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/components/WebDocument.web.tsx#L4): نضبط document.title ولغة عنصر html إلى ar ونضيف meta theme-color. اتجاه النص في مكونات T و StyleSheet؛ هذا الملف لا يضبط document.dir.

```tsx
    document.title = "حاتم — لكل لَمّة، حكاية";
    document.documentElement.lang = "ar";
    const meta = document.createElement("meta");
    meta.name = "theme-color";
    meta.content = "#F8F8F2";
    document.head.appendChild(meta);
```

## CSS عام صغير

[الأسطر 10–13](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/components/WebDocument.web.tsx#L10): ننشئ عنصر style لوضع إعدادات الجذر والصفحة التي لا تخص بطاقة بعينها. هذا CSS للويب فقط، وليس StyleSheet على iOS.

```tsx
    const style = document.createElement("style");
    style.textContent =
      "body{background:#F8F8F2}*{box-sizing:border-box}input:focus-visible,[role=button]:focus-visible,[role=tab]:focus-visible{outline:2px solid #D77A57;outline-offset:3px}::selection{background:#D9E5D2}";
    document.head.appendChild(style);
```

## تنظيف الأثر

[الأسطر 14–20](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/src/components/WebDocument.web.tsx#L14): نضيف عنصر التنسيق ثم نزيله عند إنهاء التأثير. return null في نهاية المكوّن يعني أن دوره تعديل الوثيقة وليس إضافة JSX ظاهر.

```tsx
    return () => {
      meta.remove();
      style.remove();
    };
  }, []);
  return null;
}
```

## تأكدي من فهمك

اختاري مقطعًا واشرحي مدخلاته ونتيجته وما الذي يغيّره. ثم اكتبي مثالًا أصغر بنفس الفكرة في مجلد تدريب، واذكري ما يجب اختباره قبل دمجه.
