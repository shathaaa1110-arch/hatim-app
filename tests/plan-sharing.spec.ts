import { expect, test, type Page } from "@playwright/test";

const button = (page: Page, name: string) =>
  page.getByRole("button", { name, exact: true });

test("designed guest invitation stays live, exports Arabic PDF, and revokes", async ({
  page,
  request,
  browser,
}) => {
  await page.setViewportSize({ width: 393, height: 852 });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const created = await (
    await request.post("/api/groups", {
      data: {
        preferences: { name: "PRIVATE_OWNER" },
        settings: { slots: 3, anchor_id: "fire" },
      },
    })
  ).json();
  const auth = { Authorization: `Bearer ${created.organizer_token}` };
  const endpoint = `/api/plan-invitations/plan/${created.group.id}`;
  await page.addInitScript(
    (s) => localStorage.setItem("hatim.organizer.v1", JSON.stringify(s)),
    {
      groupId: created.group.id,
      token: created.organizer_token,
    },
  );
  await page.goto("/?preview=organizer");
  await page.getByRole("tab", { name: "خطّتنا", exact: true }).click();
  await button(page, "دعوة ومشاركة الخطة").click();
  const sheet = page.getByRole("dialog");
  await sheet
    .getByRole("textbox", { name: "عنوان الدعوة", exact: true })
    .fill("خميسنا على سفرة");
  await sheet
    .getByRole("textbox", { name: "رسالتك للرفقة", exact: true })
    .fill("الجوع يجمعنا… والباقي على حاتم.");
  await button(page, "سهرة زعفران").click();
  await button(page, "معاينة الأماكن والأطباق").click();
  await expect(sheet.getByText("وش نطلب؟", { exact: true })).toHaveCount(3);
  await button(page, "أنشئ رابط الدعوة").click();
  await expect(button(page, "أرسل الدعوة")).toBeEnabled();
  const saved = await (await request.get(endpoint, { headers: auth })).json();
  expect(saved.details.theme).toBe("saffron");
  await sheet
    .getByRole("textbox", { name: "رسالتك للرفقة", exact: true })
    .fill("الكل معزوم");
  await expect(button(page, "أرسل الدعوة")).toBeDisabled();
  await button(page, "حفظ تصميم الدعوة").click();
  await expect(button(page, "أرسل الدعوة")).toBeEnabled();

  const guest = await browser.newContext({
    baseURL: test.info().project.use.baseURL as string,
    viewport: { width: 393, height: 852 },
  });
  const viewer = await guest.newPage();
  viewer.on("pageerror", (e) => errors.push(e.message));
  await viewer.goto(`/s/${saved.code}`);
  await expect(
    viewer.getByText("خميسنا على سفرة", { exact: true }),
  ).toBeVisible();
  await expect(viewer.getByText("الكل معزوم", { exact: true })).toBeVisible();
  await expect(viewer.getByText("وش نطلب؟", { exact: true })).toHaveCount(3);
  await expect(viewer.getByText("PRIVATE_OWNER")).toHaveCount(0);
  await expect(viewer.getByRole("textbox")).toHaveCount(0);
  await viewer.screenshot({
    path: "test-results/designed-invitation.png",
    fullPage: true,
  });
  const popupPromise = viewer.waitForEvent("popup");
  await button(viewer, "حفظ نسخة PDF").click();
  const pdf = await popupPromise;
  await expect(
    pdf.getByRole("button", { name: "طباعة أو حفظ PDF" }),
  ).toBeVisible();
  await pdf.evaluate(() => document.fonts.ready);
  await expect(pdf.getByRole("link", { name: "افتح آخر خطة" })).toHaveAttribute(
    "href",
    new RegExp(`/s/${saved.code}$`),
  );
  expect(await pdf.locator(".entry").count()).toBe(3);
  expect(
    await pdf.locator("a[href^='https://www.google.com/maps/search/']").count(),
  ).toBe(3);
  await pdf.pdf({
    path: "test-results/invitation-ar.pdf",
    printBackground: true,
    preferCSSPageSize: true,
  });
  await pdf.close();
  await request.put(`/api/groups/${created.group.id}/settings`, {
    headers: auth,
    data: { slots: 1, anchor_id: "fire" },
  });
  await expect(viewer.getByText("وش نطلب؟", { exact: true })).toHaveCount(1, {
    timeout: 12000,
  });
  await button(page, "إلغاء رابط الدعوة").click();
  await button(page, "تأكيد إلغاء الرابط").click();
  await expect(
    viewer.getByText(/الدعوة غير متاحة أو أُلغي رابطها/),
  ).toBeVisible({ timeout: 12000 });
  await expect(button(viewer, "حفظ نسخة PDF")).toHaveCount(0);
  await expect(button(page, "أنشئ رابط الدعوة")).toBeVisible();
  expect(errors).toEqual([]);
  await guest.close();
});

test("invitation conflict keeps draft, and public PDF escapes user text", async ({
  page,
  request,
}) => {
  const created = await (
    await request.post("/api/groups", {
      data: { preferences: { name: "PRIVATE" } },
    })
  ).json();
  const auth = { Authorization: `Bearer ${created.organizer_token}` };
  const endpoint = `/api/plan-invitations/plan/${created.group.id}`;
  const saved = await (
    await request.put(endpoint, {
      headers: auth,
      data: {
        details: { title: "دعوة أولى" },
        expected_revision: null,
      },
    })
  ).json();
  await page.addInitScript(
    (s) => localStorage.setItem("hatim.organizer.v1", JSON.stringify(s)),
    {
      groupId: created.group.id,
      token: created.organizer_token,
    },
  );
  await page.goto("/?preview=organizer");
  await page.getByRole("tab", { name: "خطّتنا", exact: true }).click();
  await button(page, "دعوة ومشاركة الخطة").click();
  const title = page.getByRole("textbox", {
    name: "عنوان الدعوة",
    exact: true,
  });
  await title.fill("مسودة جهاز أول");
  const hostile = "<script>window.pwned=true</script>";
  await request.put(endpoint, {
    headers: auth,
    data: {
      details: { title: "دعوة جهاز آخر", message: hostile },
      expected_revision: saved.revision,
    },
  });
  await expect(button(page, "استخدام أحدث دعوة")).toBeVisible({
    timeout: 12000,
  });
  await expect(title).toHaveValue("مسودة جهاز أول");
  await expect(button(page, "حفظ تصميم الدعوة")).toBeDisabled();
  await button(page, "استخدام أحدث دعوة").click();
  await expect(title).toHaveValue("دعوة جهاز آخر");
  await page.goto(`/s/${saved.code}`);
  await expect(page.getByText(hostile, { exact: true })).toBeVisible();
  const popupPromise = page.waitForEvent("popup");
  await button(page, "حفظ نسخة PDF").click();
  const pdf = await popupPromise;
  await expect(
    pdf.getByRole("button", { name: "طباعة أو حفظ PDF" }),
  ).toBeVisible();
  await expect(pdf.locator(".message")).toHaveText(hostile);
  expect(await pdf.locator("script").count()).toBe(0);
  await pdf.evaluate(() => document.fonts.ready);
  await pdf.pdf({
    path: "test-results/invitation-long-ar.pdf",
    printBackground: true,
    preferCSSPageSize: true,
  });
});
