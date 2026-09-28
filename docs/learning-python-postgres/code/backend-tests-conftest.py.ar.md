# شرح `backend/tests/conftest.py`

[فهرس الكود](README.ar.md) · [دروس البداية](../README.ar.md) · [قاموس الرموز](../01-foundations.ar.md) · [التنسيق](../08-components.ar.md)

المصدر: [الملف في النسخة المرجعية](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/tests/conftest.py) · [خريطة الملفات الحالية](../../architecture-modules.ar.md). عدد الأسطر: 36. المقاطع التالية تعرض المصدر نفسه دون تعديل، والشرح خارج الكود.

## أدوات الاختبار

[الأسطر 1–13](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/tests/conftest.py#L1): pytest fixture توفر موردًا مشترك النمط لكل اختبار. monkeypatch تعدل البيئة مؤقتًا. psycopg.sql لبناء اسم مخطط آمن، لا لتركيب قيم مستخدم في SQL.

```python
import os
from uuid import uuid4

import psycopg
import pytest
from fastapi.testclient import TestClient
from psycopg import sql
from psycopg.conninfo import make_conninfo

from hatim.main import app
from hatim.store import initialize


```

## اختيار قاعدة الاختبار

[الأسطر 14–20](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/tests/conftest.py#L14): نقرأ HATIM_TEST_DATABASE_URL أو DATABASE_URL. عدم وجود خادم حقيقي يفشل بوضوح. uuid4 يولد اسم schema فريدًا لكل اختبار.

```python
@pytest.fixture
def database(monkeypatch):
    url = os.getenv("HATIM_TEST_DATABASE_URL") or os.getenv("DATABASE_URL")
    if not url:
        pytest.fail(
            "PostgreSQL tests require DATABASE_URL. Run npm run db:up, then npm run test:api."
        )
```

## عزل وتنظيف

[الأسطر 21–32](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/tests/conftest.py#L21): اتصال admin ينشئ مخطط الاختبار. sql.Identifier يقتبس اسمه، و make_conninfo يضبط search_path لاتصالات التطبيق أثناء الاختبار. initialize يطبق المخطط ثم yield تسلم التنفيذ للاختبار. finally تحذف مخطط الاختبار وحده، ولا تحذف جداول التطبيق الأصلي.

```python
    schema = "hatim_test_" + uuid4().hex
    # Each test owns a unique schema; never truncate/drop the application's tables.
    with psycopg.connect(url, autocommit=True) as admin:
        admin.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(schema)))
        monkeypatch.setenv("DATABASE_URL", make_conninfo(url, options=f"-c search_path={schema}"))
        try:
            initialize()
            yield
        finally:
            admin.execute(sql.SQL("DROP SCHEMA {} CASCADE").format(sql.Identifier(schema)))


```

## عميل FastAPI

[الأسطر 33–36](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/tests/conftest.py#L33): client تعتمد database، وتفتح TestClient داخل with لتشغيل lifespan. yield ترجع العميل للاختبار، وبعده يغلق. لا تحتاج منفذ HTTP حي لاختبارات API هذه.

```python
@pytest.fixture
def client(database):
    with TestClient(app) as client:
        yield client
```

## تأكدي من فهمك

اختاري مقطعًا واشرحي مدخلاته ونتيجته وما الذي يغيّره. ثم اكتبي مثالًا أصغر بنفس الفكرة في مجلد تدريب، واذكري ما يجب اختباره قبل دمجه.
