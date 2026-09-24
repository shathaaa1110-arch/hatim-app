import { test, expect, type Page } from "@playwright/test";

async function register(page: Page, name: string, handle: string) {
  await page.getByRole("textbox", { name: "اسمك", exact: true }).fill(name);
  await page
    .getByRole("textbox", { name: "اسم المستخدم", exact: true })
    .fill(handle);
  await page
    .getByLabel("كلمة المرور", { exact: true })
    .fill("test-password-1234");
  await page.getByRole("button", { name: "أنشئ حسابي", exact: true }).click();
}
const button = (page: Page, name: string) =>
  page.getByRole("button", { name, exact: true });

test("persistent group: two accounts join, attend, vote, draw and preserve a shared plan", async ({
  page,
  browser,
  request,
}) => {
  test.setTimeout(150000);
  const stamp = Date.now().toString(36);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?preview=organizer");
  await page.getByRole("tab", { name: "قروباتي", exact: true }).click();
  await register(page, "أمل", `owner_${stamp}`);
  await button(page, "قروب جديد").click();
  await page
    .getByRole("textbox", { name: "اسم القروب", exact: true })
    .fill("ربع الاختبار");
  const createdResponse = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/v2/groups") && r.request().method() === "POST",
  );
  await button(page, "أنشئ القروب").click();
  const group = await (await createdResponse).json();
  await expect(button(page, "طلعة جديدة")).toBeVisible();
  await button(page, "الأعضاء والطرد").click();
  await page.getByTestId("fun-opt-in").click();
  await expect(
    page.getByTestId("fun-opt-in").getByRole("switch"),
  ).toBeChecked();

  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    isMobile: true,
    hasTouch: true,
  });
  const guest = await context.newPage();
  guest.on("pageerror", (error) => errors.push(error.message));
  await guest.goto(`/join/${group.invite_code}`);
  await register(guest, "سارة", `guest_${stamp}`);
  await button(guest, "انضم للّمّة").click();
  await expect(button(guest, "طلعة جديدة")).toBeVisible();
  await button(guest, "الأعضاء والطرد").click();
  await guest.getByTestId("fun-opt-in").click();
  await expect(
    guest.getByTestId("fun-opt-in").getByRole("switch"),
  ).toBeChecked();
  await guest.screenshot({
    path: "test-results/social-member-group.png",
    fullPage: true,
  });

  await button(page, "طلعة جديدة").click();
  await page
    .getByRole("textbox", { name: "اسم الطلعة", exact: true })
    .fill("عشاء اللمّة");
  const outingResponse = page.waitForResponse(
    (r) =>
      r.url().endsWith(`/groups/${group.id}/outings`) &&
      r.request().method() === "POST",
  );
  await button(page, "عائلية").click();
  await button(page, "ابدأ الطلعة").click();
  const trip = await (await outingResponse).json();
  expect(trip.settings.context).toEqual({
    kind: "family",
    priorities: ["quiet", "sharing"],
  });
  await expect(
    page.getByText("جوّ هذه الطلعة: عائلية", { exact: true }),
  ).toBeVisible();
  await button(guest, "الطلعات").click();
  await button(guest, "افتح طلعة عشاء اللمّة").click();
  await button(guest, "أنا حاضر").click();
  await expect(button(guest, "أنا حاضر")).toHaveCount(0);
  await button(page, "إدارة الطلعة والطرد").click();
  await expect(button(page, "طرد سارة فكاهيًا 😄")).toBeVisible({
    timeout: 15000,
  });
  await button(page, "طرد سارة فكاهيًا 😄").click();
  await expect(
    guest.getByText("سارة على مقعد الاحتياط 😄", { exact: true }),
  ).toBeVisible({ timeout: 15000 });
  await button(guest, "رجّعوني للملعب").click();
  await expect(
    guest.getByText("سارة على مقعد الاحتياط 😄", { exact: true }),
  ).toHaveCount(0);

  await page
    .getByRole("dialog")
    .getByRole("button", { name: "إغلاق", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await button(page, "الاختيار").click();
  await button(page, "نختار ركيزتنا مع بعض").click();
  const roundResponse = page.waitForResponse(
    (r) =>
      r.url().endsWith(`/outings/${trip.id}/rounds`) &&
      r.request().method() === "POST",
  );
  await button(page, "افتح الجولة").click();
  const savedRound = await roundResponse;
  expect(savedRound.status()).toBe(201);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const entries = await (await request.get("/api/v2/experiences")).json();
  const title = (id: string) =>
    entries.find((e: { id: string }) => e.id === id).title;
  const current = await savedRound.json();
  const options = current.round.options;
  await button(page, `${title(options[0].experience_id)} · ٠ أصوات`).click();
  await button(guest, "الاختيار").click();
  await button(guest, `${title(options[1].experience_id)} · ٠ أصوات`).click();
  await expect(page.getByText(/٢ من ٢ صوّتوا/)).toBeVisible({ timeout: 15000 });
  await button(page, "إغلاق التصويت واعتماد النتيجة").click();
  await button(page, "إغلاق واعتماد").click();
  await expect(
    page.getByText(
      "تساوت أعلى الأصوات. القرعة بين المتعادلين فقط، والأصوات الآن مغلقة.",
      { exact: true },
    ),
  ).toBeVisible();
  await button(page, "لفّ القرعة").click();
  await button(page, "اعتمد القرعة").click();
  const result = page.getByText(/^ركيزتكم: /);
  await expect(result).toBeVisible();
  const winner = await result.innerText();
  await expect(guest.getByText(winner, { exact: true })).toBeVisible({
    timeout: 15000,
  });
  await page.screenshot({
    path: "test-results/social-decision-desktop.png",
    fullPage: true,
  });
  await guest.screenshot({
    path: "test-results/social-decision-mobile.png",
    fullPage: true,
  });

  await button(page, "خطتنا").click();
  await button(page, "عشاء واحد").click();
  await button(page, "حدّث الخطة إلى ١ خانات").click();
  await button(page, "الاختيار").click();
  await expect(page.getByText(winner, { exact: true })).toBeVisible();
  await guest.reload();
  await button(guest, "افتح طلعة عشاء اللمّة").click();
  await button(guest, "الاختيار").click();
  await expect(guest.getByText(winner, { exact: true })).toBeVisible();
  await expect(button(guest, "جولة اختيار جديدة")).toHaveCount(0);

  await button(page, "الحضور").click();
  await button(page, "إنهاء الطلعة وحفظها").click();
  await button(page, "إنهاء وحفظ").click();
  await expect(
    page.getByText(
      "حفظنا هذه الطلعة كما كانت. تغيير الأذواق لاحقًا ما يغيّر ذكرياتها.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await button(page, "رجوع").click();
  await button(page, "الأعضاء والطرد").click();
  await button(page, "طرد سارة من القروب").click();
  await button(page, "تأكيد الطرد").click();
  await expect(
    guest.getByText("القروب غير متاح لحسابك أو أُزيلت عضويتك.", {
      exact: true,
    }),
  ).toBeVisible({ timeout: 15000 });
  await button(page, "إعادة سارة للقروب").click();
  await button(page, "إعادة العضو").click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await button(page, "رجوع").click();
  await button(page, "تسجيل الخروج").click();
  await button(page, "تسجيل الدخول").click();
  await page
    .getByRole("textbox", { name: "اسم المستخدم", exact: true })
    .fill(`owner_${stamp}`);
  await page
    .getByLabel("كلمة المرور", { exact: true })
    .fill("test-password-1234");
  await button(page, "ادخل إلى حسابي").click();
  await expect(button(page, "افتح قروب ربع الاختبار")).toBeVisible();
  expect(errors).toEqual([]);
  await context.close();
});
