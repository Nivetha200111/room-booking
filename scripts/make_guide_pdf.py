"""Generate the KeenStack Meeting Rooms member guide PDF (with screenshots)."""
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors, utils
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, ListFlowable, ListItem, Image, KeepTogether,
)

HERE = os.path.dirname(os.path.abspath(__file__))
SHOTS = os.path.join(HERE, "shots")
OUTPUT = os.path.join(os.path.dirname(HERE), "KeenStack-Room-Booking-Guide.pdf")

PHANTOM = colors.HexColor("#112245")
KEEN = colors.HexColor("#20C9A0")
INK = colors.HexColor("#1f2937")
MUTED = colors.HexColor("#5b6a8a")
LINE = colors.HexColor("#D9DEE2")
URL = "https://room-booking-chi-six.vercel.app/"

st = {
    "h2": ParagraphStyle("h2", fontName="Helvetica-Bold", fontSize=13, textColor=PHANTOM,
                         spaceBefore=12, spaceAfter=5, leading=16),
    "body": ParagraphStyle("body", fontName="Helvetica", fontSize=10.5, textColor=INK, leading=15, spaceAfter=4),
    "bullet": ParagraphStyle("bullet", fontName="Helvetica", fontSize=10.5, textColor=INK, leading=15),
    "muted": ParagraphStyle("muted", fontName="Helvetica", fontSize=9, textColor=MUTED, leading=13),
    "cap": ParagraphStyle("cap", fontName="Helvetica-Oblique", fontSize=8.5, textColor=MUTED, leading=11, spaceBefore=3),
}


def step(num, title):
    return Paragraph(f'<font color="#20C9A0"><b>{num}</b></font>&nbsp;&nbsp;<b>{title}</b>',
                     ParagraphStyle("step", fontName="Helvetica-Bold", fontSize=12.5, textColor=PHANTOM,
                                    spaceBefore=13, spaceAfter=4, leading=15))


def body(t):
    return Paragraph(t, st["body"])


def bullets(items):
    return ListFlowable([ListItem(Paragraph(i, st["bullet"]), value="square", leftIndent=12, spaceb=2) for i in items],
                        bulletType="bullet", bulletColor=KEEN, bulletFontSize=6, leftIndent=10, start="square")


def shot_flowables(name, caption, w_mm=135):
    path = os.path.join(SHOTS, name)
    ir = utils.ImageReader(path)
    iw, ih = ir.getSize()
    w = w_mm * mm
    h = w * ih / iw
    img = Image(path, width=w, height=h)
    framed = Table([[img]], colWidths=[w])
    framed.hAlign = "CENTER"
    framed.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.75, LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0), ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    cap = Paragraph(caption, ParagraphStyle("capc", parent=st["cap"], alignment=1))
    return [framed, cap, Spacer(1, 8)]


def step_block(num, title, paras, shotname=None, caption="", w=135):
    """Keep a step's heading, text and screenshot together on one page."""
    items = [step(num, title)] + list(paras)
    if shotname:
        items += shot_flowables(shotname, caption, w)
    return KeepTogether(items)


def header_band(canvas, doc):
    canvas.saveState()
    w, h = A4
    canvas.setFillColor(PHANTOM); canvas.rect(0, h - 42 * mm, w, 42 * mm, fill=1, stroke=0)
    canvas.setFillColor(KEEN); canvas.rect(0, h - 43.2 * mm, w, 1.2 * mm, fill=1, stroke=0)
    canvas.setFillColor(KEEN); canvas.setFont("Helvetica-Bold", 9)
    canvas.drawString(20 * mm, h - 16 * mm, "KEENSTACK")
    canvas.setFillColor(colors.white); canvas.setFont("Helvetica-Bold", 21)
    canvas.drawString(20 * mm, h - 26 * mm, "Meeting Rooms")
    canvas.setFillColor(colors.HexColor("#bdc4d2")); canvas.setFont("Helvetica", 11)
    canvas.drawString(20 * mm, h - 33 * mm, "How to book a room  -  member guide")
    canvas.setFillColor(MUTED); canvas.setFont("Helvetica", 8.5)
    canvas.drawString(20 * mm, 10 * mm, "KeenStack Software Pvt Ltd")
    canvas.drawRightString(w - 20 * mm, 10 * mm, URL)
    canvas.restoreState()


