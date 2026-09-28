# شرح `scripts/database.mjs`

[فهرس الكود](README.ar.md) · [دروس البداية](../README.ar.md) · [قاموس الرموز](../01-foundations.ar.md) · [التنسيق](../08-components.ar.md)

المصدر: [الملف في النسخة المرجعية](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/scripts/database.mjs) · [الملف المحلي](../../../scripts/database.mjs). عدد الأسطر: 44. المقاطع التالية تعرض المصدر نفسه دون تعديل، والشرح خارج الكود.

## أدوات Node للتشغيل

[الأسطر 1–6](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/scripts/database.mjs#L1): randomBytes تولد كلمة مرور عشوائية، و spawnSync يشغل docker. fs لقراءة/إنشاء ملفات الإعداد، و parseEnv لقراءة صيغة env، و fileURLToPath لتحويل مكان السكربت إلى مسار.

```javascript
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { fileURLToPath } from "node:url";

```

## تحديد العمل

[الأسطر 7–14](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/scripts/database.mjs#L7): root هو جذر المشروع مستقلًا عن مكان الطرفية. action هو وسيط CLI أو up افتراضيًا. commands قائمة أعمال مسموحة؛ ليست نص أمر حر من المستخدم.

```javascript
const root = fileURLToPath(new URL("..", import.meta.url));
process.chdir(root);
const action = process.argv[2] ?? "up";
const commands = {
  up: ["up", "--detach", "--wait", "postgres"],
  stop: ["stop", "postgres"],
  status: ["ps", "postgres"],
};
```

## رفض أمر غير معروف

[الأسطر 15–18](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/scripts/database.mjs#L15): Object.hasOwn يفحص مفتاح commands. الخطأ ينهي البرنامج برمز 1 بدل تشغيل قيمة غير معروفة.

```javascript
if (!Object.hasOwn(commands, action)) {
  console.error("Usage: node scripts/database.mjs [up|stop|status]");
  process.exit(1);
}
```

## إنشاء إعداد خاص عند الحاجة

[الأسطر 19–26](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/scripts/database.mjs#L19): في up فقط، وإذا لم يوجد الملف، يولد POSTGRES_PASSWORD من 32 بايت عشوائي ويحفظ الملف بصلاحية 0600 و flag=wx التي ترفض استبدال ملف موجود. محتواه ليس للشحن في تطبيق الهاتف أو Git.

```javascript
if (action === "up") {
  if (!existsSync(".env.postgres.local")) {
    writeFileSync(
      ".env.postgres.local",
      `POSTGRES_USER=hatim\nPOSTGRES_DB=hatim\nPOSTGRES_PASSWORD=${randomBytes(32).toString("hex")}\n`,
      { mode: 0o600, flag: "wx" },
    );
  }
```

## رابط اتصال الخادم

[الأسطر 27–38](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/scripts/database.mjs#L27): نقرأ إعداد PostgreSQL المحلي ونرمز أجزاء URL باستخدام encodeURIComponent. نكتب DATABASE_URL في backend/.env.local إذا كان غير موجود. ملف موجود يظل اختيار صاحبة المشروع؛ لا نطبع كلمة المرور.

```javascript
  if (!existsSync("backend/.env.local")) {
    const settings = parseEnv(readFileSync(".env.postgres.local", "utf8"));
    const user = encodeURIComponent(settings.POSTGRES_USER);
    const password = encodeURIComponent(settings.POSTGRES_PASSWORD);
    const database = encodeURIComponent(settings.POSTGRES_DB);
    writeFileSync(
      "backend/.env.local",
      `DATABASE_URL=postgresql://${user}:${password}@127.0.0.1:5432/${database}\n`,
      { mode: 0o600, flag: "wx" },
    );
  }
}
```

## تشغيل Docker Compose

[الأسطر 39–44](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/scripts/database.mjs#L39): نمرر command و args كقائمة إلى spawnSync مع stdio=inherit كي ترى الطرفية نتيجة Docker. exitCode ينقل نجاح/فشل العملية. stop يحافظ على volume، ولا ينفذ حذف بيانات.

```javascript
const result = spawnSync("docker", ["compose", ...commands[action]], {
  cwd: root,
  stdio: "inherit",
});
if (result.error) console.error(result.error.message);
process.exitCode = result.status ?? 1;
```

## تأكدي من فهمك

اختاري مقطعًا واشرحي مدخلاته ونتيجته وما الذي يغيّره. ثم اكتبي مثالًا أصغر بنفس الفكرة في مجلد تدريب، واذكري ما يجب اختباره قبل دمجه.
