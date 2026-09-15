# شرح `tsconfig.json`

[فهرس الكود](README.ar.md) · [دروس البداية](../README.ar.md) · [قاموس الرموز](../01-foundations.ar.md) · [التنسيق](../08-components.ar.md)

المصدر: [الملف في النسخة المرجعية](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/tsconfig.json) · [الملف المحلي](../../../tsconfig.json). عدد الأسطر: 20. المقاطع التالية تعرض المصدر نفسه دون تعديل، والشرح خارج الكود.

## قواعد فحص TypeScript

[الأسطر 1–20](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/tsconfig.json#L1): extends ترث إعداد Expo. strict تطلب فحص أنواع أقوى، و allowJs=false تستبعد JS من مصادر TypeScript، و noUnusedLocals و noUnusedParameters تكشفان أسماء غير مستخدمة. include تشمل ts و tsx، و exclude تستبعد الحزم والمخرجات والمشاريع الأصلية والتشغيل المؤقت. tsc --noEmit تفحص بلا إخراج JavaScript؛ ليست تحققًا من طلبات HTTP وقت التشغيل.

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "allowJs": false,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  },
  "include": [
    "**/*.ts",
    "**/*.tsx"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "ios",
    "android",
    ".run"
  ]
}
```

## تأكدي من فهمك

اختاري مقطعًا واشرحي مدخلاته ونتيجته وما الذي يغيّره. ثم اكتبي مثالًا أصغر بنفس الفكرة في مجلد تدريب، واذكري ما يجب اختباره قبل دمجه.