def plain_header(canvas, doc):
    canvas.saveState()
    w, h = A4
    canvas.setFillColor(MUTED); canvas.setFont("Helvetica", 8.5)
    canvas.drawString(20 * mm, 10 * mm, "KeenStack Meeting Rooms")
    canvas.drawRightString(w - 20 * mm, 10 * mm, f"Page {doc.page}")
    canvas.restoreState()


def build():
    doc = BaseDocTemplate(OUTPUT, pagesize=A4, leftMargin=20 * mm, rightMargin=20 * mm,
                          topMargin=48 * mm, bottomMargin=18 * mm,
                          title="KeenStack Meeting Rooms - Member Guide", author="KeenStack")
    fr_first = Frame(doc.leftMargin, doc.bottomMargin, doc.width, A4[1] - 48 * mm - 18 * mm, id="first")
    fr_rest = Frame(doc.leftMargin, doc.bottomMargin, doc.width, A4[1] - 22 * mm - 18 * mm, id="rest")
    doc.addPageTemplates([
        PageTemplate(id="first", frames=[fr_first], onPage=header_band),
        PageTemplate(id="rest", frames=[fr_rest], onPage=plain_header),
    ])

    from reportlab.platypus import NextPageTemplate
    s = [NextPageTemplate("rest")]

    s.append(body(f'Book a meeting room from your phone or laptop. Go to '
                  f'<font color="#153CA8"><b>{URL}</b></font> and sign in. No app to install.'))

    s.append(step_block(1, "Sign in",
        [body("Enter your Employee ID (like <b>KSIN0042</b>) and your name. No password. "
              "Your name locks to your ID the first time, so use your own.")],
        "login.png", "The sign-in screen.", 92))

    s.append(step_block(2, "Read the map",
        [body("The home screen is a map of every room, grouped by floor. The door tells you the status: "
              '<font color="#1aa786"><b>green / open</b></font> means free, '
              '<font color="#b8860b"><b>amber / shut</b></font> means in use, and a '
              "<b>locked</b> room is off limits."),
         body("<b>Floor 1:</b> Paris, Washington DC, Phoenix.&nbsp;&nbsp;"
              "<b>Floor 2:</b> New York, San Diego, Singapore.")],
        "floormap.png", "Open rooms glow green with the door open; booked rooms are amber with the door shut.", 105))

    s.append(step_block(3, "Book a room",
        [body("Tap a green room. Add an <b>agenda</b>, <b>who's coming</b> (type names, press Enter), "
              "and a <b>day and time</b>. Hit Confirm. Two meetings can't overlap in the same room, "
              "and it flags you if the group won't fit.")],
        "booking.png", "The booking form. Pick a day chip, set the time, add attendees.", 105))

    s.append(step_block(4, "Book ahead, for as long as you need",
        [body("It's not just for right now. Use the day chips for a future date, or the <b>Week</b> view "
              "to plan. There's no limit on how long a booking can run.")],
        "week.png", "The Week view: green cells are free, amber cells are busier. Tap any cell to book.", 105))

    s.append(step_block(5, "Want a room that's taken?",
        [body("Tap the amber room and pick one: <b>Request Release</b> (ask the owner, they approve or "
              "decline) or <b>Release Now</b> (take it for something urgent, with a reason, and the owner "
              "is notified).")],
        "release.png", "Asking for a busy room.", 105))

    s.append(step_block(6, "Notifications and cancelling",
        [bullets([
            "The <b>bell</b> (top right) shows requests for your rooms (Approve / Decline) and a note when someone takes one of yours.",
            "To drop a booking, open it and tap <b>Cancel</b>.",
        ])]))

    s.append(Spacer(1, 10))
    s.append(HRFlowable(color=LINE, thickness=0.6, spaceAfter=8))
    s.append(Paragraph("House rules", st["h2"]))
    s.append(bullets([
        "Water only in the rooms.",
        "Start and finish on time.",
        "Cancel what you don't need so someone else can grab it.",
        "Everyone sees the same board, updated within seconds.",
    ]))
    s.append(Spacer(1, 8))
    s.append(Paragraph("Stuck? Ping the IT / Admin team.", st["muted"]))

    doc.build(s)
    print("Wrote", OUTPUT)


if __name__ == "__main__":
    build()
