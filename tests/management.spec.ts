import { test, expect, type Page } from "@playwright/test";
const button = (page: Page, name: string) =>
  page.getByRole("button", { name, exact: true });
async function dismiss(page: Page) {
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "إغلاق", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}

test("leadership and removal are discoverable, explicit and enforced", async ({
  page,
  browser,
  request,
}) => {
  test.setTimeout(120000);
  const stamp = Date.now().toString(36);
  const account = async (handle: string, name: string) => {
    const response = await request.post("/api/v2/auth/register", {
      data: {
        handle: `${handle}_${stamp}`,
        name,
        password: "test-password-1234",
      },
    });
    expect(response.status()).toBe(201);
    return response.json();
  };
  const owner = await account("manager", "أمل");
  const leader = await account("leader", "سارة");
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
  const group = await (
    await request.post("/api/v2/groups", {
      headers: auth(owner.token),
      data: { title: "فحص القيادة", preferences: { name: "أمل" } },
    })
  ).json();
  const guestGroup = await (
    await request.post(`/api/v2/invites/${group.invite_code}/join`, {
      headers: auth(leader.token),
      data: { preferences: { name: "سارة" } },
    })
  ).json();
  await page.addInitScript(
    (token) => localStorage.setItem("hatim.account.v1", token),
    owner.token,
  );
  await page.goto("/?preview=organizer");
  await button(page, "افتح قروب فحص القيادة").click();
  await button(page, "طلعة جديدة").click();
  await page
    .getByRole("textbox", { name: "اسم الطلعة", exact: true })
    .fill("قيادة من البداية");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "سارة", exact: true })
    .click();
  const creating = page.waitForResponse(
    (r) =>
      r.url().endsWith(`/groups/${group.id}/outings`) &&
      r.request().method() === "POST",
  );
  await button(page, "ابدأ الطلعة").click();
  const trip = await (await creating).json();
  expect(trip.coordinator_id).toBe(guestGroup.me.id);
  await expect(
    page.getByText("قائد الطلعة: سارة", { exact: true }),
  ).toBeVisible();
  await button(page, "إدارة الطلعة والطرد").click();
  await expect(button(page, "طرد سارة فكاهيًا 😄")).toBeVisible();
  await expect(button(page, "طرد سارة فكاهيًا 😄")).toBeDisabled();
  await expect(
    page.getByText("فعّل مشاركتك في الطرد الفكاهي من الزر أعلاه.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(button(page, "طرد سارة من القروب")).toBeEnabled();
  await button(page, "أوافق وأفعّل الطرد الفكاهي").click();
  await expect(
    page.getByText("سارة لم يفعّل المشاركة في المزاح بعد.", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/management-owner.png",
    fullPage: true,
  });
  await dismiss(page);

  const ctx = await browser.newContext({
    viewport: { width: 393, height: 852 },
    isMobile: true,
    hasTouch: true,
  });
  await ctx.addInitScript(
    (token) => localStorage.setItem("hatim.account.v1", token),
    leader.token,
  );
  const guest = await ctx.newPage();
  await guest.goto(`/join/${group.invite_code}`);
  await button(guest, "افتح طلعة قيادة من البداية").click();
  await button(guest, "إدارة الطلعة والطرد").click();
  await expect(button(guest, "تغيير قائد الطلعة")).toBeEnabled();
  await expect(button(guest, "طرد أمل من القروب")).toBeDisabled();
  await button(guest, "تغيير قائد الطلعة").click();
  await button(guest, "تعيين أمل قائدًا").click();
  // Confirmation stays in the same dialog, including a failed write and retry.
  let rejected = false;
  await guest.route(
    `**/api/v2/outings/${trip.id}/coordinator`,
    async (route) => {
      if (route.request().method() === "PUT" && !rejected) {
        rejected = true;
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: '{"detail":"temporary failure"}',
        });
      } else await route.continue();
    },
  );
  await button(guest, "تأكيد تعيين القائد").click();
  await expect(
    guest
      .getByRole("dialog")
      .getByText("حاتم غير متاح مؤقتًا. حاول مرة ثانية بعد شوي.", {
        exact: true,
      }),
  ).toBeVisible();
  await expect(guest.getByRole("dialog")).toHaveCount(1);
  await button(guest, "تأكيد تعيين القائد").click();
  await expect(button(guest, "تغيير قائد الطلعة")).toBeDisabled();
  await guest.screenshot({
    path: "test-results/management-member-mobile.png",
    fullPage: true,
  });
  await dismiss(guest);
  await expect(
    guest.getByText("قائد الطلعة: أمل", { exact: true }),
  ).toBeVisible();
  expect(
    (
      await (
        await request.get(`/api/v2/outings/${trip.id}`, {
          headers: auth(leader.token),
        })
      ).json()
    ).participants.find((p: { is_me: boolean }) => p.is_me).attendance,
  ).toBe("pending");

  // A temporary read failure keeps the plan; revoked membership clears it.
  await guest.route(`**/api/v2/outings/${trip.id}`, (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: '{"detail":"temporary failure"}',
    }),
  );
  await expect(
    guest.getByText("حاتم غير متاح مؤقتًا. حاول مرة ثانية بعد شوي.", {
      exact: true,
    }),
  ).toBeVisible({ timeout: 12000 });
  await expect(button(guest, "إدارة الطلعة والطرد")).toBeVisible();
  await guest.unroute(`**/api/v2/outings/${trip.id}`);
  await button(guest, "إدارة الطلعة والطرد").click();
  await button(page, "إدارة الطلعة والطرد").click();
  await button(page, "طرد سارة من القروب").click();
  await button(page, "تأكيد الطرد").click();
  await expect(button(page, "طرد سارة من القروب")).toHaveCount(0);
  await expect(
    page.getByText("أنت وحدك في الطلعة حاليًا", { exact: true }),
  ).toBeVisible();
  expect(
    (
      await request.get(`/api/v2/outings/${trip.id}`, {
        headers: auth(leader.token),
      })
    ).status(),
  ).toBe(404);
  await expect(
    guest.getByText("القروب غير متاح لحسابك أو أُزيلت عضويتك.", {
      exact: true,
    }),
  ).toBeVisible({ timeout: 12000 });
  await expect(button(guest, "إدارة الطلعة والطرد")).toHaveCount(0);
  await expect(guest.getByRole("dialog")).toHaveCount(0);
  await ctx.close();
});
