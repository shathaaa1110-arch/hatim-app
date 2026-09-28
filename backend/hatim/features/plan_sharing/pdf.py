"""One server-owned, offline renderer. Accept only the public invitation projection."""

from datetime import datetime
from io import BytesIO
from pathlib import Path
from zoneinfo import ZoneInfo

import arabic_reshaper
from bidi import get_display
from reportlab.graphics import renderPDF
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Flowable, SimpleDocTemplate, Spacer, Table, TableStyle

from .models import PublicInvitation

FONTS = Path(__file__).with_name("fonts")
for name, filename in (("Hatim", "400Regular"), ("HatimBold", "600SemiBold")):
    pdfmetrics.registerFont(TTFont(name, str(FONTS / f"IBMPlexSansArabic_{filename}.ttf")))

THEMES = {
    "palm": ("#234C3C", "#EAF0E4", "#D4B273"),
    "saffron": ("#713A24", "#FBEDDD", "#DFAC63"),
    "rose": ("#673F50", "#F5E6E9", "#CD9DAB"),
}
CONTEXTS = {"any": "على راحتنا", "family": "لمّة عائلية", "friends": "طلعة الربع"}
MUTED = "#56685C"
# Keep vocalization in display order; do not interpret user text as markup.
RESHAPER = arabic_reshaper.ArabicReshaper(
    configuration={"delete_harakat": False, "shift_harakat_position": True}
)


def visual(text: str) -> str:
    return get_display(RESHAPER.reshape(text), base_dir="R")


def number(value: int) -> str:
    return str(value).translate(str.maketrans("0123456789", "٠١٢٣٤٥٦٧٨٩"))


class Text(Flowable):
    """Wrap logical text first, then shape each line (never reverse a whole paragraph)."""

    def __init__(self, text, size=11, color="#234C3C", bold=False, gap=4, link=None):
        super().__init__()
        self.text, self.size, self.color = text, size, color
        self.font = "HatimBold" if bold else "Hatim"
        self.leading, self.gap, self.link = size * 1.5, gap, link

    def wrap(self, width, height):
        self.width = width
        self.lines = []

        def fits(value):
            return pdfmetrics.stringWidth(visual(value), self.font, self.size) <= width

        for paragraph in [" ".join(self.text.split())]:
            line = ""
            for word in paragraph.split():
                candidate = f"{line}{word}".strip()
                if line and not fits(candidate):
                    self.lines.append(visual(line))
                    line = ""
                # Also handle long unbroken user text without clipping the card.
                for char in word:
                    candidate = f"{line}{char}"
                    if line and not fits(candidate):
                        self.lines.append(visual(line))
                        line = ""
                    line += char
                line += " "
            self.lines.append(visual(line.strip()))
        self.height = len(self.lines) * self.leading + self.gap
        return width, self.height

    def draw(self):
        self.canv.setFont(self.font, self.size)
        self.canv.setFillColor(HexColor(self.color))
        for i, line in enumerate(self.lines):
            self.canv.drawRightString(self.width, self.height - (i + 1) * self.leading, line)
        if self.link:
            self.canv.linkURL(self.link, (0, 0, self.width, self.height), relative=1)


class Panel(Flowable):
    """A measured card moves to the next page as a unit, preserving its map link."""

    def __init__(self, children, background="#FFFFFF", border="#DCE4D6", padding=15):
        super().__init__()
        self.children, self.background, self.border, self.padding = (
            children,
            background,
            border,
            padding,
        )

    def wrap(self, width, height):
        self.width = width
        self.sizes = [c.wrap(width - 2 * self.padding, height) for c in self.children]
        self.height = sum(h for _, h in self.sizes) + 2 * self.padding
        return self.width, self.height

    def draw(self):
        canvas = self.canv
        canvas.setFillColor(HexColor(self.background))
        canvas.setStrokeColor(HexColor(self.border))
        canvas.roundRect(0, 0, self.width, self.height, 12, fill=1, stroke=1)
        y = self.height - self.padding
        for child, (_, height) in zip(self.children, self.sizes, strict=True):
            y -= height
            child.drawOn(canvas, self.padding, y)


class InvitationCode(Flowable):
    def __init__(self, url):
        super().__init__()
        self.url = url
        self.width = self.height = 72

    def draw(self):
        code = QrCodeWidget(self.url)
        x0, y0, x1, y1 = code.getBounds()
        drawing = Drawing(72, 72, transform=[72 / (x1 - x0), 0, 0, 72 / (y1 - y0), 0, 0])
        drawing.add(code)
        renderPDF.draw(drawing, self.canv, 0, 0)
        self.canv.linkURL(self.url, (0, 0, 72, 72), relative=1)


