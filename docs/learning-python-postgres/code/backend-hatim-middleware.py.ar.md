# شرح `backend/hatim/middleware.py`

[فهرس الكود](README.ar.md) · [دروس البداية](../README.ar.md) · [قاموس الرموز](../01-foundations.ar.md) · [التنسيق](../08-components.ar.md)

المصدر: [الملف في النسخة المرجعية](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/middleware.py) · [الملف المحلي](../../../backend/hatim/middleware.py). عدد الأسطر: 59. المقاطع التالية تعرض المصدر نفسه دون تعديل، والشرح خارج الكود.

## حد الطلب والأدوات

[الأسطر 1–8](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/middleware.py#L1): 16384 بايت حد جسم الطلب هنا. Headers للقراءة و MutableHeaders للتعديل و JSONResponse للرفض.

```python
"""Bound request bodies even when a client does not send Content-Length."""

from starlette.datastructures import Headers, MutableHeaders
from starlette.responses import JSONResponse

MAX_BODY_BYTES = 16384


```

## غلاف ASGI

[الأسطر 9–17](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/middleware.py#L9): نحتفظ app الأصلية. __call__ يسمح باستدعاء الكائن نفسه. scope يصف الاتصال؛ غير HTTP يمر دون معالجة الجسم.

```python
class ResponsePolicyMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

```

## رؤوس الرد

[الأسطر 18–26](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/middleware.py#L18): نلتقط رسالة بدء الرد ونضيف nosniff و no-referrer. no-store لمسارات API و join. ثم نرسل الرسالة. الوظيفة الداخلية تغلق على scope و send من الاستدعاء الحالي.

```python
        async def policy_send(message):
            if message["type"] == "http.response.start":
                headers = MutableHeaders(scope=message)
                headers["X-Content-Type-Options"] = "nosniff"
                headers["Referrer-Policy"] = "no-referrer"
                if scope["path"].startswith(("/api", "/join")):
                    headers["Cache-Control"] = "no-store"
            await send(message)

```

## رفض الجسم الكبير

[الأسطر 27–36](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/middleware.py#L27): reject تجهز 413 ثم تمرره عبر policy_send. نفحص content-length إذا وجد، ونرفض الرقم غير الصحيح أو المتجاوز. غياب الرأس لا يعني أن الحجم صفر.

```python
        async def reject():
            await JSONResponse({"detail": "Request too large"}, status_code=413)(
                scope, receive, policy_send
            )

        length = Headers(scope=scope).get("content-length")
        if length is not None and (not length.isdigit() or int(length) > MAX_BODY_BYTES):
            await reject()
            return

```

## فحص البايتات الفعلية

[الأسطر 37–49](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/middleware.py#L37): bytearray تجمع الدفعات. disconnect ينهي العمل. نفحص الحجم قبل الإضافة. more_body=false ينهي القراءة. هذا يحد الجسم حتى عند النقل على دفعات.

```python
        body = bytearray()
        while True:
            message = await receive()
            if message["type"] == "http.disconnect":
                return
            chunk = message.get("body", b"")
            if len(body) + len(chunk) > MAX_BODY_BYTES:
                await reject()
                return
            body.extend(chunk)
            if not message.get("more_body", False):
                break

```

## تسليم الجسم مرة واحدة

[الأسطر 50–59](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/middleware.py#L50): nonlocal يسمح بتعديل delivered من الدالة المحيطة. أول receive من FastAPI يأخذ الجسم الذي فحصناه، ثم الطلبات اللاحقة للرسائل تمر إلى receive الأصلية. أخيرًا نستدعي التطبيق المغلف.

```python
        delivered = False

        async def bounded_receive():
            nonlocal delivered
            if not delivered:
                delivered = True
                return {"type": "http.request", "body": bytes(body), "more_body": False}
            return await receive()

        await self.app(scope, bounded_receive, policy_send)
```

## تأكدي من فهمك

اختاري مقطعًا واشرحي مدخلاته ونتيجته وما الذي يغيّره. ثم اكتبي مثالًا أصغر بنفس الفكرة في مجلد تدريب، واذكري ما يجب اختباره قبل دمجه.
