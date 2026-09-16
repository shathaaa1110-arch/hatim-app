# شرح `backend/hatim/import_sqlite.py`

[فهرس الكود](README.ar.md) · [دروس البداية](../README.ar.md) · [قاموس الرموز](../01-foundations.ar.md) · [التنسيق](../08-components.ar.md)

المصدر: [الملف في النسخة المرجعية](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/import_sqlite.py) · [خريطة الملفات الحالية](../../architecture-modules.ar.md). عدد الأسطر: 115. المقاطع التالية تعرض المصدر نفسه دون تعديل، والشرح خارج الكود.

## أداة نقل فقط

[الأسطر 1–16](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/import_sqlite.py#L1): sqlite3 مكتبة Python القياسية لقراءة المصدر القديم، لا مخزن التشغيل الحالي. argparse لقراءة اسم الملف و closing لإغلاق الاتصالات و UTC لتحويل الوقت و uuid4 لأسماء backup.

```python
"""One-time, non-destructive import of a legacy SQLite store into empty PostgreSQL."""

import argparse
import sqlite3
from contextlib import closing
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from psycopg.types.json import Jsonb

from .catalog import CATALOG_IDS
from .models import Preferences, Settings
from .store import connect, initialize


```

## نسخة مصدر آمنة

[الأسطر 17–35](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/import_sqlite.py#L17): resolve(strict=True) يرفض مسارًا غير موجود. ننشئ مجلدًا خاصًا واسم backup لا يتصادم، وملفًا بصلاحيات خاصة. URI mode=ro يفتح المصدر قراءة فقط، و backup تنسخ حالة SQLite المتسقة بما فيها WAL الملتزم. نقرأ من النسخة ثم نرتب ب created_at,rowid.

```python
def import_database(source: Path) -> tuple[int, int, Path]:
    source = source.resolve(strict=True)
    backup_dir = source.parent / "backups"
    backup_dir.mkdir(mode=0o700, exist_ok=True)
    backup = (
        backup_dir / f"before-postgres-{datetime.now(UTC):%Y%m%dT%H%M%SZ}-{uuid4().hex}.sqlite3"
    )
    backup.touch(mode=0o600, exist_ok=False)
    # SQLite's backup API includes committed WAL data without changing the source.
    with (
        closing(sqlite3.connect(f"{source.as_uri()}?mode=ro", uri=True)) as old,
        closing(sqlite3.connect(backup)) as snapshot,
    ):
        old.backup(snapshot)
    with closing(sqlite3.connect(f"{backup.as_uri()}?mode=ro", uri=True)) as snapshot:
        snapshot.row_factory = sqlite3.Row
        groups = snapshot.execute("SELECT * FROM groups ORDER BY created_at,rowid").fetchall()
        members = snapshot.execute("SELECT * FROM members ORDER BY created_at,rowid").fetchall()

```

## وجهة فارغة مقفلة

[الأسطر 36–45](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/import_sqlite.py#L36): نهيئ مخطط PostgreSQL ثم نقفل الجدولين أثناء النقل. EXISTS يرفض الوجهة المستخدمة بدل استبدال بياناتها. أي استثناء داخل المعاملة يرجع جميع الإدخالات.

```python
    initialize()
    with connect() as db:
        # Refuse merging/overwriting a live destination, and serialize concurrent imports.
        db.execute("LOCK TABLE groups, members IN ACCESS EXCLUSIVE MODE")
        if db.execute(
            "SELECT EXISTS(SELECT 1 FROM groups) OR EXISTS(SELECT 1 FROM members) AS used"
        ).fetchone()["used"]:
            raise RuntimeError(
                "Destination is not empty; import refused. No PostgreSQL rows changed."
            )
```

## نقل المجموعات

[الأسطر 46–64](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/import_sqlite.py#L46): لكل صف نفحص Settings ونضمن ids من الكتالوج. نمرر القيم القديمة نفسها بما فيها id والدعوة وبصمة الإدارة والوقت، ونحوّل JSON النصية إلى Jsonb. لا نولد مفاتيح بديلة.

```python
        for row in groups:
            settings = Settings.model_validate_json(row["settings"])
            ids = set(settings.pocket_ids + settings.completed_ids)
            if settings.anchor_id is not None:
                ids.add(settings.anchor_id)
            if not ids <= CATALOG_IDS:
                raise ValueError("Legacy settings contain unknown experience IDs.")
            db.execute(
                "INSERT INTO groups(id,title,invite_code,owner_hash,settings,created_at) "
                "VALUES(%s,%s,%s,%s,%s,%s)",
                (
                    row["id"],
                    row["title"],
                    row["invite_code"],
                    row["owner_hash"],
                    Jsonb(settings.model_dump()),
                    timestamp(row["created_at"]),
                ),
            )
```

## نقل الأعضاء

[الأسطر 65–78](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/import_sqlite.py#L65): نفحص Preferences ونحوّل رقم organizer القديم إلى bool ونحفظ الوقت. ترتيب الإدخال يولد sequence بحسب الترتيب القديم. group_id يربط نفس المجموعات المنقولة.

```python
        for row in members:
            preferences = Preferences.model_validate_json(row["preferences"])
            db.execute(
                "INSERT INTO members(id,group_id,token_hash,preferences,organizer,created_at) "
                "VALUES(%s,%s,%s,%s,%s,%s)",
                (
                    row["id"],
                    row["group_id"],
                    row["token_hash"],
                    Jsonb(preferences.model_dump()),
                    bool(row["organizer"]),
                    timestamp(row["created_at"]),
                ),
            )
```

## مقارنة قبل commit

[الأسطر 79–103](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/import_sqlite.py#L79): نقرأ الوجهة ونبني قاموس expected_groups حسب id. نوحّد أنواع JSON والوقت ثم نقارن كل الحقول. zip(strict=True) يرفض اختلاف أطوال قائمة الأعضاء. نحذف sequence من نسخة المقارنة فقط لأنها جديدة، ونفحص عدد المجموعات أيضًا. return يحصل بعد نجاح الخروج من with.

```python
        # Verify the complete persisted content before committing the import.
        actual_groups = db.execute("SELECT * FROM groups").fetchall()
        actual_members = db.execute("SELECT * FROM members ORDER BY created_at,sequence").fetchall()
        expected_groups = {row["id"]: dict(row) for row in groups}
        for row in actual_groups:
            expected = expected_groups[row["id"]]
            expected["settings"] = Settings.model_validate_json(expected["settings"]).model_dump()
            expected["created_at"] = timestamp(expected["created_at"])
            if row != expected:
                raise RuntimeError("Group verification failed; import rolled back.")
        for row, expected_row in zip(actual_members, members, strict=True):
            expected = dict(expected_row)
            expected["preferences"] = Preferences.model_validate_json(
                expected["preferences"]
            ).model_dump()
            expected["organizer"] = bool(expected["organizer"])
            expected["created_at"] = timestamp(expected["created_at"])
            row.pop("sequence")
            if row != expected:
                raise RuntimeError("Member verification failed; import rolled back.")
        if len(actual_groups) != len(groups):
            raise RuntimeError("Group count verification failed; import rolled back.")
    return len(groups), len(members), backup


```

## الوقت

[الأسطر 104–108](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/import_sqlite.py#L104): fromisoformat تقرأ النص إلى datetime. إن لم يكن timezone محددًا نفترض UTC للمصدر القديم؛ لا نضيف ساعات الرياض يدويًا.

```python
def timestamp(value: str) -> datetime:
    parsed = datetime.fromisoformat(value)
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=UTC)


```

## تشغيل من الطرفية

[الأسطر 109–115](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/import_sqlite.py#L109): شرط __name__ يجعل CLI تعمل فقط عند تشغيل الوحدة مباشرة. نطلب source ك Path، ثم نطبع العدد ومكان backup فقط. بناء جديد فارغ لا يحتاج هذه الأداة.

```python
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help="Legacy SQLite file; stop the old API first.")
    args = parser.parse_args()
    count_groups, count_members, backup = import_database(args.source)
    print(f"Imported and verified {count_groups} groups and {count_members} members.")
    print(f"Original database unchanged. Backup: {backup}")
```

## تأكدي من فهمك

اختاري مقطعًا واشرحي مدخلاته ونتيجته وما الذي يغيّره. ثم اكتبي مثالًا أصغر بنفس الفكرة في مجلد تدريب، واذكري ما يجب اختباره قبل دمجه.
