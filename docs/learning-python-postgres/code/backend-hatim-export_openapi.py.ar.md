# شرح `backend/hatim/export_openapi.py`

[فهرس الكود](README.ar.md) · [دروس البداية](../README.ar.md) · [قاموس الرموز](../01-foundations.ar.md) · [التنسيق](../08-components.ar.md)

المصدر: [الملف في النسخة المرجعية](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/export_openapi.py) · [خريطة الملفات الحالية](../../architecture-modules.ar.md). عدد الأسطر: 12. المقاطع التالية تعرض المصدر نفسه دون تعديل، والشرح خارج الكود.

## تصدير وصف API

[الأسطر 1–12](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/export_openapi.py#L1): نستورد app دون تشغيل الخادم أو lifespan. عند تنفيذ الوحدة نكتب app.openapi إلى backend/openapi.json. ensure_ascii=False يبقي العربية، indent=2 تنسيق، والسطر الأخير newline حقيقية. ليست استعلامًا للقاعدة أو توليدًا لمنطق الخادم.

```python
"""Generate the API contract without connecting to a database or starting a server."""

import json
from pathlib import Path

from .main import app

if __name__ == "__main__":
    output = Path(__file__).parents[1] / "openapi.json"
    output.write_text(
        json.dumps(app.openapi(), ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
```

## تأكدي من فهمك

اختاري مقطعًا واشرحي مدخلاته ونتيجته وما الذي يغيّره. ثم اكتبي مثالًا أصغر بنفس الفكرة في مجلد تدريب، واذكري ما يجب اختباره قبل دمجه.
