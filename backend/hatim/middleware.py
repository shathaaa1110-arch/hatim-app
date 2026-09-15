"""Bound request bodies even when a client does not send Content-Length."""

from starlette.datastructures import Headers, MutableHeaders
from starlette.responses import JSONResponse

MAX_BODY_BYTES = 16384


class ResponsePolicyMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def policy_send(message):
            if message["type"] == "http.response.start":
                headers = MutableHeaders(scope=message)
                headers["X-Content-Type-Options"] = "nosniff"
                headers["Referrer-Policy"] = "no-referrer"
                if scope["path"].startswith(("/api", "/join")):
                    headers["Cache-Control"] = "no-store"
            await send(message)

        async def reject():
            await JSONResponse({"detail": "Request too large"}, status_code=413)(
                scope, receive, policy_send
            )

        length = Headers(scope=scope).get("content-length")
        if length is not None and (not length.isdigit() or int(length) > MAX_BODY_BYTES):
            await reject()
            return

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

        delivered = False

        async def bounded_receive():
            nonlocal delivered
            if not delivered:
                delivered = True
                return {"type": "http.request", "body": bytes(body), "more_body": False}
            return await receive()

        await self.app(scope, bounded_receive, policy_send)
