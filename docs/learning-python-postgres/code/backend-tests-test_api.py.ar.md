# شرح `backend/tests/test_api.py`

[فهرس الكود](README.ar.md) · [دروس البداية](../README.ar.md) · [قاموس الرموز](../01-foundations.ar.md) · [التنسيق](../08-components.ar.md)

المصدر: [الملف في النسخة المرجعية](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/tests/test_api.py) · [خريطة الملفات الحالية](../../architecture-modules.ar.md). عدد الأسطر: 115. المقاطع التالية تعرض المصدر نفسه دون تعديل، والشرح خارج الكود.

## مساعد الإنشاء

[الأسطر 1–7](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/tests/test_api.py#L1): create ترسل POST وتتحقق 201 وترجع Group مع رأس الإدارة. هذا تجهيز اختبار ببيانات اصطناعية وليس حسابًا ثابتًا في التطبيق.

```python
def create(client):
    response = client.post("/api/groups", json={"preferences": {"name": "المنظّم"}})
    assert response.status_code == 201
    body = response.json()
    return body["group"], {"Authorization": "Bearer " + body["organizer_token"]}


```

## انضمام وصلاحية وخصوصية

[الأسطر 8–41](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/tests/test_api.py#L8): نضيف عضوًا ونستعمل member_token: يرفض الإدارة ويستطيع قراءة/تعديل ملفه. بعد إضافة حساسية نقرأ خطة المنظّم ثم العرض العام ونتحقق أن تفاصيل الحساسية لا تتسرب فيه.

```python
def test_member_joins_and_updates_own_preferences_only(client):
    group, owner = create(client)
    code = group["invite_code"]
    response = client.post(
        f"/api/invites/{code}/members", json={"name": "سارة", "vegetarian": True}
    )
    assert response.status_code == 201
    member = response.json()
    auth = {"Authorization": "Bearer " + member["member_token"]}
    assert client.get(f"/api/groups/{group['id']}", headers=auth).status_code == 404
    assert (
        client.put(
            f"/api/groups/{group['id']}/settings", json={"slots": 1}, headers=auth
        ).status_code
        == 404
    )
    assert (
        client.get(f"/api/invites/{code}/me", headers=auth).json()["preferences"]["name"] == "سارة"
    )
    assert (
        client.put(
            f"/api/invites/{code}/me", headers=auth, json={"name": "سارة", "allergies": ["مكسرات"]}
        ).status_code
        == 200
    )
    updated = client.get(f"/api/groups/{group['id']}", headers=owner).json()
    assert len(updated["members"]) == 2
    assert updated["plan"]["anchor_issue"]
    public = client.get(f"/api/invites/{code}").json()
    assert "مكسرات" not in str(public)
    assert "preferences" not in public and "members" not in public
    assert public["anchor_issue"]


```

## عزل المجموعات

[الأسطر 42–57](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/tests/test_api.py#L42): مفتاح مجموعة لا يدير مجموعة أخرى، ومفتاح عضو لا يعمل على دعوة أخرى، وغياب المفتاح يرفض. no-store يمنع تخزين رد حساس في cache المعتاد.

```python
def test_groups_and_member_capabilities_are_isolated(client):
    first, owner = create(client)
    second, other = create(client)
    joined = client.post(
        f"/api/invites/{first['invite_code']}/members", json={"name": "عضو"}
    ).json()
    auth = {"Authorization": "Bearer " + joined["member_token"]}
    assert client.get(f"/api/groups/{first['id']}", headers=other).status_code == 404
    assert client.get(f"/api/invites/{second['invite_code']}/me", headers=auth).status_code == 404
    assert client.get(f"/api/invites/{first['invite_code']}/me").status_code == 404
    assert (
        client.get(f"/api/groups/{first['id']}", headers=owner).headers["cache-control"]
        == "no-store"
    )


```

## مدخلات غير صالحة

[الأسطر 58–78](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/tests/test_api.py#L58): نجرب حدود الخانات ومعرفًا غير موجود وركيزة في الجيب واستهلاكًا يتجاوز الخانات واسمًا فارغًا وحساسية غير معروفة. كل assert يصف قيدًا يتوجب الحفاظ عليه.

```python
def test_invalid_requests_and_unknown_experience_ids(client):
    group, auth = create(client)
    path = f"/api/groups/{group['id']}/settings"
    for body in (
        {"slots": 0},
        {"slots": 10},
        {"anchor_id": "missing"},
        {"pocket_ids": ["fire"]},
        {"completed_ids": ["fire", "sushi"], "slots": 1},
    ):
        assert client.put(path, headers=auth, json=body).status_code == 422
    assert client.post("/api/groups", json={"preferences": {"name": "   "}}).status_code == 422
    assert (
        client.post(
            f"/api/invites/{group['invite_code']}/members",
            json={"name": "أمل", "allergies": ["unknown"]},
        ).status_code
        == 422
    )


```

## إزالة تسحب الوصول

[الأسطر 79–99](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/tests/test_api.py#L79): بعد DELETE لا يظهر العضو ولا يعمل مفتاحه القديم. طلب إزالة المنظّم نفسه يرفض. العملية تزيل عضوية هذا الجدول، لا حساب مستخدم لأن لا users حاليًا.

```python
def test_organizer_can_remove_a_member_and_revoke_their_access(client):
    group, auth = create(client)
    code = group["invite_code"]
    member = client.post(f"/api/invites/{code}/members", json={"name": "عضو"}).json()
    path = f"/api/groups/{group['id']}/members/{member['member']['id']}"
    result = client.delete(path, headers=auth)
    assert result.status_code == 200 and len(result.json()["members"]) == 1
    assert (
        client.get(
            f"/api/invites/{code}/me", headers={"Authorization": "Bearer " + member["member_token"]}
        ).status_code
        == 404
    )
    assert (
        client.delete(
            f"/api/groups/{group['id']}/members/{group['members'][0]['id']}", headers=auth
        ).status_code
        == 404
    )


```

## السعة المتتابعة

[الأسطر 100–107](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/tests/test_api.py#L100): ننضم 11 مرة بجانب المنظّم، ثم نتوقع 409 للمحاولة الإضافية. اختبار التزامن الأقوى في test_postgres.py.

```python
def test_group_capacity_is_bounded(client):
    group, _ = create(client)
    path = f"/api/invites/{group['invite_code']}/members"
    for index in range(11):
        assert client.post(path, json={"name": str(index)}).status_code == 201
    assert client.post(path, json={"name": "overflow"}).status_code == 409


```

## الحفظ يؤثر على العرض المشترك

[الأسطر 108–115](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/backend/tests/test_api.py#L108): نرسل slots=1 ثم نقرأ من endpoint آخر، لا نكتفي برد الكتابة. يجب بقاء الركيزة وحدها ووجود 8 في الجيب؛ هذا يثبت توصيل DB بالـ planner والعرض العام.

```python
def test_settings_persist_and_drive_the_shared_plan(client):
    group, auth = create(client)
    result = client.put(f"/api/groups/{group['id']}/settings", headers=auth, json={"slots": 1})
    assert result.status_code == 200
    public = client.get(f"/api/invites/{group['invite_code']}").json()
    assert public["slots"] == 1 and len(public["selected"]) == 1
    assert public["selected"][0]["experience_id"] == "fire"
    assert len(client.get(f"/api/groups/{group['id']}", headers=auth).json()["plan"]["pocket"]) == 8
```

## تأكدي من فهمك

اختاري مقطعًا واشرحي مدخلاته ونتيجته وما الذي يغيّره. ثم اكتبي مثالًا أصغر بنفس الفكرة في مجلد تدريب، واذكري ما يجب اختباره قبل دمجه.
