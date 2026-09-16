# شرح `backend/hatim/main.py`

[فهرس الكود](README.ar.md) · [دروس البداية](../README.ar.md) · [قاموس الرموز](../01-foundations.ar.md) · [التنسيق](../08-components.ar.md)

المصدر: [الملف في النسخة المرجعية](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/main.py) · [خريطة الملفات الحالية](../../architecture-modules.ar.md). عدد الأسطر: 305. المقاطع التالية تعرض المصدر نفسه دون تعديل، والشرح خارج الكود.

## تجميع أدوات الخادم

[الأسطر 1–32](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/main.py#L1): logging للسجل و secrets للرموز و Path للملفات. FastAPI للمسارات والتحقق والردود، psycopg لأخطاء DB و Jsonb. الاستيراد النسبي يبدأ بنقطة لأنه من نفس حزمة hatim. لا تنفذ هذه imports طلب إنشاء مجموعة.

```python
import logging
import os
import secrets
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Header, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from psycopg import Error as DatabaseError
from psycopg.types.json import Jsonb

from .catalog import CATALOG, CATALOG_IDS
from .middleware import ResponsePolicyMiddleware
from .models import (
    CreateGroup,
    ErrorResponse,
    Experience,
    GroupCreated,
    GroupView,
    InviteView,
    Member,
    MemberCreated,
    Preferences,
    Settings,
)
from .planner import build_plan
from .store import connect, digest, initialize


```

## دورة الحياة

[الأسطر 33–38](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/main.py#L33): asynccontextmanager يشغّل initialize قبل yield، ثم يبدأ استقبال الطلبات. غياب DB أو migration خاطئة يمنع بدء الخادم بدل أن تبدو البيانات فارغة.

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    initialize()
    yield


```

## إعداد FastAPI

[الأسطر 39–62](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/main.py#L39): نسمي التطبيق ونحدد version ومسارات docs و openapi. responses توثق detail نصية للـ 422. CORS تقرأ قائمة origins من البيئة وتزيل الفراغات والفارغ؛ تسمح بالطرق والرؤوس المذكورة. Middleware الثانية تطبق حد الجسم ورؤوس الرد.

```python
app = FastAPI(
    title="Hatim API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
    redoc_url=None,
    responses={422: {"model": ErrorResponse, "description": "Invalid request"}},
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip()
        for origin in os.getenv(
            "HATIM_CORS_ORIGINS", "http://localhost:8081,http://localhost:19006"
        ).split(",")
        if origin.strip()
    ],
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)
app.add_middleware(ResponsePolicyMiddleware)


```

## ردود الأخطاء

[الأسطر 63–73](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/main.py#L63): RequestValidationError تعني مدخلًا فشل Pydantic في قبوله. نعيد رسالة عامة. DatabaseError تعطينا 503 ويسجل نوعها فقط. لا نعيد سلسلة الاتصال أو البيانات الخاصة في التفاصيل.

```python
@app.exception_handler(RequestValidationError)
async def invalid_request(request, error):
    return JSONResponse({"detail": "راجع البيانات وحاول مرة ثانية."}, status_code=422)


@app.exception_handler(DatabaseError)
async def database_unavailable(request, error):
    logging.getLogger(__name__).error("Database request failed: %s", type(error).__name__)
    return JSONResponse({"detail": "حاتم غير متاح مؤقتًا. حاول مرة ثانية بعد شوي."}, status_code=503)


```

## فصل Bearer

[الأسطر 74–77](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/main.py#L74): نقبل رأسًا يبدأ بالبادئة Bearer ومسافة، ثم نأخذ النص بعد أول سبعة محارف. إذا لا يوجد رأس صحيح نعيد نصًا فارغًا يؤدي إلى فشل مطابقة المفتاح.

```python
def bearer(authorization: str | None) -> str:
    return authorization[7:] if authorization and authorization.startswith("Bearer ") else ""


```

## ملكية المجموعة

[الأسطر 78–87](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/main.py#L78): SELECT تقارن group_id وبصمة الرمز في استعلام واحد. lock تضيف عبارة ثابتة FOR UPDATE عند التعديل فقط. متغيرات المستخدم تبقى معاملات %s. fetchone تعيد صفًا أو None؛ None ترفع 404.

```python
def require_owner(db, group_id: str, authorization: str | None, *, lock=False):
    row = db.execute(
        "SELECT * FROM groups WHERE id=%s AND owner_hash=%s" + (" FOR UPDATE" if lock else ""),
        (group_id, digest(bearer(authorization))),
    ).fetchone()
    if row is None:
        raise HTTPException(404, "المجموعة غير متاحة أو الرابط غير صالح.")
    return row


```

## صلاحية الدعوة

[الأسطر 88–96](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/main.py#L88): استعلام مشابه لكن يبحث بالرمز العام. يمكن قفل المجموعة به عند الانضمام. كون الدعوة صالحة لا يمنح مفتاح منظّم.

```python
def require_invite(db, code: str, *, lock=False):
    row = db.execute(
        "SELECT * FROM groups WHERE invite_code=%s" + (" FOR UPDATE" if lock else ""), (code,)
    ).fetchone()
    if row is None:
        raise HTTPException(404, "دعوة غير صالحة. اطلب رابطًا جديدًا من المنظّم.")
    return row


```

## تحويل صف العضو

[الأسطر 97–104](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/main.py#L97): نختار id و preferences و organizer فقط. تحويل Preferences يفحص JSONB المقروءة. token_hash و group_id الداخلية لا تظهر في Member الناتجة.

```python
def member_model(row) -> Member:
    return Member(
        id=row["id"],
        preferences=Preferences.model_validate(row["preferences"]),
        organizer=bool(row["organizer"]),
    )


```

## تكوين عرض المجموعة

[الأسطر 105–122](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/main.py#L105): نقرأ أعضاء الصف المرتبط ونحول كلًا منهم. نفحص settings، ونبني GroupView، ونستدعي build_plan بالكتالوج والأعضاء والإعدادات. حساب الخطة هنا، لا في SQL ولا داخل شاشة iPhone.

```python
def group_model(db, row) -> GroupView:
    members = [
        member_model(m)
        for m in db.execute(
            "SELECT * FROM members WHERE group_id=%s ORDER BY created_at, sequence", (row["id"],)
        )
    ]
    settings = Settings.model_validate(row["settings"])
    return GroupView(
        id=row["id"],
        title=row["title"],
        invite_code=row["invite_code"],
        settings=settings,
        members=members,
        plan=build_plan(CATALOG, members, settings),
    )


```

## فحص الصحة

[الأسطر 123–135](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/main.py#L123): SELECT 1 يختبر DB فعلًا. إذا نجح نرجع status/version/catalog_mode/backend/database. رد الخادم وحده دون هذه القراءة لم يكن سيثبت سلامة PostgreSQL.

```python
@app.get("/api/health")
def health():
    with connect(read_only=True) as db:
        db.execute("SELECT 1")
    return {
        "status": "ok",
        "version": "1.0.0",
        "catalog_mode": "fictional-demo",
        "backend": "python",
        "database": "postgresql",
    }


```

## الكتالوج

[الأسطر 136–140](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/main.py#L136): GET /experiences تعيد القائمة الثابتة مع response_model. لا تنفذ استعلام تجارب. الكتالوج وهمي ومكتوب في catalog.py.

```python
@app.get("/api/experiences", response_model=list[Experience])
def experiences():
    return CATALOG


```

## إنشاء المجموعة

[الأسطر 141–166](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/main.py#L141): decorator يحدد POST ورد 201. ثلاثة رموز مستقلة يولدها secrets. INSERT الأول يحفظ المجموعة و Settings الافتراضية. الثاني يحفظ العضو المنظم في نفس الاتصال. نماذج Python تتحول إلى dict ثم Jsonb. مفتاح عضو المنظم العشوائي لا يعاد ولا يستعمل لمسار me؛ الإدارة بمفتاح المجموعة. نبني الرد ثم يغلق with المعاملة بنجاح قبل إرساله.

```python
@app.post("/api/groups", response_model=GroupCreated, status_code=201)
def create_group(body: CreateGroup):
    group_id, owner_token, code = (
        secrets.token_urlsafe(12),
        secrets.token_urlsafe(32),
        secrets.token_urlsafe(18),
    )
    with connect() as db:
        db.execute(
            "INSERT INTO groups(id,title,invite_code,owner_hash,settings) VALUES(%s,%s,%s,%s,%s)",
            (group_id, body.title, code, digest(owner_token), Jsonb(Settings().model_dump())),
        )
        db.execute(
            "INSERT INTO members(id,group_id,token_hash,preferences,organizer) "
            "VALUES(%s,%s,%s,%s,TRUE)",
            (
                secrets.token_urlsafe(12),
                group_id,
                digest(secrets.token_urlsafe(32)),
                Jsonb(body.preferences.model_dump()),
            ),
        )
        row = require_owner(db, group_id, f"Bearer {owner_token}")
        return GroupCreated(organizer_token=owner_token, group=group_model(db, row))


```

## قراءة خاصة

[الأسطر 167–172](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/main.py#L167): Header(default=None) يقرأ authorization من رأس الطلب. نفتح معاملة قراءة ثابتة ونفحص الملكية ثم نرجع عرض المجموعة.

```python
@app.get("/api/groups/{group_id}", response_model=GroupView)
def get_group(group_id: str, authorization: str | None = Header(default=None)):
    with connect(read_only=True) as db:
        return group_model(db, require_owner(db, group_id, authorization))


```

## تحديث الإعدادات

[الأسطر 173–191](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/main.py#L173): نجمع كل المعرفات إلى set، ونطلب أن تكون subset من CATALOG_IDS. null للركيزة مختلفة عن نص فارغ. نقفل المجموعة قبل UPDATE ونرسل body كاملة بدل patch جزئية، ثم نحسب الخطة الجديدة ضمن المعاملة.

```python
@app.put("/api/groups/{group_id}/settings", response_model=GroupView)
def update_settings(
    group_id: str, body: Settings, authorization: str | None = Header(default=None)
):
    ids = set(
        body.pocket_ids
        + body.completed_ids
        + ([body.anchor_id] if body.anchor_id is not None else [])
    )
    if not ids <= CATALOG_IDS:
        raise HTTPException(422, "تجربة غير موجودة.")
    with connect() as db:
        require_owner(db, group_id, authorization, lock=True)
        db.execute(
            "UPDATE groups SET settings=%s WHERE id=%s", (Jsonb(body.model_dump()), group_id)
        )
        return group_model(db, require_owner(db, group_id, authorization))


```

## ملف المنظم

[الأسطر 192–204](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/main.py#L192): نقفل المجموعة بعد تحقق المفتاح ثم UPDATE للصف الذي organizer=TRUE فقط. لا نقبل id عضو آخر لتعديل تفضيلاته من هذه الدالة.

```python
@app.put("/api/groups/{group_id}/profile", response_model=GroupView)
def update_organizer(
    group_id: str, body: Preferences, authorization: str | None = Header(default=None)
):
    with connect() as db:
        row = require_owner(db, group_id, authorization, lock=True)
        db.execute(
            "UPDATE members SET preferences=%s WHERE group_id=%s AND organizer=TRUE",
            (Jsonb(body.model_dump()), group_id),
        )
        return group_model(db, row)


```

## حذف عضو

[الأسطر 205–217](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/main.py#L205): الملكية والقفل أولًا، ثم DELETE مقيدة بالعضو والمجموعة و organizer=FALSE. rowcount تؤكد حذف صف واحد؛ صفر تعيد 404. حذف صف العضو يبطل token_hash المخزنة له.

```python
@app.delete("/api/groups/{group_id}/members/{member_id}", response_model=GroupView)
def remove_member(group_id: str, member_id: str, authorization: str | None = Header(default=None)):
    with connect() as db:
        row = require_owner(db, group_id, authorization, lock=True)
        cursor = db.execute(
            "DELETE FROM members WHERE id=%s AND group_id=%s AND organizer=FALSE",
            (member_id, group_id),
        )
        if cursor.rowcount != 1:
            raise HTTPException(404, "العضو غير موجود أو هو منظّم المجموعة.")
        return group_model(db, row)


```

## قراءة الدعوة العامة

[الأسطر 218–243](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/main.py#L218): نحسب مجموعة كاملة داخليًا ثم ننشئ ردًا مصغرًا. model_copy تفرغ adaptations وتستبدل السبب الشخصي بالتحريري العام. member_names أسماء فقط، و anchor_issue نص عام. لا نرسل ملفات القيود ثم نخفيها بـ CSS.

```python
@app.get("/api/invites/{code}", response_model=InviteView)
def invite(code: str):
    with connect(read_only=True) as db:
        group = group_model(db, require_invite(db, code))
        # Invitations never expose other members' private constraints or workarounds.
        selected = [
            d.model_copy(
                update={
                    "adaptations": [],
                    "reason": next(e.why for e in CATALOG if e.id == d.experience_id),
                }
            )
            for d in group.plan.selected
        ]
        return InviteView(
            title=group.title,
            member_names=[m.preferences.name for m in group.members],
            slots=group.settings.slots,
            selected=selected,
            anchor_issue="المنظّم يراجع توافق الركيزة مع المجموعة. لم نستبدلها بصمت."
            if group.plan.anchor_issue
            else None,
            consumed=group.plan.consumed,
        )


```

## الانضمام المتزامن

[الأسطر 244–260](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/main.py#L244): نقفل صف المجموعة قبل COUNT. المجموعة عند 12 ترفض بـ 409. أقل من ذلك يولد العضو ومفتاحه ويحفظ Jsonb وبصمة token. يعيد 201 مع المفتاح الخام مرة واحدة. القفل يبقى إلى نهاية المعاملة.

```python
@app.post("/api/invites/{code}/members", response_model=MemberCreated, status_code=201)
def join_group(code: str, body: Preferences):
    with connect() as db:
        group = require_invite(db, code, lock=True)
        count = db.execute(
            "SELECT COUNT(*) AS count FROM members WHERE group_id=%s", (group["id"],)
        ).fetchone()["count"]
        if count >= 12:
            raise HTTPException(409, "المجموعة ممتلئة (١٢ شخصًا كحد أقصى).")
        member_id, token = secrets.token_urlsafe(12), secrets.token_urlsafe(32)
        db.execute(
            "INSERT INTO members(id,group_id,token_hash,preferences) VALUES(%s,%s,%s,%s)",
            (member_id, group["id"], digest(token), Jsonb(body.model_dump())),
        )
        return MemberCreated(member_token=token, member=Member(id=member_id, preferences=body))


```

## تحديد صاحب ملف العضو

[الأسطر 261–271](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/main.py#L261): نجد المجموعة من الدعوة ثم نبحث عن token_hash داخلها وعن organizer=FALSE. حتى لو المفتاح صحيح لمجموعة ثانية يفشل. lock ينتقل إلى قفل المجموعة كي يكون ترتيب الأقفال واحدًا في التعديلات.

```python
def require_member(db, code: str, authorization: str | None, *, lock=False):
    group = require_invite(db, code, lock=lock)
    member = db.execute(
        "SELECT * FROM members WHERE group_id=%s AND token_hash=%s AND organizer=FALSE",
        (group["id"], digest(bearer(authorization))),
    ).fetchone()
    if member is None:
        raise HTTPException(404, "تعذّر الوصول لملفك. يمكنك الانضمام من جديد.")
    return member


```

## قراءة ملفي

[الأسطر 272–277](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/main.py#L272): GET me تتطلب مفتاح العضو وترد Member مفحوصة. لا تعيد ملف عضو بناء على الاسم الذي كتبه طالب الطلب.

```python
@app.get("/api/invites/{code}/me", response_model=Member)
def get_my_preferences(code: str, authorization: str | None = Header(default=None)):
    with connect(read_only=True) as db:
        return member_model(require_member(db, code, authorization))


```

## تعديل ملفي

[الأسطر 278–290](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/main.py#L278): PUT me تستخدم body Preferences وتتثبت من عضو المفتاح ثم تحدث id الذي أعاده الاستعلام. الجسم لا يستطيع تغيير group_id أو organizer.

```python
@app.put("/api/invites/{code}/me", response_model=Member)
def update_my_preferences(
    code: str, body: Preferences, authorization: str | None = Header(default=None)
):
    with connect() as db:
        member = require_member(db, code, authorization, lock=True)
        db.execute(
            "UPDATE members SET preferences=%s WHERE id=%s",
            (Jsonb(body.model_dump()), member["id"]),
        )
        return Member(id=member["id"], preferences=body)


```

## مسار API مفقود

[الأسطر 291–297](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/main.py#L291): fallback لهذه الطرق يرد 404 JSON قبل خدمة ملفات الويب. include_in_schema=False يخفي endpoint المساعدة من العقد؛ لا يمنح صلاحية أو يمنع استدعاءه.

```python
@app.api_route(
    "/api/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"], include_in_schema=False
)
def missing_api(path: str):
    raise HTTPException(404, "Unknown API route")


```

## خدمة صفحة الدعوة

[الأسطر 298–305](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/hatim/main.py#L298): نختار dist أو HATIM_WEB_ROOT. وجود المجلد يفحص وقت تحميل الوحدة. رابط join يعيد نفس index.html وتقرأ React الرمز. mount أخير يقدم الحزمة والأصول ولا يحجب endpoints السابقة.

```python
dist = Path(os.environ.get("HATIM_WEB_ROOT", Path(__file__).parents[2] / "dist"))
if dist.is_dir():

    @app.get("/join/{code}", include_in_schema=False)
    def join_page(code: str):
        return FileResponse(dist / "index.html", headers={"Cache-Control": "no-store"})

    app.mount("/", StaticFiles(directory=dist, html=True), name="web")
```

## تأكدي من فهمك

اختاري مقطعًا واشرحي مدخلاته ونتيجته وما الذي يغيّره. ثم اكتبي مثالًا أصغر بنفس الفكرة في مجلد تدريب، واذكري ما يجب اختباره قبل دمجه.