def render_pdf(invitation: PublicInvitation, public_url: str) -> bytes:
    details, plan = invitation.details, invitation.plan
    ink, light, accent = THEMES[details.theme]
    stamp = datetime.fromisoformat(invitation.read_at).astimezone(ZoneInfo("Asia/Riyadh"))
    issued = stamp.strftime("%Y/%m/%d · %H:%M")
    output = BytesIO()
    width = A4[0] - 84
    document = SimpleDocTemplate(
        output,
        pagesize=A4,
        rightMargin=42,
        leftMargin=42,
        topMargin=47,
        bottomMargin=49,
        title=details.title,
        author="حاتم",
        subject="خطة التجارب والأطباق المقترحة",
    )
    cover = [
        Text(CONTEXTS[plan.context.kind], 10, ink),
        Text(details.title, 25, ink, bold=True, gap=6),
    ]
    if details.message:
        cover.append(Text(details.message, 12, ink, gap=8))
    if details.when_label:
        cover.append(Text(f"الموعد · {details.when_label}", 11, ink, bold=True))
    if details.meeting_note:
        cover.append(Text(f"نلتقي · {details.meeting_note}", 11, ink))
    cover.append(Text(f"أُصدرت {issued} · بتوقيت الرياض", 8, MUTED, gap=0))
    # Put the return link on page one, avoiding a final page containing only a QR.
    live = [InvitationCode(public_url), Text("افتح آخر خطة", 9, ink, True, link=public_url)]
    hero = Table([[live, cover]], colWidths=[100, width - 148])
    hero.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "MIDDLE")]))
    story = [Panel([hero], light, accent, 18), Spacer(1, 13)]
    summary = Table(
        [
            [
                [
                    Text(f"{number(sum(e.price for e in plan.entries))} ر.س", 18, ink, True),
                    Text("تقدير التجارب للشخص", 9, MUTED, gap=0),
                ],
                [Text(number(plan.available), 18, ink, True), Text("خانات متاحة", 9, MUTED, gap=0)],
                [
                    Text(number(len(plan.entries)), 18, ink, True),
                    Text("تجارب قادمة", 9, MUTED, gap=0),
                ],
            ]
        ],
        colWidths=[(width - 12) / 3] * 3,
    )
    summary.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 12),
                ("RIGHTPADDING", (0, 0), (-1, -1), 12),
            ]
        )
    )
    story += [summary, Spacer(1, 9)]
    notices = []
    if plan.archived:
        notices.append("طلعة مؤرشفة؛ هذه اختيارات الخطة المحفوظة.")
    if plan.anchor_unavailable:
        notices.append("الركيزة تحتاج مراجعة من المنظّم؛ لم نستبدلها بصمت.")
    if plan.unfilled:
        notices.append(f"{number(plan.unfilled)} خانات لم تُملأ بعد.")
    if plan.consumed:
        notices.append(f"{number(plan.consumed)} خانات استُهلكت؛ أدناه التجارب القادمة فقط.")
    if not plan.entries:
        notices.append("لا توجد تجارب قادمة حاليًا. راجع المنظّم قبل تحديد الأماكن.")
    if notices:
        story += [Panel([Text(t, 10, ink) for t in notices], light, light, 12), Spacer(1, 12)]
    for index, entry in enumerate(plan.entries):
        parts = [
            Text(f"خانة {number(plan.consumed + index + 1)}   /   {entry.priority}", 10, ink, True),
            Text(entry.title, 17, ink, True, gap=2),
            Text(f"{entry.venue} · {entry.neighborhood}", 11, ink),
            Text(
                f"{entry.cuisine}  |  {number(entry.price)} ر.س للشخص  |  {number(entry.minutes)} دقيقة",
                10,
                MUTED,
            ),
            Text(entry.reason, 10, MUTED, gap=8),
            Text("وش نطلب؟", 11, ink, True, gap=2),
            Text(" · ".join(entry.dishes) or "اسألوا المكان عن أطباق التجربة المتاحة.", 11, ink),
        ]
        parts += [Text(f"خيار متاح: {option}", 9, MUTED) for option in entry.options]
        label = "افتح الموقع والتقييم الحالي" if entry.maps_verified else "ابحث عن المكان وتقييمه"
        parts.append(Text(f"{label}  /  Google Maps", 10, ink, True, link=entry.maps_url))
        if entry.is_demo:
            parts.append(
                Text("مكان توضيحي؛ الرابط بحث بالاسم، وليس موقعًا أو تقييمًا موثّقًا.", 8, MUTED, gap=0)
            )
        story += [Panel(parts, border=light), Spacer(1, 12)]
    story += [
        Text(
            "هذه نسخة ثابتة؛ رابط الدعوة في أعلى الملف يعرض آخر خطة ما دام متاحًا. "
            "الأطباق اقتراحات؛ تأكدوا من المكونات والتعديلات مع المكان. الأسعار تقديرية، "
            "والمدة لا تشمل الطريق، والموعد ليس حجزًا. تقييم Google الحالي متاح من رابط المكان.",
            9,
            MUTED,
        )
    ]

    def page_frame(canvas, doc):
        canvas.saveState()
        canvas.setFillColor(HexColor(ink))
        canvas.setFont("HatimBold", 11)
        canvas.drawRightString(A4[0] - 48, A4[1] - 31, visual("حاتم / لكل لمّة، حكاية"))
        canvas.setStrokeColor(HexColor(light))
        canvas.line(48, 40, A4[0] - 48, 40)
        canvas.setFont("Hatim", 8)
        canvas.setFillColor(HexColor(MUTED))
        canvas.drawRightString(A4[0] - 48, 26, visual("نسخة قابلة للمشاركة · خطة التجارب"))
        canvas.drawString(48, 26, visual(f"صفحة {number(doc.page)}"))
        canvas.restoreState()

    document.build(story, onFirstPage=page_frame, onLaterPages=page_frame)
    return output.getvalue()
