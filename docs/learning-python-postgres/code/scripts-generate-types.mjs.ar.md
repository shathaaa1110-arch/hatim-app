# شرح `scripts/generate-types.mjs`

[فهرس الكود](README.ar.md) · [دروس البداية](../README.ar.md) · [قاموس الرموز](../01-foundations.ar.md) · [التنسيق](../08-components.ar.md)

المصدر: [الملف في النسخة المرجعية](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/scripts/generate-types.mjs) · [الملف المحلي](../../../scripts/generate-types.mjs). عدد الأسطر: 30. المقاطع التالية تعرض المصدر نفسه دون تعديل، والشرح خارج الكود.

## تحديد الجذر والأوامر

[الأسطر 1–9](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/scripts/generate-types.mjs#L1): نستورد تشغيل العمليات المتزامن ونحدد root. commands مصفوفة: كل عنصر اسم برنامج وقائمة وسيطاته. أول أمر يشغل تصدير OpenAPI من FastAPI.

```javascript
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const commands = [
  [
    "uv",
    ["run", "--directory", "backend", "python", "-m", "hatim.export_openapi"],
  ],
```

## توليد TypeScript مع عزل الأداة

[الأسطر 10–25](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/scripts/generate-types.mjs#L10): npx ينفذ openapi-typescript بإصدار مثبت وبنسخة TypeScript5 لاحتياج peer dependency للأداة. التطبيق يبقى على TypeScript6 المتوافقة مع Expo. لا نعدل عقد Python لإرضاء نوع مكتوب يدويًا بالعميل.

```javascript
  // The generator's TS 5 peer dependency is isolated from the app's Expo-supported TS 6.
  [
    "npx",
    [
      "--yes",
      "--package",
      "openapi-typescript@7.13.0",
      "--package",
      "typescript@5.9.3",
      "openapi-typescript",
      "backend/openapi.json",
      "-o",
      "src/api/schema.d.ts",
    ],
  ],
  ["npx", ["prettier", "--write", "src/api/schema.d.ts"]],
```

## تنسيق ثم فحص الخروج

[الأسطر 26–30](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/scripts/generate-types.mjs#L26): Prettier ينسق schema.d.ts المولدة. الحلقة تنتظر كل أمر قبل التالي وتنهي بفشل إذا فشل أي منها. التوليد يستبدل الملف المولد؛ تغييرات العقد الصحيحة تبدأ من models/routes.

```javascript
];
for (const [command, args] of commands) {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
```

## تأكدي من فهمك

اختاري مقطعًا واشرحي مدخلاته ونتيجته وما الذي يغيّره. ثم اكتبي مثالًا أصغر بنفس الفكرة في مجلد تدريب، واذكري ما يجب اختباره قبل دمجه.
