# شرح `backend/tests/test_postgres.py`

[فهرس الكود](README.ar.md) · [دروس البداية](../README.ar.md) · [قاموس الرموز](../01-foundations.ar.md) · [التنسيق](../08-components.ar.md)

المصدر: [الملف في النسخة المرجعية](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/tests/test_postgres.py) · [الملف المحلي](../../../backend/tests/test_postgres.py). عدد الأسطر: 205. المقاطع التالية تعرض المصدر نفسه دون تعديل، والشرح خارج الكود.

## أدوات التكامل

[الأسطر 1–14](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/tests/test_postgres.py#L1): نستخدم خادم PostgreSQL الحقيقي مع fixtures المعزولة. sqlite3 هنا لبناء مصدر قديم اصطناعي للاختبار. ThreadPoolExecutor يرسل محاولات متزامنة.

```python
import sqlite3
from concurrent.futures import ThreadPoolExecutor
from contextlib import closing
from pathlib import Path

import pytest
from psycopg.types.json import Jsonb
from test_api import create

from hatim.import_sqlite import import_database
from hatim.models import Settings
from hatim.store import connect, initialize


```

## health وفشل DB

[الأسطر 15–29](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/tests/test_postgres.py#L15): نتحقق من الرد الكامل ثم نوجه اتصال الاختبار إلى منفذ غير متاح. نتوقع 503 دون كشف نص الاتصال، ومع no-store. monkeypatch تعيد البيئة بعد الاختبار.

```python
def test_health_checks_postgresql_and_handles_connection_failure(client, monkeypatch):
    assert client.get("/api/health").json() == {
        "status": "ok",
        "version": "1.0.0",
        "catalog_mode": "fictional-demo",
        "backend": "python",
        "database": "postgresql",
    }
    monkeypatch.setenv("DATABASE_URL", "postgresql://invalid@127.0.0.1:1/invalid")
    response = client.get("/api/health")
    assert response.status_code == 503
    assert "invalid" not in response.text
    assert response.headers["cache-control"] == "no-store"


```

## سباق الانضمام

[الأسطر 30–41](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/tests/test_postgres.py#L30): 16 محاولة معًا ومجموعة فيها المنظّم:11 نجاحًا و 5 تعارض 409 وعدد نهائي 12. هذا يختبر فاعلية قفل صف المجموعة؛ اختبار طلبات متتالية لا يكشف نفس السباق.

```python
def test_concurrent_joins_stay_below_capacity(client):
    group, _ = create(client)
    path = f"/api/invites/{group['invite_code']}/members"
    with ThreadPoolExecutor(max_workers=16) as pool:
        statuses = list(
            pool.map(lambda n: client.post(path, json={"name": f"عضو {n}"}).status_code, range(16))
        )
    assert statuses.count(201) == 11
    assert statuses.count(409) == 5
    assert len(client.get(f"/api/invites/{group['invite_code']}").json()["member_names"]) == 12


```

## تراجع ولقطة قراءة

[الأسطر 42–60](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/tests/test_postgres.py#L42): نرمي RuntimeError داخل معاملة ونثبت أن الصف لم يبق. بعدها قارئ REPEATABLE READ يحتفظ بعدده القديم رغم commit من كاتب آخر، ثم اتصال جديد يرى الصف.

```python
def test_postgresql_transactions_rollback_and_read_consistent_snapshots(database):
    with pytest.raises(RuntimeError, match="cancel"), connect() as db:
        db.execute(
            "INSERT INTO groups(id,title,invite_code,owner_hash,settings) VALUES(%s,%s,%s,%s,%s)",
            ("rollback", "test", "rollback", "rollback", Jsonb(Settings().model_dump())),
        )
        raise RuntimeError("cancel")
    with connect(read_only=True) as reader:
        assert reader.execute("SELECT COUNT(*) AS n FROM groups").fetchone()["n"] == 0
        with connect() as writer:
            writer.execute(
                "INSERT INTO groups(id,title,invite_code,owner_hash,settings) VALUES(%s,%s,%s,%s,%s)",
                ("committed", "test", "committed", "committed", Jsonb(Settings().model_dump())),
            )
        assert reader.execute("SELECT COUNT(*) AS n FROM groups").fetchone()["n"] == 0
    with connect(read_only=True) as reader:
        assert reader.execute("SELECT COUNT(*) AS n FROM groups").fetchone()["n"] == 1


```

## تاريخ migrations

[الأسطر 61–70](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/tests/test_postgres.py#L61): تشغيل initialize مرتين لا يكرر التسجيل. تغيير checksum المخزنة عمدًا يجعل التهيئة التالية تفشل بدل قبول تاريخ مختلف بصمت.

```python
def test_migrations_are_repeatable_and_detect_edited_history(database):
    initialize()
    initialize()
    with connect() as db:
        assert db.execute("SELECT COUNT(*) AS n FROM schema_migrations").fetchone()["n"] == 1
        db.execute("UPDATE schema_migrations SET checksum='changed'")
    with pytest.raises(RuntimeError, match="Applied migration changed"):
        initialize()


```

## نقل متوافق للمصدر القديم

[الأسطر 71–102](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/tests/test_postgres.py#L71): tmp_path تستضيف SQLite اختبارية من fixture. نقارن بايتات المصدر ونفحص backup والمفاتيح والأسماء والترتيب والمكتمل وإمكان تعديل العضو. المحاولة الثانية ترفض وجهة مستخدمة دون فقد التعديل.

```python
def test_legacy_import_preserves_tokens_preferences_order_and_source(client, tmp_path):
    source = tmp_path / "legacy.sqlite3"
    with closing(sqlite3.connect(source)) as old:
        old.executescript((Path(__file__).parent / "fixtures" / "legacy.sql").read_text())
    before = source.read_bytes()
    groups, members, backup = import_database(source)
    assert (groups, members) == (1, 2)
    assert backup.is_file() and source.read_bytes() == before
    owner = {"Authorization": "Bearer legacy-owner-token"}
    member = {"Authorization": "Bearer legacy-member-token"}
    group = client.get("/api/groups/legacy-group", headers=owner).json()
    assert group["invite_code"] == "legacy-invite"
    assert group["settings"]["completed_ids"] == ["fire"]
    assert group["plan"]["consumed"] == 1
    assert [m["preferences"]["name"] for m in group["members"]] == ["أمل", "بدر"]
    assert client.get("/api/invites/legacy-invite/me", headers=member).json()["preferences"][
        "vegetarian"
    ]
    assert (
        client.put(
            "/api/invites/legacy-invite/me", headers=member, json={"name": "بدر", "budget": 90}
        ).status_code
        == 200
    )
    with pytest.raises(RuntimeError, match="not empty"):
        import_database(source)
    assert (
        client.get("/api/invites/legacy-invite/me", headers=member).json()["preferences"]["budget"]
        == 90
    )


```

## ذرية فشل النقل

[الأسطر 103–115](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/tests/test_postgres.py#L103): نفسد preferences في المصدر الاصطناعي ثم نتوقع فشلًا. نقرأ PostgreSQL ونثبت أن المجموعات والأعضاء كلاهما صفر؛ لا نصف عملية نقل.

```python
def test_invalid_legacy_import_is_atomic(client, tmp_path):
    source = tmp_path / "bad.sqlite3"
    with closing(sqlite3.connect(source)) as old:
        old.executescript((Path(__file__).parent / "fixtures" / "legacy.sql").read_text())
        old.execute("UPDATE members SET preferences='{}' WHERE organizer=0")
        old.commit()
    with pytest.raises(ValueError):
        import_database(source)
    with connect(read_only=True) as db:
        assert db.execute("SELECT COUNT(*) AS n FROM groups").fetchone()["n"] == 0
        assert db.execute("SELECT COUNT(*) AS n FROM members").fetchone()["n"] == 0


```

## Settings سيئة لا تغير المخزن

[الأسطر 116–139](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/tests/test_postgres.py#L116): parametrize تغطي أنواعًا غير صحيحة وقيما فارغة وتكرارًا وتداخلًا وحقولًا غير معروفة. نتحقق 422 ثم نقرأ القيمة السابقة 9 للتأكد أن الرفض سبق الكتابة.

```python
@pytest.mark.parametrize(
    "body",
    [
        {"slots": 1.5},
        {"slots": True},
        {"slots": "1"},
        {"anchor_id": ""},
        {"pocket_ids": [None]},
        {"pocket_ids": None},
        {"pocket_ids": [" "]},
        {"completed_ids": ["sushi", "sushi"]},
        {"pocket_ids": ["sushi"], "completed_ids": ["sushi"]},
        {"slots": 1, "admin": True},
    ],
)
def test_invalid_settings_do_not_change_stored_plan(client, body):
    group, auth = create(client)
    path = f"/api/groups/{group['id']}/settings"
    response = client.put(path, headers=auth, json=body)
    assert response.status_code == 422
    assert isinstance(response.json()["detail"], str)
    assert client.get(f"/api/groups/{group['id']}", headers=auth).json()["settings"]["slots"] == 9


```

## أنواع Preferences

[الأسطر 140–157](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/tests/test_postgres.py#L140): اختبارات null والأرقام بدل النص والقيم النصية بدل bool/int ومحاولة حقن organizer. strict و extra=forbid تحمي عقد الإدخال.

```python
@pytest.mark.parametrize(
    "body",
    [
        {"name": None},
        {"name": 7},
        {},
        {"name": "أمل", "allergies": [0]},
        {"name": "أمل", "role": 3},
        {"name": "أمل", "cuisines": None},
        {"name": "أمل", "budget": "200"},
        {"name": "أمل", "vegetarian": "true"},
        {"name": "أمل", "organizer": True},
    ],
)
def test_invalid_preferences_are_rejected(client, body):
    assert client.post("/api/groups", json={"preferences": body}).status_code == 422


```

## حد الجسم الفعلي

[الأسطر 158–167](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/tests/test_postgres.py#L158): نرسل جسمًا أكبر من 16KiB مرة كاملًا ومرة iterator من دفعات. كلاهما 413 مع رؤوس السياسة. بذلك لا يعتمد الحد على Content-Length وحده.

```python
def test_body_size_limit_handles_known_and_streamed_lengths(client):
    payload = b'{"preferences":{"name":"' + b"x" * 17000 + b'"}}'
    for body in (payload, iter([payload[:1000], payload[1000:]])):
        response = client.post(
            "/api/groups", content=body, headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 413
        assert response.headers["x-content-type-options"] == "nosniff"


```

## عقد API والمسارات والمفاتيح

[الأسطر 168–194](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/tests/test_postgres.py#L168): نفحص مسار Settings ووصف 422 النصي و 404 لمسار مجهول. نرفض مفتاحًا بلا Bearer، ونرفض مفتاح الإدارة على مسار تعديل العضو بدل توسيع الصلاحيات ضمنيًا.

```python
def test_openapi_static_routes_and_bearer_scheme(client):
    schema = client.get("/api/openapi.json").json()
    assert "/api/groups/{group_id}/settings" in schema["paths"]
    assert "invite_code" in schema["components"]["schemas"]["GroupView"]["properties"]
    error_schema = schema["paths"]["/api/groups"]["post"]["responses"]["422"]["content"][
        "application/json"
    ]["schema"]
    assert error_schema == {"$ref": "#/components/schemas/ErrorResponse"}
    assert (
        schema["components"]["schemas"]["ErrorResponse"]["properties"]["detail"]["type"] == "string"
    )
    assert client.get("/api/missing").status_code == 404
    group, auth = create(client)
    assert (
        client.get(
            f"/api/groups/{group['id']}", headers={"Authorization": auth["Authorization"][7:]}
        ).status_code
        == 404
    )
    assert (
        client.put(
            f"/api/invites/{group['invite_code']}/me", headers=auth, json={"name": "غير مسموح"}
        ).status_code
        == 404
    )


```

## قائمة CORS

[الأسطر 195–205](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/tests/test_postgres.py#L195): OPTIONS تمثل preflight للمتصفح. origin المسموح يحصل على رأس السماح؛ origin غير المسموح لا يحصل عليه. CORS لا تعوض التحقق من ملكية البيانات.

```python
def test_cors_origin_allowlist(client):
    for origin, allowed in (("http://localhost:8081", True), ("https://untrusted.example", False)):
        response = client.options(
            "/api/groups",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type,authorization",
            },
        )
        assert ("access-control-allow-origin" in response.headers) == allowed
```

## تأكدي من فهمك

اختاري مقطعًا واشرحي مدخلاته ونتيجته وما الذي يغيّره. ثم اكتبي مثالًا أصغر بنفس الفكرة في مجلد تدريب، واذكري ما يجب اختباره قبل دمجه.
