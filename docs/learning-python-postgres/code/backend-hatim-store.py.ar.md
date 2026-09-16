# شرح `backend/hatim/store.py`

[فهرس الكود](README.ar.md) · [دروس البداية](../README.ar.md) · [قاموس الرموز](../01-foundations.ar.md) · [التنسيق](../08-components.ar.md)

المصدر: [الملف في النسخة المرجعية](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/store.py) · [خريطة الملفات الحالية](../../architecture-modules.ar.md). عدد الأسطر: 60. المقاطع التالية تعرض المصدر نفسه دون تعديل، والشرح خارج الكود.

## المكتبات

[الأسطر 1–11](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/store.py#L1): hashlib للبصمة و os للبيئة و Path للملفات. contextmanager يحول مولدًا إلى سياق with. psycopg هو driver PostgreSQL، و dict_row تجعل الصفوف قواميس.

```python
"""PostgreSQL persistence. Each operation owns one connection and transaction."""

import hashlib
import os
from contextlib import contextmanager
from pathlib import Path

import psycopg
from psycopg.rows import dict_row


```

## بصمة الرمز

[الأسطر 12–15](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/store.py#L12): encode تحول النص إلى bytes، sha256 تحسب البصمة، و hexdigest تحولها إلى تمثيل سداسي نصي. تستعمل لرموز وصول عشوائية ولمحتوى ملفات الترحيل، وليست تجزئة كلمات مرور بشرية.

```python
def digest(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


```

## عنوان قاعدة البيانات

[الأسطر 16–22](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/store.py#L16): نقرأ DATABASE_URL من البيئة فقط. إذا لم يوجد نرفع RuntimeError واضحة. لا نستخدم SQLite احتياطيًا ولا نكشف كلمة مرور في النص.

```python
def database_url() -> str:
    value = os.environ.get("DATABASE_URL")
    if not value:
        raise RuntimeError("DATABASE_URL is required. Run npm run db:up or configure PostgreSQL.")
    return value


```

## الاتصال والمعاملة

[الأسطر 23–33](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/store.py#L23): النجمة تجعل read_only معاملًا مسمى. اتصال psycopg داخل with يثبت عند النجاح ويتراجع عند الاستثناء ويغلق. القارئ يطلب لقطة repeatable read، والجميع يحدد مهلة استعلام وانتظار قفل. yield يسلم db إلى الكود داخل with connect ثم يستأنف التنظيف عند خروجه.

```python
@contextmanager
def connect(*, read_only: bool = False):
    with psycopg.connect(database_url(), row_factory=dict_row, connect_timeout=5) as db:
        # Read responses use one snapshot. Writers lock their group before any changes.
        if read_only:
            db.execute("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY")
        db.execute("SET LOCAL statement_timeout = '10s'")
        db.execute("SET LOCAL lock_timeout = '10s'")
        yield db


```

## بدء الترحيلات

[الأسطر 34–38](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/store.py#L34): Path(__file__) مكان ملف store، و parents[1] هو backend. نحدد مجلد migrations ونأخذ advisory lock داخل المعاملة لمنع تداخل تهيئة أكثر من عامل.

```python
def initialize():
    migrations = Path(__file__).parents[1] / "migrations"
    with connect() as db:
        # Serialize startup across workers, including first-time schema creation.
        db.execute("SELECT pg_advisory_xact_lock(734821910)")
```

## تاريخ المخطط

[الأسطر 39–45](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/store.py#L39): CREATE TABLE IF NOT EXISTS لا يمحو الجدول إذا وجد. يسجل اسم migration وبصمتها وتاريخها. تنشأ هذه الطاولة خارج ملفات migrations كي يستطيع النظام تتبعها منذ البداية.

```python
        db.execute("""
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version TEXT PRIMARY KEY,
                checksum TEXT NOT NULL,
                applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """)
```

## تنفيذ الجديد ورفض تغيير القديم

[الأسطر 46–60](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/store.py#L46): glob يجد ملفات SQL و sorted يرتب أسماءها. نقرأ المحتوى ونبصمه ونبحث عن تطبيق سابق. إن تطابقت البصمة continue، وإن اختلفت نرفض. الجديد ينفذ ثم يسجل في نفس المعاملة؛ لا يسجل نجاحًا ل SQL فاشلة.

```python
        for file in sorted(migrations.glob("*.sql")):
            source = file.read_text(encoding="utf-8")
            checksum = digest(source)
            applied = db.execute(
                "SELECT checksum FROM schema_migrations WHERE version=%s", (file.name,)
            ).fetchone()
            if applied:
                if applied["checksum"] != checksum:
                    raise RuntimeError(f"Applied migration changed: {file.name}")
                continue
            db.execute(source)
            db.execute(
                "INSERT INTO schema_migrations(version,checksum) VALUES(%s,%s)",
                (file.name, checksum),
            )
```

## تأكدي من فهمك

اختاري مقطعًا واشرحي مدخلاته ونتيجته وما الذي يغيّره. ثم اكتبي مثالًا أصغر بنفس الفكرة في مجلد تدريب، واذكري ما يجب اختباره قبل دمجه.
