import { test, expect, type Page } from "@playwright/test";

test("a failed saved-plan restore cannot overwrite it with a new plan", async ({
  page,
  request,
}) => {
  const created = await (
    await request.post("/api/groups", {
      data: {
        preferences: { name: "Restore check" },
        settings: { slots: 3, anchor_id: "sushi" },
      },
    })
  ).json();
  const session = JSON.stringify({
    groupId: created.group.id,
    token: created.organizer_token,
  });
  await page.addInitScript(
    (value) => localStorage.setItem("hatim.organizer.v1", value),
    session,
  );
  const endpoint = `**/api/groups/${created.group.id}`;
  await page.route(endpoint, (route) =>
    route.fulfill({ status: 503, contentType: "application/json", body: "{}" }),
  );
  await page.goto("/?preview=organizer");
  await expect(page.getByText("الطعم يبقى.", { exact: true })).toBeVisible();
  await tab(page, "خطّتنا").click();
  await expect(button(page, "ابنِ خطتك")).toBeDisabled();
  expect(
    await page.evaluate(() => localStorage.getItem("hatim.organizer.v1")),
  ).toBe(session);
  await page.unroute(endpoint);
  await button(page, "حاول مرة ثانية").click();
  await expect(
    page.getByText("رحلة صغيرة إلى اليابان", { exact: true }),
  ).toBeVisible();
  await expect(button(page, "ابنِ خطتك")).toHaveCount(0);
});

const button = (page: Page, name: string) =>
  page.getByRole("button", { name, exact: true });
const tab = (page: Page, name: string) =>
  page.getByRole("tab", { name, exact: true });

for (const kind of ["anchor", "pocket"] as const) {
  test(`discovery first: ${kind} survives setup, optional groups and reload`, async ({
    page,
    request,
  }) => {
    await page.setViewportSize({ width: 393, height: 852 });
    const writes: string[] = [];
    const errors: string[] = [];
    page.on("request", (r) => {
      if (r.method() !== "GET" && r.url().includes("/api/"))
        writes.push(r.url());
    });
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/?preview=organizer");
    await expect(page.getByText("الطعم يبقى.", { exact: true })).toBeVisible();
    await expect(page.getByLabel("اسم المستخدم", { exact: true })).toHaveCount(
      0,
    );
    await expect(button(page, "قروب جديد")).toHaveCount(0);
    expect(writes).toEqual([]);
    await page.screenshot({
      path: `test-results/core-first-${kind}.png`,
      fullPage: true,
    });

    await tab(page, "قروباتي").click();
    await expect(button(page, "أنشئ حسابي")).toBeVisible();
    await button(page, "رجوع").click();
    await expect(page.getByText("الطعم يبقى.", { exact: true })).toBeVisible();
    expect(writes).toEqual([]);
    await page
      .getByRole("textbox", { name: "ابحث عن تجربة", exact: true })
      .fill("اليابان");
    if (kind === "anchor") {
      await button(page, "تفاصيل رحلة صغيرة إلى اليابان").click();
      await button(page, "هذه ركيزة خطتي").click();
    } else await button(page, "حفظ رحلة صغيرة إلى اليابان في الجيب").click();
    await expect(page.getByRole("dialog")).toHaveCount(1);
    await expect(
      page.getByText(/اختيارك محفوظ: رحلة صغيرة إلى اليابان/),
    ).toBeVisible();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "٣ خانات", exact: true })
      .click();
    await page
      .getByRole("textbox", { name: "اسمك", exact: true })
      .fill("فحص البداية");

    let failed = false;
    await page.route("**/api/groups", async (route) => {
      if (!failed && route.request().method() === "POST") {
        failed = true;
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: "{}",
        });
      } else await route.continue();
    });
    await button(page, "ابنِ خطتي").click();
    await expect(
      page
        .getByRole("dialog")
        .getByText("حاتم غير متاح مؤقتًا. حاول مرة ثانية بعد شوي.", {
          exact: true,
        }),
    ).toBeVisible();
    await expect(
      page.getByText(/اختيارك محفوظ: رحلة صغيرة إلى اليابان/),
    ).toBeVisible();
    const saved = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/groups") &&
        r.request().method() === "POST" &&
        r.status() === 201,
    );
    await button(page, "ابنِ خطتي").click();
    const created = await (await saved).json();
    expect(created.group.settings.slots).toBe(3);
    expect(created.group.settings.anchor_id).toBe(
      kind === "anchor" ? "sushi" : null,
    );
    expect(created.group.settings.pocket_ids).toEqual(
      kind === "pocket" ? ["sushi"] : [],
    );
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(
      page.getByText("رحلة صغيرة إلى اليابان", { exact: true }),
    ).toBeVisible();
    expect(writes.some((url) => url.includes("/api/v2/"))).toBe(false);

    await tab(page, "قروباتي").click();
    await button(page, "رجوع").click();
    await tab(page, kind === "anchor" ? "خطّتنا" : "الجيب").click();
    await expect(
      page.getByText("رحلة صغيرة إلى اليابان", { exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(page.getByText("الطعم يبقى.", { exact: true })).toBeVisible();
    await tab(page, "خطّتنا").click();
    await button(page, "عشاء واحد").click();
    const shrinking = page.waitForResponse(
      (r) =>
        r.url().endsWith(`/api/groups/${created.group.id}/settings`) &&
        r.request().method() === "PUT",
    );
    await button(page, "حدّث الخطة إلى ١ خانات").click();
    expect((await shrinking).status()).toBe(200);
    const current = await (
      await request.get(`/api/groups/${created.group.id}`, {
        headers: { Authorization: `Bearer ${created.organizer_token}` },
      })
    ).json();
    expect(current.plan.selected).toHaveLength(1);
    expect(current.settings.anchor_id).toBe(kind === "anchor" ? "sushi" : null);
    if (kind === "anchor")
      expect(current.plan.selected[0].experience_id).toBe("sushi");
    else expect(current.settings.pocket_ids).toContain("sushi");
    await button(page, "رفقة الطلعة وذوقي").click();
    await expect(button(page, "اعزم الربع")).toBeVisible();
    await expect(button(page, "افتح قروباتي")).toBeVisible();
    expect(errors).toEqual([]);
  });
}
