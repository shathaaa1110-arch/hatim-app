# شرح `backend/pyproject.toml`

[فهرس الكود](README.ar.md) · [دروس البداية](../README.ar.md) · [قاموس الرموز](../01-foundations.ar.md) · [التنسيق](../08-components.ar.md)

المصدر: [الملف في النسخة المرجعية](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/pyproject.toml) · [خريطة الملفات الحالية](../../architecture-modules.ar.md). عدد الأسطر: 20. المقاطع التالية تعرض المصدر نفسه دون تعديل، والشرح خارج الكود.

## إعداد مشروع Python

[الأسطر 1–20](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/pyproject.toml#L1): project تحدد الاسم والإصدار و Python>=3.14. FastAPI للمسارات والتحقق، Uvicorn لتشغيل ASGI، و psycopg[binary] للاتصال بـ PostgreSQL. dependency-groups.dev أدوات الاختبار و HTTP و Ruff. إعداد pytest يضيف جذر backend لمسار الاستيراد ويحدد tests. line-length=100 حد تنسيق Ruff. هذه حدود التوافق؛ uv.lock تثبت الإصدارات المحلولة.

```toml
[project]
name = "hatim-api"
version = "1.0.0"
description = "Hatim group food-experience planner"
requires-python = ">=3.14"
dependencies = ["fastapi>=0.135,<1", "uvicorn>=0.41,<1", "psycopg[binary]>=3.3,<4"]

[dependency-groups]
dev = [
    "httpx2>=2.13,<3",
    "pytest>=9,<10",
    "ruff>=0.15,<1",
]

[tool.pytest.ini_options]
pythonpath = ["."]
testpaths = ["tests"]

[tool.ruff]
line-length = 100
```

## تأكدي من فهمك

اختاري مقطعًا واشرحي مدخلاته ونتيجته وما الذي يغيّره. ثم اكتبي مثالًا أصغر بنفس الفكرة في مجلد تدريب، واذكري ما يجب اختباره قبل دمجه.
