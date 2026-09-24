import { test, expect, type Page } from "@playwright/test";
const button = (page: Page, name: string) =>
  page.getByRole("button", { name, exact: true });

test("quick guest decision creates one-slot family plan without login; context persists in invite", async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 393, height: 852 });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/?preview=organizer");
  await button(page, "وش يناسبني الحين؟").click();
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await button(page, "عائلية").click();
  await page.getByRole("textbox", { name: "اسمك", exact: true }).fill("نورة");
  await button(page, "اعتماد ذوقي للبحث").click();
  await button(page, "اعرض الخيارات المناسبة").click();
  await expect(page.getByTestId("quick-results")).toBeVisible();
  await expect(
    page.getByTestId("quick-results").getByRole("button", { name: /^أختار / }),
  ).toHaveCount(3);
  await expect(page.getByTestId("quick-results")).toContainText(
    "الطلعة العائلية",
  );
  await page.screenshot({
    path: "test-results/quick-family-results.png",
    fullPage: true,
  });
  await button(page, "أختار باب صغير، سفرة كبيرة").click();
  await button(page, "ابدأ خطة بهذه التجربة").click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByText("جوّ هذه الطلعة: عائلية", { exact: true }),
  ).toBeVisible();
  const session = JSON.parse(
    (await page.evaluate(() => localStorage.getItem("hatim.organizer.v1")))!,
  );
  const group = await (
    await request.get(`/api/groups/${session.groupId}`, {
      headers: { Authorization: `Bearer ${session.token}` },
    })
  ).json();
  expect(group.settings).toMatchObject({
    slots: 1,
    anchor_id: "levant",
    context: { kind: "family", priorities: ["quiet", "sharing"] },
  });
  expect(group.members).toHaveLength(1);
  expect(group.members[0].preferences.name).toBe("نورة");
  await page.reload();
  await page.getByRole("tab", { name: "خطّتنا", exact: true }).click();
  await expect(
    page.getByText("جوّ هذه الطلعة: عائلية", { exact: true }),
  ).toBeVisible();
  await page.goto(`/join/${group.invite_code}`);
  await expect(
    page.getByText("جوّ هذه الطلعة: عائلية", { exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("quick decision handles no match, constraints, failed search and retry", async ({
  page,
}) => {
  await page.goto("/?preview=organizer");
  await button(page, "وش يناسبني الحين؟").click();
  await button(page, "٣٠ دقيقة").click();
  await page.getByRole("textbox", { name: "اسمك", exact: true }).fill("أمل");
  await button(page, "اعتماد ذوقي للبحث").click();
  await button(page, "اعرض الخيارات المناسبة").click();
  await expect(page.getByTestId("quick-results")).toContainText("وقتًا أطول");
  await expect(
    page.getByTestId("quick-results").getByRole("button", { name: /^أختار / }),
  ).toHaveCount(0);
  await button(page, "تعديل البحث").click();
  await button(page, "٦٠ دقيقة").click();
  await expect(page.getByTestId("quick-results")).toHaveCount(0);
  await page.route("**/api/quick-decisions", (r) =>
    r.fulfill({ status: 503, body: "{}", contentType: "application/json" }),
  );
  await button(page, "اعرض الخيارات المناسبة").click();
  await expect(page.getByRole("dialog")).toContainText("حاتم غير متاح مؤقتًا");
  await page.unroute("**/api/quick-decisions");
  await button(page, "اعرض الخيارات المناسبة").click();
  await expect(
    page.getByTestId("quick-results").getByRole("button", { name: /^أختار / }),
  ).toHaveCount(3);
  await button(page, "تعديل البحث").click();
  await button(page, "تعديل ذوقي وقيودي").click();
  await button(page, "حليب").click();
  await button(page, "اعتماد ذوقي للبحث").click();
  await button(page, "اعرض الخيارات المناسبة").click();
  await expect(page.getByTestId("quick-results")).toContainText(
    "تراعي قيود الجميع",
  );
  await expect(
    page.getByTestId("quick-results").getByRole("button", { name: /^أختار / }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(() => localStorage.getItem("hatim.organizer.v1")),
  ).toBeNull();
});

test("existing companions constrain quick picks; context save failure keeps draft and anchor", async ({
  page,
  request,
}) => {
  const created = await (
    await request.post("/api/groups", {
      data: {
        preferences: { name: "أمل" },
        settings: { slots: 3, anchor_id: "fire" },
      },
    })
  ).json();
  const group = created.group;
  await request.post(`/api/invites/${group.invite_code}/members`, {
    data: { name: "بدر", budget: 50 },
  });
  await page.addInitScript(
    (value) => localStorage.setItem("hatim.organizer.v1", value),
    JSON.stringify({ groupId: group.id, token: created.organizer_token }),
  );
  await page.goto("/?preview=organizer");
  await button(page, "وش يناسبني الحين؟").click();
  await expect(page.getByRole("dialog")).toContainText("بدر");
  await button(page, "اعرض الخيارات المناسبة").click();
  await expect(
    page.getByTestId("quick-results").getByRole("button", { name: /^أختار / }),
  ).toHaveCount(2);
  await expect(page.getByTestId("quick-results")).not.toContainText(
    "على مهل… وعلى الحطب",
  );
  await button(page, "إغلاق").click();
  await page.getByRole("tab", { name: "خطّتنا", exact: true }).click();
  await button(page, "تعديل جوّ الطلعة").click();
  await button(page, "مع أصدقاء").click();
  const endpoint = `**/api/groups/${group.id}/settings`;
  await page.route(endpoint, (r) =>
    r.fulfill({ status: 503, body: "{}", contentType: "application/json" }),
  );
  await button(page, "حفظ تفضيلات الطلعة").click();
  await expect(page.getByRole("dialog")).toContainText("حاتم غير متاح مؤقتًا");
  await page.unroute(endpoint);
  await button(page, "حفظ تفضيلات الطلعة").click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const saved = await (
    await request.get(`/api/groups/${group.id}`, {
      headers: { Authorization: `Bearer ${created.organizer_token}` },
    })
  ).json();
  expect(saved.settings.anchor_id).toBe("fire");
  expect(saved.settings.context.kind).toBe("friends");
  expect(saved.plan.anchor_issue).toContain("بدر");
});

test("late quick responses cannot show picks after filters change", async ({
  page,
  request,
}) => {
  const created = await (
    await request.post("/api/groups", {
      data: { preferences: { name: "أمل" } },
    })
  ).json();
  await page.addInitScript(
    (value) => localStorage.setItem("hatim.organizer.v1", value),
    JSON.stringify({
      groupId: created.group.id,
      token: created.organizer_token,
    }),
  );
  await page.goto("/?preview=organizer");
  await button(page, "وش يناسبني الحين؟").click();
  let release!: () => void;
  const wait = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/quick-decisions", async (route) => {
    const response = await route.fetch();
    await wait;
    await route.fulfill({ response }).catch(() => {});
  });
  const requested = page.waitForRequest("**/api/quick-decisions");
  await button(page, "اعرض الخيارات المناسبة").click();
  await requested;
  await button(page, "٣٠ دقيقة").click();
  release();
  await expect(page.getByTestId("quick-results")).toHaveCount(0);
  await page.unroute("**/api/quick-decisions");
  await button(page, "اعرض الخيارات المناسبة").click();
  await expect(page.getByTestId("quick-results")).toContainText("وقتًا أطول");
});

test("quick decisions never resurrect consumed meal slots", async ({
  page,
  request,
}) => {
  const created = await (
    await request.post("/api/groups", {
      data: {
        preferences: { name: "أمل" },
        settings: { slots: 1, anchor_id: null, completed_ids: ["fire"] },
      },
    })
  ).json();
  await page.addInitScript(
    (value) => localStorage.setItem("hatim.organizer.v1", value),
    JSON.stringify({
      groupId: created.group.id,
      token: created.organizer_token,
    }),
  );
  await page.goto("/?preview=organizer");
  await button(page, "وش يناسبني الحين؟").click();
  await button(page, "اعرض الخيارات المناسبة").click();
  await button(page, "أختار باب صغير، سفرة كبيرة").click();
  await button(page, "اعتمدها ركيزة لخطتي").click();
  await expect(page.getByRole("dialog")).toContainText("خانات خطتك مكتملة");
  const saved = await (
    await request.get(`/api/groups/${created.group.id}`, {
      headers: { Authorization: `Bearer ${created.organizer_token}` },
    })
  ).json();
  expect(saved.settings).toEqual(created.group.settings);
});
