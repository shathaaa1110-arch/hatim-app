import { test, expect, type Page } from "@playwright/test";

const button = (page: Page, name: string) =>
  page.getByRole("button", { name, exact: true });
const tab = (page: Page, name: string) =>
  page.getByRole("tab", { name, exact: true });
const handle = () =>
  `plan_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

test("account entry, standalone plan CRUD and recovery on another device", async ({
  page,
  browser,
  request,
}) => {
  await page.setViewportSize({ width: 393, height: 852 });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const username = handle();
  await page.goto("/?preview=organizer");
  await expect(page.getByText("الطعم يبقى.", { exact: true })).toBeVisible();
  await button(page, "حسابي").click();
  await expect(button(page, "أنشئ حسابي")).toBeVisible();
  await page.getByLabel("اسمك", { exact: true }).fill("فحص الحساب");
  await page.getByLabel("اسم المستخدم", { exact: true }).fill(username);
  await page
    .getByLabel("كلمة المرور", { exact: true })
    .fill("testing-account-123");
  const registered = page.waitForResponse(
    (r) => r.url().endsWith("/auth/register") && r.status() === 201,
  );
  await button(page, "أنشئ حسابي").click();
  const session = await (await registered).json();
  await expect(page.getByText("خططي المحفوظة", { exact: true })).toBeVisible();
  await button(page, "تعديل اسم الحساب").click();
  await page.getByLabel("اسم الحساب", { exact: true }).fill("صاحبة الخطة");
  await button(page, "حفظ التغيير").click();
  await expect(
    page.getByText("يا هلا، صاحبة الخطة", { exact: true }),
  ).toBeVisible();
  await button(page, "خطة جديدة").click();
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await expect(page.getByLabel("اسمك", { exact: true })).toHaveValue(
    "صاحبة الخطة",
  );
  const creating = page.waitForResponse(
    (r) => r.url().endsWith("/api/groups") && r.request().method() === "POST",
  );
  await button(page, "ابنِ خطتي").click();
  const created = await (await creating).json();
  expect(created.organizer_token).toBeNull();
  expect(created.group.owner_account_id).toBe(session.account.id);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByText("هذه الخطة محفوظة في حسابك.", { exact: true }),
  ).toBeVisible();
  await button(page, "إدارة الخطة").click();
  await page.getByLabel("اسم الخطة", { exact: true }).fill("عشاء الاختبار");
  await button(page, "حفظ اسم الخطة").click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await button(page, "حسابي").click();
  await expect(button(page, "افتح عشاء الاختبار")).toBeVisible();
  expect(
    await (
      await request.get("/api/v2/groups", {
        headers: { Authorization: `Bearer ${session.token}` },
      })
    ).json(),
  ).toEqual([]);
  await page.screenshot({
    path: "test-results/account-plans-mobile.png",
    fullPage: true,
  });
  await button(page, "تسجيل الخروج").click();
  await expect(button(page, "أنشئ حسابي")).toBeVisible();
  expect(
    (
      await request.get(`/api/groups/${created.group.id}`, {
        headers: { Authorization: `Bearer ${session.token}` },
      })
    ).status(),
  ).toBe(404);
  await button(page, "رجوع").click();
  await tab(page, "خطّتنا").click();
  await expect(button(page, "ابنِ خطتك")).toBeVisible();

  const otherDevice = await browser.newContext();
  const second = await otherDevice.newPage();
  await second.goto("/?preview=organizer");
  await button(second, "حسابي").click();
  await button(second, "تسجيل الدخول").click();
  await second.getByLabel("اسم المستخدم", { exact: true }).fill(username);
  await second
    .getByLabel("كلمة المرور", { exact: true })
    .fill("testing-account-123");
  await button(second, "ادخل إلى حسابي").click();
  await button(second, "افتح عشاء الاختبار").click();
  await expect(button(second, "إدارة الخطة")).toBeVisible();
  await button(second, "حسابي").click();
  await button(second, "حذف عشاء الاختبار").click();
  await expect(second.getByRole("dialog")).toHaveCount(1);
  await button(second, "إلغاء").click();
  await expect(button(second, "افتح عشاء الاختبار")).toBeVisible();
  await button(second, "حذف عشاء الاختبار").click();
  await button(second, "نعم، احذف الخطة نهائيًا").click();
  await expect(button(second, "افتح عشاء الاختبار")).toHaveCount(0);
  expect(
    (await request.get(`/api/invites/${created.group.invite_code}`)).status(),
  ).toBe(404);
  await otherDevice.close();
  expect(errors).toEqual([]);
});

test("saving an existing guest plan keeps companions and retries a failed write", async ({
  page,
  request,
}) => {
  const created = await (
    await request.post("/api/groups", {
      data: {
        preferences: { name: "منظّم", vegetarian: true },
        settings: { slots: 3, anchor_id: "sushi", pocket_ids: ["fire"] },
      },
    })
  ).json();
  await request.post(`/api/invites/${created.group.invite_code}/members`, {
    data: { name: "رفيقة", allergies: ["حليب"] },
  });
  const original = await (
    await request.get(`/api/groups/${created.group.id}`, {
      headers: { Authorization: `Bearer ${created.organizer_token}` },
    })
  ).json();
  await page.addInitScript(
    (value) =>
      localStorage.setItem("hatim.organizer.v1", JSON.stringify(value)),
    { groupId: created.group.id, token: created.organizer_token },
  );
  await page.goto("/?preview=organizer");
  await button(page, "حسابي").click();
  await page.getByLabel("اسمك", { exact: true }).fill("صاحبة الخطة");
  await page.getByLabel("اسم المستخدم", { exact: true }).fill(handle());
  await page
    .getByLabel("كلمة المرور", { exact: true })
    .fill("testing-account-123");
  await button(page, "أنشئ حسابي").click();
  let failed = false;
  await page.route(
    `**/api/groups/${created.group.id}/account`,
    async (route) => {
      if (!failed) {
        failed = true;
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: "{}",
        });
      } else await route.continue();
    },
  );
  await button(page, "احفظ خطة الجهاز في حسابي").click();
  await expect(
    page.getByText("حاتم غير متاح مؤقتًا. حاول مرة ثانية بعد شوي.", {
      exact: true,
    }),
  ).toBeVisible();
  expect(
    (
      await request.get(`/api/groups/${created.group.id}`, {
        headers: { Authorization: `Bearer ${created.organizer_token}` },
      })
    ).status(),
  ).toBe(200);
  await button(page, "احفظ خطة الجهاز في حسابي").click();
  await expect(button(page, "احفظ خطة الجهاز في حسابي")).toHaveCount(0);
  const token = await page.evaluate(() =>
    localStorage.getItem("hatim.account.v1"),
  );
  const saved = await (
    await request.get(`/api/groups/${created.group.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  ).json();
  for (const key of ["settings", "members", "plan", "invite_code"])
    expect(saved[key]).toEqual(original[key]);
  await button(page, `افتح ${created.group.title}`).click();
  await expect(
    page.getByText("هذه الخطة محفوظة في حسابك.", { exact: true }),
  ).toBeVisible();
});

test("account restore failure offers retry without clearing login or exposing another account", async ({
  page,
  request,
}) => {
  const registered = await (
    await request.post("/api/v2/auth/register", {
      data: {
        handle: handle(),
        name: "صاحب حساب",
        password: "testing-account-123",
      },
    })
  ).json();
  await page.addInitScript(
    (token) => localStorage.setItem("hatim.account.v1", token),
    registered.token,
  );
  await page.route("**/api/v2/auth/me", (route) =>
    route.fulfill({ status: 503, contentType: "application/json", body: "{}" }),
  );
  await page.goto("/?preview=organizer");
  await expect(page.getByText("الطعم يبقى.", { exact: true })).toBeVisible();
  await button(page, "حسابي").click();
  await expect(button(page, "حاول مرة ثانية")).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("hatim.account.v1")),
  ).toBe(registered.token);
  await page.unroute("**/api/v2/auth/me");
  await button(page, "حاول مرة ثانية").click();
  await expect(page.getByText("خططي المحفوظة", { exact: true })).toBeVisible();
});
