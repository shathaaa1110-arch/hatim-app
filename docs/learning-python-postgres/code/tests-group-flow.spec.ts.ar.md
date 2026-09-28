# شرح `tests/group-flow.spec.ts`

[فهرس الكود](README.ar.md) · [دروس البداية](../README.ar.md) · [قاموس الرموز](../01-foundations.ar.md) · [التنسيق](../08-components.ar.md)

المصدر: [الملف في النسخة المرجعية](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/tests/group-flow.spec.ts) · [الملف المحلي](../../../tests/group-flow.spec.ts). عدد الأسطر: 201. المقاطع التالية تعرض المصدر نفسه دون تعديل، والشرح خارج الكود.

## أدوات رحلة المتصفح

[الأسطر 1–2](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/tests/group-flow.spec.ts#L1): Playwright test يشغل سيناريو و expect تتحقق من الواجهة. هذه اختبارات متصفح حقيقي أمام API تعمل، وتكتب بيانات اختبار فعلية؛ اختاري خدمة/DB اختبار منفصلة.

```typescript
import { test, expect } from "@playwright/test";

```

## تعطل مؤقت ثم إعادة المحاولة

[الأسطر 3–33](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/tests/group-flow.spec.ts#L3): ننشئ دعوة عبر API ونحاكي 503 لمسارها في المتصفح فقط بـ page.route. نتوقع الرسالة ثم نرفع الاعتراض ونضغط إعادة المحاولة. نجاح فتح النموذج يثبت عدم ضياع الدعوة بسبب فشل أول قراءة.

```typescript
test("temporary service failure can be retried without losing the invitation", async ({
  page,
  request,
}) => {
  const response = await request.post("/api/groups", {
    data: { preferences: { name: "Retry test" } },
  });
  const { group } = await response.json();
  const endpoint = `**/api/invites/${group.invite_code}`;
  await page.route(endpoint, (route) =>
    route.fulfill({
      status: 503,
      contentType: "text/plain",
      body: "temporarily unavailable",
    }),
  );
  await page.goto(`/join/${group.invite_code}`);
  await expect(
    page.getByText("حاتم غير متاح مؤقتًا. حاول مرة ثانية بعد شوي.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.unroute(endpoint);
  await page
    .getByRole("button", { name: "حاول مرة ثانية", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "أضيف ذوقي للَمّة", exact: true }),
  ).toBeVisible();
});

```

## رحلة المنظّم والعضو

[الأسطر 34–38](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/tests/group-flow.spec.ts#L34): fixture page متصفح المنظّم و browser لإنشاء سياق عضو مستقل و request للتحقق من الخادم. errors تجمع أخطاء JavaScript غير المعالجة.

```typescript
test("organizer and invited member coordinate a persistent, shrinking plan", async ({
  page,
  browser,
  request,
}) => {
```

## البداية والإنشاء

[الأسطر 39–59](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/tests/group-flow.spec.ts#L39): نضغط واجهة البداية ونملأ الاسم والمطبخ. نسجل waitForResponse قبل الضغط كي لا نفوّت الرد السريع. نقرأ معرف المجموعة والمفتاح من الرد لا من ثابت داخل الاختبار.

```typescript
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?preview=organizer");
  await page.getByRole("button", { name: "نبدأ لَمّتنا", exact: true }).click();
  await page.getByRole("textbox", { name: "اسمك" }).fill("منظّم التجربة");
  await page.getByRole("button", { name: "سعودي", exact: true }).click();
  const creation = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/groups") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "نبدأ اللَمّة", exact: true }).click();
  const created = await (await creation).json();
  const group = created.group;
  const auth = { Authorization: "Bearer " + created.organizer_token };
  await expect(page.getByText("الطعم يبقى.", { exact: true })).toBeVisible();
  await page.screenshot({
    path: "test-results/discover-desktop.png",
    fullPage: true,
  });

```

## تقليص الخطة

[الأسطر 60–73](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/tests/group-flow.spec.ts#L60): نختار عشاء واحد ونحفظ، ثم نتحقق من نص الجيب ومن GET بأن selected واحدة هي fire. الجمع بين UI و API يثبت أكثر من تغير نص زر.

```typescript
  await page.getByRole("tab", { name: "خطّتنا", exact: true }).click();
  await page.getByRole("button", { name: "عشاء واحد", exact: true }).click();
  await page
    .getByRole("button", { name: "حدّث الخطة إلى ١ خانات", exact: true })
    .click();
  await expect(
    page.getByText("٨ تجارب محفوظة في الجيب", { exact: true }),
  ).toBeVisible();
  let current = await (
    await request.get(`/api/groups/${group.id}`, { headers: auth })
  ).json();
  expect(current.plan.selected).toHaveLength(1);
  expect(current.plan.selected[0].experience_id).toBe("fire");

```

## عضو في متصفح مستقل

[الأسطر 74–105](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/tests/group-flow.spec.ts#L74): newContext لا يشترك بتخزين المنظّم. نفتح دعوة بعرض 393 ونملأ تفضيلات نباتية، ثم نرى مخرج القرنبيط عند المنظّم عبر polling. reload يختبر استعادة مفتاح العضو.

```typescript
  const memberContext = await browser.newContext({
    viewport: { width: 393, height: 852 },
    isMobile: true,
    hasTouch: true,
  });
  const memberPage = await memberContext.newPage();
  memberPage.on("pageerror", (error) => errors.push(error.message));
  await memberPage.goto(`/join/${group.invite_code}`);
  await memberPage.screenshot({
    path: "test-results/member-invitation-mobile.png",
    fullPage: true,
  });
  await memberPage
    .getByRole("button", { name: "أضيف ذوقي للَمّة", exact: true })
    .click();
  await memberPage.getByRole("textbox", { name: "اسمك" }).fill("سارة");
  await memberPage.getByTestId("vegetarian-switch").click();
  await memberPage.getByRole("button", { name: "إيطالي", exact: true }).click();
  await memberPage
    .getByRole("button", { name: "انضمّ للَمّة", exact: true })
    .click();
  await expect(
    memberPage.getByRole("button", { name: "أعدّل ذوقي", exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/لـسارة: قرنبيط/)).toBeVisible({
    timeout: 15000,
  });
  await memberPage.reload();
  await expect(
    memberPage.getByRole("button", { name: "أعدّل ذوقي", exact: true }),
  ).toBeVisible();

```

## تعارض حساسية وخصوصية

[الأسطر 106–129](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/tests/group-flow.spec.ts#L106): نضيف حساسية اصطناعية، ونتحقق من تعليق الركيزة وفراغ المختار بالخادم، ثم نفحص أن العرض العام لا يحتوي نوع الحساسية. لقارئ الاختبار هذا سيناريو قيد وخصوصية معًا.

```typescript
  await memberPage
    .getByRole("button", { name: "أعدّل ذوقي", exact: true })
    .click();
  await memberPage.getByRole("button", { name: "مكسرات", exact: true }).click();
  await memberPage
    .getByRole("button", { name: "تحديث ذوقي", exact: true })
    .click();
  await expect(page.getByText(/ركيزتكم «على مهل/)).toBeVisible({
    timeout: 15000,
  });
  current = await (
    await request.get(`/api/groups/${group.id}`, { headers: auth })
  ).json();
  expect(current.plan.selected).toHaveLength(0);
  expect(current.plan.anchor_issue).toContain("سارة");
  const publicView = await (
    await request.get(`/api/invites/${group.invite_code}`)
  ).json();
  expect(JSON.stringify(publicView)).not.toContain("مكسرات");
  await expect(
    memberPage.getByText(
      "المنظّم يراجع توافق الركيزة مع المجموعة. لم نستبدلها بصمت.",
    ),
  ).toBeVisible();
```

## تعديل القيد يعيد الحساب

[الأسطر 130–140](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/tests/group-flow.spec.ts#L130): إزالة الحساسية الاختبارية تستعيد إظهار تجربة قابلة للإتمام. انتظار UI بمهلة يناسب polling، وليس sleep عشوائية.

```typescript
  await memberPage
    .getByRole("button", { name: "أعدّل ذوقي", exact: true })
    .click();
  await memberPage.getByRole("button", { name: "مكسرات", exact: true }).click();
  await memberPage
    .getByRole("button", { name: "تحديث ذوقي", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "عشناها", exact: true }),
  ).toBeVisible({ timeout: 15000 });

```

## استهلاك خانة

[الأسطر 141–147](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/tests/group-flow.spec.ts#L141): عشناها تنقل التجربة للمكتمل ونقرأ consumed=1 و available=0 من API.

```typescript
  await page.getByRole("button", { name: "عشناها", exact: true }).click();
  await expect(page.getByText("لحظات عشتوها", { exact: true })).toBeVisible();
  current = await (
    await request.get(`/api/groups/${group.id}`, { headers: auth })
  ).json();
  expect(current.plan.consumed).toBe(1);
  expect(current.plan.available).toBe(0);
```

## تراجع وتوسعة

[الأسطر 148–154](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/tests/group-flow.spec.ts#L148): نضغط تراجع ثم 9 خانات ونحفظ. هذا يختبر أن السعة يمكن أن تكبر بعد تغير الظروف.

```typescript
  await page.getByRole("button", { name: "تراجع", exact: true }).click();
  await page
    .getByRole("button", { name: "٤ أيام · ٩ خانات", exact: true })
    .click();
  await page
    .getByRole("button", { name: "حدّث الخطة إلى ٩ خانات", exact: true })
    .click();
```

## بحث في الواجهة

[الأسطر 155–162](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/tests/group-flow.spec.ts#L155): نبحث عن اليابان وننتظر البطاقة المطلوبة. الفلتر محلي لا يغير الكتالوج المخزن.

```typescript
  await page.getByRole("tab", { name: "اكتشف", exact: true }).click();
  await page.getByRole("textbox", { name: "ابحث عن تجربة" }).fill("اليابان");
  await expect(
    page.getByRole("button", {
      name: "تفاصيل رحلة صغيرة إلى اليابان",
      exact: true,
    }),
  ).toBeVisible();
```

## جيب دائم

[الأسطر 163–177](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/tests/group-flow.spec.ts#L163): نحفظ السوشي ونذهب للجيب ثم نعيد تحميل الصفحة ونتحقق أنها بقيت. مجرد ظهور toast قبل reload لا يثبت الحفظ الدائم.

```typescript
  await page
    .getByRole("button", {
      name: "حفظ رحلة صغيرة إلى اليابان في الجيب",
      exact: true,
    })
    .click();
  await page.getByRole("tab", { name: "الجيب", exact: true }).click();
  await expect(
    page.getByText("رحلة صغيرة إلى اليابان", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("tab", { name: "الجيب", exact: true }).click();
  await expect(
    page.getByText("رحلة صغيرة إلى اليابان", { exact: true }),
  ).toBeVisible();
```

## شاشة صغيرة وأخطاء

[الأسطر 178–192](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/tests/group-flow.spec.ts#L178): نغير viewport ونلتقط صورة ونفحص عدم تجاوز عرض المستند للنافذة. نتحقق أن errors فارغة ونغلق سياق العضو.

```typescript
  await page.setViewportSize({ width: 393, height: 852 });
  await page.getByRole("tab", { name: "اكتشف", exact: true }).click();
  await page.screenshot({
    path: "test-results/discover-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
  await memberContext.close();
});

```

## دعوة غير موجودة

[الأسطر 193–201](https://github.com/shathaaa1110-arch/hatim-app/blob/59d45d33cbd6995a07a9b68236dd9de9aaf2b713/tests/group-flow.spec.ts#L193): رابط خاطئ يعرض رسالة مفيدة ولا يعرض تبويبات الإدارة. الاختبار لا يدعي أن كل الروابط التي تعمل حاليًا ستبقى بعد إيقاف النفق.

```typescript
test("a missing invitation has a useful error and no organizer access", async ({
  page,
}) => {
  await page.goto("/join/invalid-link");
  await expect(
    page.getByText("ما قدرنا نفتح الدعوة", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("tab")).toHaveCount(0);
});
```

## تأكدي من فهمك

اختاري مقطعًا واشرحي مدخلاته ونتيجته وما الذي يغيّره. ثم اكتبي مثالًا أصغر بنفس الفكرة في مجلد تدريب، واذكري ما يجب اختباره قبل دمجه.
