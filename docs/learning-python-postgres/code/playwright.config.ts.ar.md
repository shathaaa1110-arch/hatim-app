# شرح `playwright.config.ts`

[فهرس الكود](README.ar.md) · [دروس البداية](../README.ar.md) · [قاموس الرموز](../01-foundations.ar.md) · [التنسيق](../08-components.ar.md)

المصدر: [الملف في النسخة المرجعية](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/playwright.config.ts) · [الملف المحلي](../../../playwright.config.ts). عدد الأسطر: 22. المقاطع التالية تعرض المصدر نفسه دون تعديل، والشرح خارج الكود.

## إعداد اختبارات المتصفح

[الأسطر 1–22](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/playwright.config.ts#L1): defineConfig يعطي فحص نوع للإعداد. testDir مكان السيناريوهات، timeout60 ثانية، وعدم التوازي يقلل تداخل كتابة بيانات الاختبار. baseURL من HATIM_TEST_URL أو loopback8000. trace/screenshots تُحفظ عند الفشل. مشروع chromium يستخدم إعداد Desktop Chrome بعرض 1440×1100؛ السيناريو ينشئ سياقًا صغيرًا بنفسه. لا يوجد webServer في config، فابدئي خدمة اختبار بنفسك. reporter=list يعرض نتائج نصية.

```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 60000,
  fullyParallel: false,
  use: {
    baseURL: process.env.HATIM_TEST_URL ?? "http://127.0.0.1:8000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1100 },
      },
    },
  ],
  reporter: "list",
});
```

## تأكدي من فهمك

اختاري مقطعًا واشرحي مدخلاته ونتيجته وما الذي يغيّره. ثم اكتبي مثالًا أصغر بنفس الفكرة في مجلد تدريب، واذكري ما يجب اختباره قبل دمجه.
