import {
  test,
  expect,
  type APIRequestContext,
  type Page,
} from "@playwright/test";

const button = (page: Page, name: string) =>
  page.getByRole("button", { name, exact: true });
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const host = { persona: "host", outfit: "thobe" };
const late = { persona: "on_way", outfit: "abaya", color: "rose" };

async function choose(page: Page, part: string, option: string) {
  await button(page, `تعديل ${part}`).click();
  await button(page, option).click();
}

async function artworkReady(page: Page) {
  await expect
    .poll(() =>
      page
        .getByRole("dialog")
        .locator("img")
        .evaluateAll(
          (images) =>
            images.length > 0 &&
            images.every(
              (image) =>
                (image as HTMLImageElement).complete &&
                (image as HTMLImageElement).naturalWidth > 0,
            ),
        ),
    )
    .toBe(true);
}

async function account(request: APIRequestContext, name: string) {
  const response = await request.post("/api/v2/auth/register", {
    data: {
      name,
      handle: `skin_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      password: "test-password-1234",
    },
  });
  expect(response.status()).toBe(201);
  return response.json();
}
async function seed(request: APIRequestContext) {
  const owner = await account(request, "أمل");
  const response = await request.post("/api/v2/groups", {
    headers: auth(owner.token),
    data: { title: "لمّة الشخصيات", preferences: { name: "أمل" } },
  });
  expect(response.status()).toBe(201);
  return { owner, circle: await response.json() };
}
async function visit(page: Page, token: string, code: string) {
  await page.addInitScript(
    (value) => localStorage.setItem("hatim.account.v1", value),
    token,
  );
  await page.goto(`/join/${code}`);
  await expect(button(page, "شخصيتي في القروب")).toBeVisible();
}
async function save(page: Page, scope: "groups" | "outings") {
  const response = page.waitForResponse(
    (r) =>
      r.url().includes(`/api/v2/${scope}/`) &&
      r.url().endsWith("/me/skin") &&
      r.request().method() === "PUT",
  );
  await button(page, "حفظ الشخصية").click();
  const result = await response;
  expect(result.status()).toBe(200);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  return result.json();
}

test("mobile skins customize, sync to companions, override an outing and freeze in its archive", async ({
  page,
  browser,
  request,
}) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 393, height: 852 });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const { owner, circle } = await seed(request);
  const guest = await account(request, "سارة");
  expect(
    (
      await request.post(`/api/v2/invites/${circle.invite_code}/join`, {
        headers: auth(guest.token),
        data: { preferences: { name: "سارة" } },
      })
    ).status(),
  ).toBe(200);
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
  });
  const companion = await context.newPage();
  try {
    await visit(companion, guest.token, circle.invite_code);
    await button(companion, "الأعضاء والطرد").click();
    await visit(page, owner.token, circle.invite_code);
    await button(page, "شخصيتي في القروب").click();
    // The dice shuffles playful parts; explicit choices below still win.
    await button(page, "فاجئني").click();
    await button(page, "شخصية المعزّب").click();
    await choose(page, "اللبس", "ثوب");
    await choose(page, "البشرة", "قمحي غامق");
    await choose(page, "غطاء الرأس", "شماغ");
    await choose(page, "الخلفية", "زعفران");
    await choose(page, "التعبير", "غمزة");
    await choose(page, "النظارة", "نظارة");
    await choose(page, "العبارة", "الحلى عليّ… مين قال شبعتوا؟");
    // Actual layered images replace emoji; all choices still have spoken labels.
    await button(page, "تعديل اللبس").click();
    await artworkReady(page);
    await page.screenshot({ path: "test-results/skins-choices-mobile.png" });
    // Scroll back to the artwork before capturing the mobile editor.
    await page
      .getByRole("dialog")
      .getByRole("img", { name: "أمل · المعزّب", exact: true })
      .scrollIntoViewIfNeeded();
    await page.screenshot({ path: "test-results/skins-editor-mobile.png" });
    const group = await save(page, "groups");
    expect(group.me.skin).toMatchObject({
      ...host,
      tone: "tan",
      headwear: "shemagh",
      color: "saffron",
      expression: "wink",
      accessory: "glasses",
      phrase: "extra",
    });
    await expect(
      companion.getByRole("img", { name: "أمل · المعزّب", exact: true }),
    ).toBeVisible({ timeout: 15000 });
    const trip = await (
      await request.post(`/api/v2/groups/${circle.id}/outings`, {
        headers: auth(owner.token),
        data: { title: "عشاء الشخصيات", slots: 3 },
      })
    ).json();
    await request.put(`/api/v2/outings/${trip.id}/me/attendance`, {
      headers: auth(guest.token),
      data: { attendance: "going", budget_override: null },
    });
    await button(page, "افتح طلعة عشاء الشخصيات").click();
    await button(page, "شخصيتي لهذه الطلعة").click();
    await button(page, "شخصية اختاروا أنتم").click();
    await choose(page, "اللبس", "كاجوال");
    await save(page, "outings");
    await expect(
      page.getByRole("img", { name: "أمل · اختاروا أنتم", exact: true }),
    ).toBeVisible();
    expect(
      (
        await (
          await request.get(`/api/v2/groups/${circle.id}`, {
            headers: auth(owner.token),
          })
        ).json()
      ).me.skin,
    ).toEqual(group.me.skin);
    await button(page, "الاختيار").click();
    await expect(
      page.getByText("شخصياتكم حول الاختيار", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("img", { name: "أمل · اختاروا أنتم", exact: true }),
    ).toBeVisible();
    await button(page, "شخصيتي لهذه الطلعة").click();
    await button(page, "استخدام شخصية القروب").click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(
      page.getByRole("img", { name: "أمل · المعزّب", exact: true }),
    ).toBeVisible();
    await request.post(`/api/v2/outings/${trip.id}/close`, {
      headers: auth(owner.token),
    });
    await request.put(`/api/v2/groups/${circle.id}/me/skin`, {
      headers: auth(owner.token),
      data: { skin: late, expected: group.me.skin },
    });
    await expect(button(page, "شخصيتي لهذه الطلعة")).toHaveCount(0, {
      timeout: 15000,
    });
    await expect(
      page.getByRole("img", { name: "أمل · المعزّب", exact: true }),
    ).toBeVisible();
    await button(page, "خطتنا").click();
    await page
      .getByText("وجوه اللمّة", { exact: true })
      .scrollIntoViewIfNeeded();
    await page.screenshot({ path: "test-results/skins-plan-mobile.png" });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
});

test("editor preserves drafts on failure and rejects stale edits from another device", async ({
  page,
  request,
}) => {
  const { owner, circle } = await seed(request);
  await visit(page, owner.token, circle.invite_code);
  await button(page, "شخصيتي في القروب").click();
  await button(page, "شخصية اختاروا أنتم").click();
  await choose(page, "اللبس", "عباية");
  const path = `/api/v2/groups/${circle.id}/me/skin`;
  const changed = await request.put(path, {
    headers: auth(owner.token),
    data: { skin: late, expected: null },
  });
  expect(changed.status()).toBe(200);
  await button(page, "حفظ الشخصية").click();
  await expect(
    page.getByRole("dialog").getByText(/تغيّرت شخصيتك من جهاز آخر/),
  ).toBeVisible();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("img", { name: "أمل · اختاروا أنتم", exact: true }),
  ).toBeVisible();
  await button(page, "إغلاق").click();
  // Wait for regular background refresh before reopening the editor.
  await expect(
    page.getByRole("img", { name: "أمل · عند الإشارة", exact: true }),
  ).toBeVisible({ timeout: 15000 });
  await button(page, "شخصيتي في القروب").click();
  await button(page, "شخصية المعزّب").click();
  await choose(page, "التعبير", "غمزة");
  await page.route(`**${path}`, (route) => route.abort("failed"), { times: 1 });
  await button(page, "حفظ الشخصية").click();
  await expect(
    page.getByRole("dialog").getByText(/ما قدرنا نتصل بحاتم/),
  ).toBeVisible();
  const saved = await save(page, "groups");
  expect(saved.me.skin).toMatchObject({
    persona: "host",
    outfit: "abaya",
    expression: "wink",
    color: "rose",
  });
  await button(page, "شخصيتي في القروب").click();
  await button(page, "بدون شخصية").click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("img", { name: "أمل · بدون شخصية", exact: true }),
  ).toBeVisible();
});

test("result reactions show my own vote privately and a shared dice for draws", async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 393, height: 852 });
  const { owner, circle } = await seed(request);
  const guest = await account(request, "سارة");
  await request.post(`/api/v2/invites/${circle.invite_code}/join`, {
    headers: auth(guest.token),
    data: { preferences: { name: "سارة" } },
  });
  for (const [token, skin] of [
    [owner.token, host],
    [guest.token, late],
  ] as const)
    await request.put(`/api/v2/groups/${circle.id}/me/skin`, {
      headers: auth(token),
      data: { skin, expected: null },
    });
  const trip = await (
    await request.post(`/api/v2/groups/${circle.id}/outings`, {
      headers: auth(owner.token),
      data: { title: "عشاء النتيجة", slots: 3 },
    })
  ).json();
  await request.put(`/api/v2/outings/${trip.id}/me/attendance`, {
    headers: auth(guest.token),
    data: { attendance: "going", budget_override: null },
  });
  const round = async (mode: "vote" | "draw") =>
    (
      await (
        await request.post(`/api/v2/outings/${trip.id}/rounds`, {
          headers: auth(owner.token),
          data: { mode, experience_ids: ["fire", "sushi"] },
        })
      ).json()
    ).round.id;
  const vote = await round("vote");
  for (const token of [owner.token, guest.token])
    await request.put(`/api/v2/rounds/${vote}/my-vote`, {
      headers: auth(token),
      data: { experience_id: "fire" },
    });
  await request.post(`/api/v2/rounds/${vote}/resolve`, {
    headers: auth(owner.token),
  });
  await visit(page, owner.token, circle.invite_code);
  await button(page, "افتح طلعة عشاء النتيجة").click();
  await button(page, "الاختيار").click();
  await expect(
    page.getByRole("img", { name: "أمل · المعزّب · فاز اختيارك", exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/شخصيتك تحتفل/)).toBeVisible();
  // Another member's ballot is secret, so their face never reacts here.
  await expect(
    page.getByRole("img", { name: "سارة · عند الإشارة", exact: true }),
  ).toBeVisible();
  await page
    .getByText("شخصياتكم حول الاختيار", { exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/skins-reaction-mobile.png" });
  const draw = await round("draw");
  await request.post(`/api/v2/rounds/${draw}/draw`, {
    headers: auth(owner.token),
  });
  await expect(
    page.getByRole("img", {
      name: "سارة · عند الإشارة · القرعة حسمت",
      exact: true,
    }),
  ).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/شخصيتك تحتفل/)).toHaveCount(0);
});
test("generated layers load, each part stays independent and narrow-screen edits persist", async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 320, height: 780 });
  const { owner, circle } = await seed(request);
  await visit(page, owner.token, circle.invite_code);
  await button(page, "شخصيتي في القروب").click();
  const avatar = page
    .getByRole("dialog")
    .getByRole("img", { name: "أمل · المعزّب", exact: true });
  const sources = () =>
    avatar
      .locator("img")
      .evaluateAll((images) =>
        images.map((image) => (image as HTMLImageElement).src),
      );
  await artworkReady(page);
  const initial = await sources();
  expect(initial.length).toBeGreaterThanOrEqual(5);
  await avatar.screenshot({ path: "test-results/layered-casual.png" });
  await choose(page, "البشرة", "أسمر");
  await artworkReady(page);
  const darker = await sources();
  expect(darker.filter((source) => !initial.includes(source))).toHaveLength(1);
  expect(darker.some((source) => source.includes("head-deep."))).toBe(true);
  await choose(page, "اللبس", "عباية");
  await artworkReady(page);
  const dressed = await sources();
  expect(dressed.filter((source) => !darker.includes(source))).toHaveLength(1);
  expect(dressed.some((source) => source.includes("head-deep."))).toBe(true);

  for (const cover of ["حجاب", "شماغ", "غترة", "طاقية", "بدون غطاء"]) {
    await choose(page, "غطاء الرأس", cover);
    await artworkReady(page);
    await avatar.scrollIntoViewIfNeeded();
    await avatar.screenshot({
      path: `test-results/layered-cover-${cover}.png`,
    });
  }
  await choose(page, "غطاء الرأس", "حجاب");
  await choose(page, "التعبير", "نظرة جانبية");
  await choose(page, "النظارة", "نظارة");
  await artworkReady(page);
  await avatar.scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/layered-editor-320.png" });
  await expect(button(page, "حفظ الشخصية")).toBeInViewport();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const group = await save(page, "groups");
  expect(group.me.skin).toMatchObject({
    tone: "deep",
    outfit: "abaya",
    headwear: "hijab",
    expression: "side_eye",
    accessory: "glasses",
  });
  await page.reload();
  await button(page, "شخصيتي في القروب").click();
  await choose(page, "اللبس", "كاجوال");
  const updated = await save(page, "groups");
  expect(updated.me.skin).toEqual({ ...group.me.skin, outfit: "casual" });
});
