import type { Invitation } from "./api";
import { contexts, stamp, themeFor } from "./presentation";

const esc = (value: string | number) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const ar = (n: number) => n.toLocaleString("ar-SA");

export const pdfLinks = (invitation: Invitation, publicUrl: string) => [
  { text: "Hatim", fromEnd: 0, url: publicUrl },
  ...invitation.plan.entries.map((e, i) => ({
    text: "Google Maps",
    fromEnd: invitation.plan.entries.length - i - 1,
    url: e.maps_url,
  })),
];

export function invitationHtml(
  invitation: Invitation,
  publicUrl: string,
  fontBase64?: string,
) {
  const { details: d, plan: p } = invitation;
  const theme = themeFor(d);
  const link = (url: string, label: string, marker: string) =>
    `<a href="${esc(url)}">${esc(label)} · <span dir="ltr" style="display:inline-block;white-space:nowrap">${esc(marker)}</span></a>`;
  return `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(d.title)} · حاتم</title><style>
  ${fontBase64 ? `@font-face{font-family:Hatim;src:url(data:font/ttf;base64,${fontBase64}) format('truetype');font-weight:100 900}` : ""}
  @page{size:A4;margin:15mm}*{box-sizing:border-box}body{font-family:Hatim,Arial,sans-serif;margin:0;color:#193D32;background:white;font-size:12px;line-height:1.8}h1,h2,h3,p{margin:0 0 10px}h1{font-size:36px;line-height:1.6;overflow-wrap:anywhere}h2{font-size:23px;line-height:1.7}a{color:${theme.ink};text-decoration:underline;overflow-wrap:anywhere} .cover{background:${theme.light};border:1px solid ${theme.accent};border-radius:22px;padding:27px;text-align:center;color:${theme.ink};break-inside:avoid} .brand{font-size:14px;letter-spacing:1px}.ornament{color:${theme.ink};font-size:28px;margin:8px 0}.message{font-size:17px;white-space:pre-wrap;overflow-wrap:anywhere}.meta{margin:20px 0;padding:14px 18px;border-right:3px solid ${theme.accent};background:#F8F8F2}.muted{color:#56685C;font-size:12px}.entry{margin:18px 0;padding:20px;border:1px solid #DCE4D6;border-radius:18px;break-inside:avoid;page-break-inside:avoid}.priority{display:inline-block;background:${theme.light};padding:2px 12px;border-radius:12px;font-size:12px;margin-bottom:10px}.links{margin-top:12px;line-height:2.2}.foot{break-inside:avoid;margin:22px 0 8px;padding-top:14px;border-top:1px solid #DCE4D6;font-size:11px;color:#56685C} .warning{border-right:3px solid #A45034;padding:10px 15px;background:#FBF2EA}.actions{margin:12px 0;text-align:center}button{font:inherit;padding:10px 22px;border-radius:12px;background:${theme.ink};color:white;border:0;cursor:pointer}@media print{.actions{display:none}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
  </style></head><body>
  <section class="cover"><div class="brand">حــاتم · ${esc(contexts[p.context.kind ?? "any"])}</div><div class="ornament">✦</div><h1>${esc(d.title)}</h1><p class="message">${esc(d.message ?? "")}</p>${d.when_label ? `<p><strong>${esc(d.when_label)}</strong></p>` : ""}${d.meeting_note ? `<p>نتلاقى: ${esc(d.meeting_note)}</p>` : ""}<p class="muted">الطعم يبقى… والخطة تتغيّر.</p></section>
  <div class="meta">${ar(p.entries.length)} تجارب قادمة · ${ar(p.available)} خانات متبقية · ${ar(p.consumed)} عشناها<br>تقدير التجارب المعروضة للشخص: ${ar(p.entries.reduce((n, e) => n + e.price, 0))} ر.س<p class="muted">نسخة أُصدرت ${esc(stamp(invitation.read_at))} بتوقيت الرياض. ${link(publicUrl, "افتح آخر خطة", "Hatim")}</p></div>
  ${p.anchor_unavailable ? '<p class="warning">الركيزة تحتاج مراجعة من المنظّم؛ لم نستبدلها بصمت.</p>' : ""}${p.unfilled ? `<p class="muted">${ar(p.unfilled)} خانات لم تُملأ بعد.</p>` : ""}
  ${p.entries.map((e, i) => `<section class="entry"><span class="priority">${esc(e.priority)} · خانة ${ar(p.consumed + i + 1)}</span><h2>${esc(e.title)}</h2><p><strong>${esc(e.venue)}</strong> · ${esc(e.neighborhood)}</p><p class="muted">${esc(e.cuisine)} · ${ar(e.price)} ر.س للشخص · ${ar(e.minutes)} دقيقة للتجربة</p><p>${esc(e.reason)}</p><h3>وش نطلب؟</h3><p>${esc(e.dishes.length ? e.dishes.join(" · ") : "اسألوا المكان عن أطباق التجربة المتاحة.")}</p>${e.options.map((option) => `<p class="muted">خيار متاح: ${esc(option)}</p>`).join("")}<div class="links">${link(e.maps_url, e.maps_verified ? "الموقع والتقييم الحالي" : "البحث عن المكان وتقييمه", `Google Maps (${i + 1})`)}</div>${e.is_demo ? '<p class="muted">مكان توضيحي؛ رابط بحث وليس موقعًا موثقًا، ولا تقييم Google مؤكد له.</p>' : ""}</section>`).join("")}
  ${!p.entries.length ? '<p class="warning">لا توجد تجارب قادمة في الخطة الحالية. راجع المنظّم قبل تحديد الأماكن.</p>' : ""}
  <footer class="foot">هذه نسخة ثابتة؛ الرابط يعرض آخر خطة ما دام المنظّم يتيح المشاركة. الأطباق اقتراحات وليست طلبًا مؤكدًا؛ تأكدوا من المكونات والتعديلات مع المكان. الأسعار تقديرية، والمدة لا تشمل الطريق، والموعد ليس حجزًا. تقييم Google يُراجع من رابط المكان.<br>حــاتم · لكل لمّة، حكاية</footer>
  </body></html>`;
}
