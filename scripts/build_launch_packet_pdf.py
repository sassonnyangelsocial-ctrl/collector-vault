from pathlib import Path
import re
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Image, KeepTogether

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "pdf" / "collector-vault-complete-launch-packet.pdf"
PACKET = ROOT / "marketing" / "launch-2026-07-21"
ASSETS = ROOT / "marketing" / "assets"

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="CoverTitle", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=30, leading=34, textColor=colors.HexColor("#30262f"), alignment=TA_CENTER, spaceAfter=14))
styles.add(ParagraphStyle(name="CoverSub", parent=styles["Normal"], fontSize=13, leading=18, textColor=colors.HexColor("#bd3f65"), alignment=TA_CENTER))
styles.add(ParagraphStyle(name="H1x", parent=styles["Heading1"], fontName="Helvetica-Bold", fontSize=21, leading=25, textColor=colors.HexColor("#bd3f65"), spaceBefore=14, spaceAfter=8))
styles.add(ParagraphStyle(name="H2x", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=15, leading=19, textColor=colors.HexColor("#30262f"), spaceBefore=10, spaceAfter=5))
styles.add(ParagraphStyle(name="H3x", parent=styles["Heading3"], fontName="Helvetica-Bold", fontSize=12, leading=15, textColor=colors.HexColor("#71389a"), spaceBefore=8, spaceAfter=4))
styles.add(ParagraphStyle(name="Bodyx", parent=styles["BodyText"], fontName="Helvetica", fontSize=9.2, leading=13, textColor=colors.HexColor("#30262f"), spaceAfter=4))
styles.add(ParagraphStyle(name="Bulletx", parent=styles["BodyText"], fontName="Helvetica", fontSize=9, leading=12.5, leftIndent=14, firstLineIndent=-7, bulletIndent=5, spaceAfter=3))
styles.add(ParagraphStyle(name="Quotex", parent=styles["BodyText"], fontName="Helvetica-Oblique", fontSize=9, leading=13, leftIndent=14, rightIndent=10, textColor=colors.HexColor("#5f5058"), borderColor=colors.HexColor("#f26b8a"), borderWidth=1, borderPadding=7, spaceAfter=4))

def clean(text):
    swaps = {"—":"-", "–":"-", "’":"'", "“":"\"", "”":"\"", "•":"-", "→":"->", "⇄":"<->", "💗":"", "✨":"", "👇":""}
    for a,b in swaps.items(): text=text.replace(a,b)
    text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r"\1 (\2)", text)
    text = text.replace("**", "").replace("`", "")
    return text.encode("latin-1", "replace").decode("latin-1")

def markdown_story(path):
    story=[]; quote=[]
    for raw in path.read_text(encoding="utf-8").splitlines():
        line=raw.rstrip()
        if not line:
            if quote: story.append(Paragraph(clean(" ".join(quote)), styles["Quotex"])); quote=[]
            story.append(Spacer(1,3)); continue
        if line.startswith(">"):
            quote.append(line.lstrip("> ")); continue
        if quote: story.append(Paragraph(clean(" ".join(quote)), styles["Quotex"])); quote=[]
        if line.startswith("### "): story.append(Paragraph(clean(line[4:]),styles["H3x"]))
        elif line.startswith("## "): story.append(Paragraph(clean(line[3:]),styles["H2x"]))
        elif line.startswith("# "): story.append(Paragraph(clean(line[2:]),styles["H1x"]))
        elif re.match(r"^[-*] ",line): story.append(Paragraph(clean(line[2:]),styles["Bulletx"],bulletText="-"))
        elif re.match(r"^\d+\. ",line): story.append(Paragraph(clean(line),styles["Bulletx"]))
        else: story.append(Paragraph(clean(line),styles["Bodyx"]))
    if quote: story.append(Paragraph(clean(" ".join(quote)), styles["Quotex"]))
    return story

def footer(canvas, doc):
    canvas.saveState(); canvas.setFont("Helvetica",8); canvas.setFillColor(colors.HexColor("#887c84"))
    canvas.drawString(0.65*inch,0.4*inch,"Collector Vault - Complete Launch Packet")
    canvas.drawRightString(7.85*inch,0.4*inch,f"Page {doc.page}"); canvas.restoreState()

OUT.parent.mkdir(parents=True, exist_ok=True)
doc=SimpleDocTemplate(str(OUT),pagesize=letter,rightMargin=.65*inch,leftMargin=.65*inch,topMargin=.6*inch,bottomMargin=.62*inch,title="Collector Vault Complete Launch Packet")
story=[Spacer(1,.2*inch),Image(str(ASSETS/"collector-vault-launch-2026.png"),width=5.7*inch,height=5.7*inch),Spacer(1,.22*inch),Paragraph("COLLECTOR VAULT",styles["CoverTitle"]),Paragraph("Complete launch, outreach, content, and graphics packet",styles["CoverSub"]),Paragraph("Prepared July 21, 2026",styles["CoverSub"]),PageBreak()]
story += markdown_story(PACKET/"07-MASTER-LAUNCH-PACKET.md")
story += [PageBreak(),Image(str(ASSETS/"trade-chat-square.png"),width=4.8*inch,height=4.8*inch),Spacer(1,.15*inch),PageBreak()]
story += markdown_story(PACKET/"08-CONTACT-PLAYBOOK.md")
story += [PageBreak(),Image(str(ASSETS/"seller-pro-complete-square.png"),width=4.8*inch,height=4.8*inch),Spacer(1,.15*inch),PageBreak()]
story += markdown_story(PACKET/"09-GRAPHICS-AND-ASSET-GUIDE.md")
doc.build(story,onFirstPage=footer,onLaterPages=footer)
print(OUT)
