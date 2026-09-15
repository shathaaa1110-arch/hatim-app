# شرح `scripts/public-test.mjs`

[فهرس الكود](README.ar.md) · [دروس البداية](../README.ar.md) · [قاموس الرموز](../01-foundations.ar.md) · [التنسيق](../08-components.ar.md)

المصدر: [الملف في النسخة المرجعية](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/scripts/public-test.mjs) · [الملف المحلي](../../../scripts/public-test.mjs). عدد الأسطر: 159. المقاطع التالية تعرض المصدر نفسه دون تعديل، والشرح خارج الكود.

## أدوات النفق

[الأسطر 1–5](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/scripts/public-test.mjs#L1): spawn لإطلاق عمليات تبقى حية، و fs لتحديث env العام، و net لفحص المنفذ. هذا تشغيل تطوير على الماك، لا كود يعمل داخل iPhone.

```javascript
import { spawn } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";

```

## اختبار المنفذ قبل البدء

[الأسطر 6–45](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/scripts/public-test.mjs#L6): نحاول فتح 8000 مؤقتًا ثم نغلقه. إذا كان مشغولًا لا نفترض أنه خادم حاتم؛ نقرأ health ونتأكد من Python و PostgreSQL والإصدار والكتالوج، ثم نتأكد من وجود صفحة HTML. غير ذلك نخرج بخطأ.

```javascript
const root = fileURLToPath(new URL("..", import.meta.url));
process.chdir(root);
// Reuse a healthy Hatim backend when only its temporary tunnel needs restarting.
const reuseBackend = await new Promise((resolve, reject) => {
  const server = createServer();
  server.once("error", reject);
  server.listen(8000, "127.0.0.1", () => server.close(() => resolve(false)));
}).catch(async (error) => {
  if (error.code === "EADDRINUSE") {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/health", {
        signal: AbortSignal.timeout(3000),
      });
      const health = await response.json();
      if (
        response.ok &&
        health.status === "ok" &&
        health.version === "1.0.0" &&
        health.backend === "python" &&
        health.database === "postgresql" &&
        health.catalog_mode === "fictional-demo"
      ) {
        const web = await fetch("http://127.0.0.1:8000/", {
          signal: AbortSignal.timeout(3000),
        });
        if (web.ok && web.headers.get("content-type")?.includes("text/html")) {
          console.log("Reusing the running Hatim API on port 8000.");
          return true;
        }
      }
    } catch {
      // A busy port alone does not identify a usable Hatim backend.
    }
  }
  console.error(
    "Port 8000 is unavailable or is not serving Hatim and its web companion. Stop that server, then retry.",
  );
  process.exit(1);
});

```

## تعقب العمليات التي بدأناها

[الأسطر 46–55](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/scripts/public-test.mjs#L46): children مجموعة العمليات التي يملكها السكربت. stop يرسل SIGTERM لها فقط، و closing يمنع تكرار الإيقاف. API سابقة أعيد استخدامها و PostgreSQL لا تدخلان المجموعة.

```javascript
const children = new Set();
let closing = false;
function stop(code = 0) {
  if (closing) return;
  closing = true;
  for (const child of children) child.kill("SIGTERM");
  process.exitCode = code;
}
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
```

## دالة الإطلاق

[الأسطر 56–66](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/scripts/public-test.mjs#L56): launch توحد cwd و env و stdio، وتراقب خطأ البدء والخروج. الحدث exit يزيل العملية من children حتى لا نحاول إيقاف عملية انتهت.

```javascript
function launch(command, args, stdio = "inherit") {
  const child = spawn(command, args, { cwd: root, env: process.env, stdio });
  children.add(child);
  child.on("error", (error) => {
    console.error(error.message);
    stop(1);
  });
  child.on("exit", () => children.delete(child));
  return child;
}

```

## فتح Cloudflare

[الأسطر 67–84](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/scripts/public-test.mjs#L67): نختار .tools/cloudflared إن وجد وإلا cloudflared على PATH. النفق يوجه HTTPS العام إلى HTTP محلي 8000 باستعمال http2. stdout/stderr متاحان للعثور على الرابط.

```javascript
const binary = existsSync(".tools/cloudflared")
  ? ".tools/cloudflared"
  : "cloudflared";
const tunnel = launch(
  binary,
  [
    "tunnel",
    "--url",
    "http://127.0.0.1:8000",
    "--no-autoupdate",
    "--protocol",
    "http2",
  ],
  ["ignore", "pipe", "pipe"],
);
tunnel.on("exit", () => {
  if (!closing) stop(1);
});
```

## انتظار الرابط

[الأسطر 85–110](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/scripts/public-test.mjs#L85): Promise تنتظر نصًا يطابق trycloudflare.com. مؤقت 45 ثانية يرفض انتظارًا بلا نهاية. إخفاق/خروج النفق ينهي تشغيل العمليات التابعة. regex هنا يقرأ خرج أداة معروفة، لا يصنع رمز دعوة.

```javascript
const origin = await new Promise((resolve, reject) => {
  const timeout = setTimeout(
    () =>
      reject(new Error("Cloudflare did not return a URL within 45 seconds.")),
    45000,
  );
  function inspect(chunk) {
    const text = chunk.toString();
    process.stdout.write(text);
    const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    if (match) {
      clearTimeout(timeout);
      resolve(match[0]);
    }
  }
  tunnel.stdout.on("data", inspect);
  tunnel.stderr.on("data", inspect);
  tunnel.once("error", reject);
  tunnel.once("exit", () => {
    clearTimeout(timeout);
    reject(new Error("Tunnel stopped."));
  });
}).catch((error) => {
  console.error(error.message);
  stop(1);
});
```

## حفظ العنوان العام

[الأسطر 111–123](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/scripts/public-test.mjs#L111): نقرأ root .env.local إن وجد، ونزيل سطر EXPO_PUBLIC_API_URL السابق فقط، ثم نكتب العنوان الجديد مع بقية الإعدادات. هذا ليس backend/.env.local الذي يحوي DBURL.

```javascript
if (!closing) {
  const existing = existsSync(".env.local")
    ? readFileSync(".env.local", "utf8")
    : "";
  const otherSettings = existing
    .split("\n")
    .filter((line) => !/^EXPO_PUBLIC_API_URL=/.test(line))
    .join("\n")
    .trimEnd();
  writeFileSync(
    ".env.local",
    `${otherSettings}${otherSettings ? "\n" : ""}EXPO_PUBLIC_API_URL=${origin}\n`,
  );
```

## تثبيت Python حسب القفل

[الأسطر 124–129](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/scripts/public-test.mjs#L124): uv sync --locked يلتزم uv.lock. ننتظر خروج العملية قبل بناء الويب، ونتوقف إن فشلت.

```javascript
  const compile = launch("uv", ["sync", "--project", "backend", "--locked"]);
  const compiled = await new Promise((resolve) =>
    compile.once("exit", resolve),
  );
  if (compiled !== 0) stop(1);
}
```

## بناء الواجهة

[الأسطر 130–134](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/scripts/public-test.mjs#L130): web:build ينتج dist. يجب أن توجد عند بدء FastAPI كي يركب خادم الملفات الثابتة. لا يُنشر Metro عبر هذه الآلية.

```javascript
if (!closing) {
  const build = launch("npm", ["run", "web:build"]);
  const code = await new Promise((resolve) => build.once("exit", resolve));
  if (code !== 0) stop(1);
  else {
```

## بدء API عند الحاجة

[الأسطر 135–154](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/scripts/public-test.mjs#L135): إذا لم نعد استخدام API قائمة، نطلق uvicorn مع env الخادم و host loopback و port8000. نراقب خروجها لإيقاف النفق. إعادة استخدام عملية قائمة لا تحمل كود backend المعدل تلقائيًا.

```javascript
    if (!reuseBackend) {
      const server = launch("uv", [
        "run",
        "--project",
        "backend",
        "--env-file",
        "backend/.env.local",
        "uvicorn",
        "hatim.main:app",
        "--app-dir",
        "backend",
        "--host",
        "127.0.0.1",
        "--port",
        "8000",
      ]);
      server.on("exit", () => {
        if (!closing) stop(1);
      });
    }
```

## إرشاد التشغيل

[الأسطر 155–159](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/scripts/public-test.mjs#L155): الطباعة توضح ضرورة إبقاء الطرفية مفتوحة وإعادة بناء نسخة الهاتف لتحديث العنوان. رمز الدعوة يبقى في PostgreSQL، أما نطاق Quick Tunnel فيتغير.

```javascript
    console.log(
      `\nPublic companion: ${origin}\nPublic origin saved to .env.local. Rebuild the native app to update invitations and the physical iPhone connection. The iOS simulator uses localhost.\nKeep this terminal open. Ctrl+C stops the tunnel${reuseBackend ? "; the existing API keeps running" : " and API"}.\n`,
    );
  }
}
```

## تأكدي من فهمك

اختاري مقطعًا واشرحي مدخلاته ونتيجته وما الذي يغيّره. ثم اكتبي مثالًا أصغر بنفس الفكرة في مجلد تدريب، واذكري ما يجب اختباره قبل دمجه.
