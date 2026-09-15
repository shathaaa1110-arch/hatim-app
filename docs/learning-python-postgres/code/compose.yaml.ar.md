# شرح `compose.yaml`

[فهرس الكود](README.ar.md) · [دروس البداية](../README.ar.md) · [قاموس الرموز](../01-foundations.ar.md) · [التنسيق](../08-components.ar.md)

المصدر: [الملف في النسخة المرجعية](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/compose.yaml) · [الملف المحلي](../../../compose.yaml). عدد الأسطر: 17. المقاطع التالية تعرض المصدر نفسه دون تعديل، والشرح خارج الكود.

## خدمة PostgreSQL محلية

[الأسطر 1–17](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/compose.yaml#L1): name تثبت اسم مشروع Compose. صورة postgres:18.4-alpine تحدد محرك القاعدة. env_file تشير إلى الملف الخاص. ports تربط 5432 بالماك على loopback فقط. volume تحفظ البيانات بعد توقف الحاوية. healthcheck تستعمل pg_isready؛ $$ تبقي المتغير لكي يفسره shell الحاوية بدل Compose. restart تعيد الخدمة عند الحاجة ما لم توقفيها. لا توجد خدمة FastAPI داخل Compose الحالية؛ يشغلها uv منفصلة.

```yaml
name: hatim
services:
  postgres:
    image: postgres:18.4-alpine
    env_file: .env.postgres.local
    ports:
      - "127.0.0.1:5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U \"$$POSTGRES_USER\" -d \"$$POSTGRES_DB\""]
      interval: 2s
      timeout: 3s
      retries: 30
    restart: unless-stopped
volumes:
  postgres_data:
```

## تأكدي من فهمك

اختاري مقطعًا واشرحي مدخلاته ونتيجته وما الذي يغيّره. ثم اكتبي مثالًا أصغر بنفس الفكرة في مجلد تدريب، واذكري ما يجب اختباره قبل دمجه.
