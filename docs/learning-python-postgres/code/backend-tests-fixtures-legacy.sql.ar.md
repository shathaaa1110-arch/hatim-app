# شرح `backend/tests/fixtures/legacy.sql`

[فهرس الكود](README.ar.md) · [دروس البداية](../README.ar.md) · [قاموس الرموز](../01-foundations.ar.md) · [التنسيق](../08-components.ar.md)

المصدر: [الملف في النسخة المرجعية](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/tests/fixtures/legacy.sql) · [الملف المحلي](../../../backend/tests/fixtures/legacy.sql). عدد الأسطر: 17. المقاطع التالية تعرض المصدر نفسه دون تعديل، والشرح خارج الكود.

## بداية fixture قديمة

[الأسطر 1–1](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/tests/fixtures/legacy.sql#L1): هذه SQLite اصطناعية للاختبار فقط. BEGIN تجمع تعريفات وبيانات المصدر. PostgreSQL الحالية لا تشغّل هذا المخطط.

```sql
BEGIN TRANSACTION;
```

## groups القديمة

[الأسطر 2–6](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/tests/fixtures/legacy.sql#L2): Settings كانت TEXT تحوي JSON و created_at نصًا. هذا يشرح لماذا يحول importer النوعين إلى JSONB و TIMESTAMPTZ.

```sql
CREATE TABLE groups (
                id TEXT PRIMARY KEY, title TEXT NOT NULL,
                invite_code TEXT UNIQUE NOT NULL, owner_hash TEXT UNIQUE NOT NULL,
                settings TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
```

## مجموعة نموذجية

[الأسطر 7–7](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/tests/fixtures/legacy.sql#L7): صف اصطناعي بمعرفات وبصمة مفتاح اختبار معروف في test_postgres. completed fire يختبر حفظ الاستهلاك خلال النقل؛ ليس بيانات شخص حقيقي.

```sql
INSERT INTO "groups" VALUES('legacy-group','مجموعة قبل النقل','legacy-invite','ed51e21f686024fd7893a149127750f1928d542627f8e199b3f3759cf484dd2f','{"slots":3,"anchor_id":"fire","pocket_ids":[],"completed_ids":["fire"]}','2026-09-14 07:53:26');
```

## members القديمة

[الأسطر 8–13](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/tests/fixtures/legacy.sql#L8): organizer عدد 0 أو 1 و preferences نص JSON. العلاقة group_id موجودة؛ importer يحافظ على القيمة ويحوّل النوع.

```sql
CREATE TABLE members (
                id TEXT PRIMARY KEY, group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
                token_hash TEXT UNIQUE NOT NULL, preferences TEXT NOT NULL,
                organizer INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
```

## عضوان بوقت متساوٍ

[الأسطر 14–15](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/tests/fixtures/legacy.sql#L14): المنظّم أمل والعضو بدر بوقت واحد يختبران حفظ ترتيب rowid القديم في sequence الجديدة. هذه مفاتيح اختبار وليست أسرار تشغيل.

```sql
INSERT INTO "members" VALUES('legacy-owner','legacy-group','febe1d741b49e5a9c31526728d8c5134a803adfc4c04c4f052673722ed85597e','{"name":"أمل","role":"مقيم","cuisines":["سعودي"],"allergies":[],"vegetarian":false,"mild":false,"budget":200}',1,'2026-09-14 07:53:26');
INSERT INTO "members" VALUES('legacy-member','legacy-group','e66c4d5b4b907d11719382862dcc12768848d0bc86cf7d2c319bcd946edd19f5','{"name":"بدر","role":"مقيم","cuisines":[],"allergies":[],"vegetarian":true,"mild":false,"budget":200}',0,'2026-09-14 07:53:26');
```

## الفهرس وإنهاء المعاملة

[الأسطر 16–17](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/tests/fixtures/legacy.sql#L16): فهرس group_id يخدم القراءة، و COMMIT تثبت fixture في مصدر الاختبار. ليست أمرًا لحذف أو إعادة تهيئة قاعدة التطبيق.

```sql
CREATE INDEX members_group ON members(group_id);
COMMIT;
```

## تأكدي من فهمك

اختاري مقطعًا واشرحي مدخلاته ونتيجته وما الذي يغيّره. ثم اكتبي مثالًا أصغر بنفس الفكرة في مجلد تدريب، واذكري ما يجب اختباره قبل دمجه.
