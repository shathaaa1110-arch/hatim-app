import { test, expect } from "@playwright/test";

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

test("organizer and invited member coordinate a persistent, shrinking plan", async ({
  page,
  browser,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?preview=legacy");
  await page
    .getByRole("button", { name: "اكتشف تجربة على الحطب", exact: true })
    .click();
  await page
    .getByRole("button", { name: "هذه ركيزة خطتي", exact: true })
    .click();
  await page.getByRole("textbox", { name: "اسمك" }).fill("منظّم التجربة");
  await page.getByRole("button", { name: "سعودي", exact: true }).click();
  const creation = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/groups") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "ابنِ خطتي", exact: true }).click();
  const created = await (await creation).json();
  const group = created.group;
  const auth = { Authorization: "Bearer " + created.organizer_token };
  await page.getByRole("tab", { name: "اكتشف", exact: true }).click();
  await expect(page.getByText("الطعم يبقى.", { exact: true })).toBeVisible();
  await page.screenshot({
    path: "test-results/discover-desktop.png",
    fullPage: true,
  });

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

  await page.getByRole("button", { name: "عشناها", exact: true }).click();
  await expect(page.getByText("لحظات عشتوها", { exact: true })).toBeVisible();
  current = await (
    await request.get(`/api/groups/${group.id}`, { headers: auth })
  ).json();
  expect(current.plan.consumed).toBe(1);
  expect(current.plan.available).toBe(0);
  await page.getByRole("button", { name: "تراجع", exact: true }).click();
  await page
    .getByRole("button", { name: "٤ أيام · ٩ خانات", exact: true })
    .click();
  await page
    .getByRole("button", { name: "حدّث الخطة إلى ٩ خانات", exact: true })
    .click();
  await page.getByRole("tab", { name: "اكتشف", exact: true }).click();
  await page.getByRole("textbox", { name: "ابحث عن تجربة" }).fill("اليابان");
  await expect(
    page.getByRole("button", {
      name: "تفاصيل رحلة صغيرة إلى اليابان",
      exact: true,
    }),
  ).toBeVisible();
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

test("a missing invitation has a useful error and no organizer access", async ({
  page,
}) => {
  await page.goto("/join/invalid-link");
  await expect(
    page.getByText("ما قدرنا نفتح الدعوة", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("tab")).toHaveCount(0);
});
