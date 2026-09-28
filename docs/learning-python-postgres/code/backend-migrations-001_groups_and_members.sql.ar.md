# شرح `backend/migrations/001_groups_and_members.sql`

[فهرس الكود](README.ar.md) · [دروس البداية](../README.ar.md) · [قاموس الرموز](../01-foundations.ar.md) · [التنسيق](../08-components.ar.md)

المصدر: [الملف في النسخة المرجعية](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/migrations/001_groups_and_members.sql) · [خريطة الملفات الحالية](../../architecture-modules.ar.md). عدد الأسطر: 21. المقاطع التالية تعرض المصدر نفسه دون تعديل، والشرح خارج الكود.

## جدول المجموعات

[الأسطر 1–9](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/migrations/001_groups_and_members.sql#L1): كل سطر اسم عمود ونوع وقيود. id المفتاح، title الاسم، invite_code رابط الدعوة، owner_hash بصمة الإدارة، settings كائن JSONB يفحص نوعه العام، و created_at وقت الخادم. فاصلة تفصل الأعمدة والفاصلة المنقوطة تنهي SQL.

```sql
CREATE TABLE groups (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    invite_code TEXT NOT NULL UNIQUE,
    owner_hash TEXT NOT NULL UNIQUE,
    settings JSONB NOT NULL CHECK (jsonb_typeof(settings) = 'object'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

```

## جدول الأعضاء

[الأسطر 10–19](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/migrations/001_groups_and_members.sql#L10): group_id يربط ب groups مع حذف الأعضاء تبعًا لحذف المجموعة في DB. token_hash فريدة، preferences كائن، organizer boolean، والتوقيت مع sequence مولدة لحفظ ترتيب التعادل. الجدول ليس users لحسابات مستقلة.

```sql
CREATE TABLE members (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    preferences JSONB NOT NULL CHECK (jsonb_typeof(preferences) = 'object'),
    organizer BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sequence BIGINT GENERATED ALWAYS AS IDENTITY
);

```

## الفهارس

[الأسطر 20–21](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/migrations/001_groups_and_members.sql#L20): فهرس المجموعة والوقت والترتيب يساند القراءة المرتبة. الفهرس UNIQUE الجزئي يطبق على الصفوف التي organizer=true فقط، فيمنع وجود منظّمين اثنين للمجموعة. لا يفرض العدد 12؛ ذلك في معاملة API.

```sql
CREATE INDEX members_group ON members(group_id, created_at, sequence);
CREATE UNIQUE INDEX one_organizer_per_group ON members(group_id) WHERE organizer;
```

## تأكدي من فهمك

اختاري مقطعًا واشرحي مدخلاته ونتيجته وما الذي يغيّره. ثم اكتبي مثالًا أصغر بنفس الفكرة في مجلد تدريب، واذكري ما يجب اختباره قبل دمجه.
