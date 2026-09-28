import { expect, test, type Page } from "@playwright/test";
const button = (p: Page, name: string) =>
  p.getByRole("button", { name, exact: true });

test("discovery starts setup directly and empty search can recover", async ({
  page,
}) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto("/?preview=organizer");
  await expect(page.getByLabel("ابحث عن تجربة")).toBeInViewport();
  await button(page, "ابدأ خطتك").click();
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await expect(page.getByLabel("اسمك", { exact: true })).toBeVisible();
  await button(page, "إغلاق").click();
  await page.getByLabel("ابحث عن تجربة").fill("تجربة غير موجودة");
  await expect(page.getByText("ما لقيناها هالمرة")).toBeVisible();
  await button(page, "عرض كل التجارب").click();
  await expect(page.getByLabel("ابحث عن تجربة")).toHaveValue("");
  await expect(button(page, "تفاصيل رحلة صغيرة إلى اليابان")).toBeVisible();
});

for (const width of [393, 320]) {
  test(`invitation has a reachable primary action and preserves edits on close and failure at ${width}px`, async ({
    page,
    request,
  }) => {
    await page.setViewportSize({ width, height: 740 });
    const created = await (
      await request.post("/api/groups", {
        data: { preferences: { name: "فحص الرحلة" }, settings: { slots: 3 } },
      })
    ).json();
    const endpoint = `/api/plan-invitations/plan/${created.group.id}`;
    const auth = { Authorization: `Bearer ${created.organizer_token}` };
    await page.addInitScript(
      (s) => localStorage.setItem("hatim.organizer.v1", JSON.stringify(s)),
      { groupId: created.group.id, token: created.organizer_token },
    );
    await page.goto("/?preview=organizer");
    await page.getByRole("tab", { name: "خطّتنا", exact: true }).click();
    await expect(button(page, "عشاء واحد")).toHaveCount(0);
    await expect(button(page, "تعديل الوقت والجو")).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    await button(page, "مشاركة الخطة").click();
    await expect(button(page, "إنشاء رابط الدعوة")).toBeInViewport();
    await expect(page.getByRole("dialog").getByRole("textbox")).toHaveCount(0);
    await expect(button(page, "حفظ نسخة PDF")).toHaveCount(0);
    expect(
      (await (await request.get(endpoint, { headers: auth })).json()).code,
    ).toBeNull();
    await button(page, "تعديل الدعوة").click();
    const title = page.getByLabel("عنوان الدعوة", { exact: true });
    await title.fill("دعوة نحافظ على مسودتها");
    await button(page, "إغلاق").click();
    await expect(button(page, "متابعة التعديل")).toBeVisible();
    await button(page, "متابعة التعديل").click();
    await expect(title).toHaveValue("دعوة نحافظ على مسودتها");
    await button(page, "معاينة الدعوة").click();
    // Previewing is local; it never creates a public link silently.
    expect(
      (await (await request.get(endpoint, { headers: auth })).json()).code,
    ).toBeNull();
    let fail = true;
    await page.route(`**${endpoint}`, async (route) => {
      if (fail && route.request().method() === "PUT") {
        fail = false;
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: "{}",
        });
      } else await route.continue();
    });
    await button(page, "إنشاء رابط الدعوة").click();
    await expect(page.getByRole("dialog")).toContainText(
      "حاتم غير متاح مؤقتًا",
    );
    await button(page, "حاول مرة ثانية").click();
    await expect(button(page, "إنشاء رابط الدعوة")).toBeEnabled();
    await button(page, "إنشاء رابط الدعوة").click();
    await expect(button(page, "مشاركة الدعوة")).toBeInViewport();
    await expect(button(page, "نسخ الرابط")).toBeInViewport();
    await expect(button(page, "تأكيد إلغاء الرابط")).toHaveCount(0);
    await button(page, "خيارات المشاركة").click();
    await expect(button(page, "حفظ نسخة PDF")).toBeVisible();
    await button(page, "إلغاء رابط الدعوة").click();
    await button(page, "الاحتفاظ بالرابط").click();
    await button(page, "رجوع").click();
    await button(page, "تعديل الدعوة").click();
    await title.fill("تعديل سيتم تجاهله");
    await button(page, "إغلاق").click();
    await button(page, "تجاهل التعديلات وإغلاق").click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await button(page, "مشاركة الخطة").click();
    await expect(page.getByRole("dialog")).toContainText(
      "دعوة نحافظ على مسودتها",
    );
    await expect(page.getByRole("dialog")).not.toContainText(
      "تعديل سيتم تجاهله",
    );
    // Tab remains on the sheet, and the primary button has an accessible name/state.
    await button(page, "مشاركة الدعوة").focus();
    await page.keyboard.press("Tab");
    await expect(button(page, "نسخ الرابط")).toBeFocused();
    await page.screenshot({
      path: `test-results/invitation-overview-${width}.png`,
    });
  });
}
