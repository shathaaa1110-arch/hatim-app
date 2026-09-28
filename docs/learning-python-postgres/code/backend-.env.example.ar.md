# شرح `backend/.env.example`

[فهرس الكود](README.ar.md) · [دروس البداية](../README.ar.md) · [قاموس الرموز](../01-foundations.ar.md) · [التنسيق](../08-components.ar.md)

المصدر: [الملف في النسخة المرجعية](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/.env.example) · [خريطة الملفات الحالية](../../architecture-modules.ar.md). عدد الأسطر: 6. المقاطع التالية تعرض المصدر نفسه دون تعديل، والشرح خارج الكود.

## مثال إعداد الخادم

[الأسطر 1–6](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/.env.example#L1): DATABASE_URL مثال بعناصر USER و PASSWORD و HOST تستبدلينها في ملف خاص. القيمة يقرأها الخادم فقط. HATIM_TEST_DATABASE_URL اختيار لخادم اختبار؛ إن غابت تستعمل pytest مخططات مؤقتة في DATABASE_URL. ملفات example لا تحوي مفاتيح تشغيل حقيقية.

```text
# Server-only PostgreSQL connection; never put it in EXPO_PUBLIC_*.
# npm run db:up generates a private backend/.env.local for local development.
# For your own PostgreSQL server, copy this file to .env.local and replace this URL.
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/hatim
# Optional isolated test server; otherwise tests create temporary schemas in DATABASE_URL.
# HATIM_TEST_DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/hatim_test
```

## تأكدي من فهمك

اختاري مقطعًا واشرحي مدخلاته ونتيجته وما الذي يغيّره. ثم اكتبي مثالًا أصغر بنفس الفكرة في مجلد تدريب، واذكري ما يجب اختباره قبل دمجه.
