from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / ".reel-tools"))

from PIL import Image, ImageDraw, ImageFilter, ImageFont
import imageio_ffmpeg

TOUR = ROOT / "public" / "product-tour"
OUT = ROOT / "marketing" / "output" / "free-launch-2026-08-07"
OUT.mkdir(parents=True, exist_ok=True)

W, H, FPS, SCENE_SECONDS = 1080, 1920, 24, 2.7
DEEP = "#352630"
PINK = "#ef6485"
CREAM = "#fff8f6"


def font(size, bold=False):
    name = "segoeuib.ttf" if bold else "segoeui.ttf"
    return ImageFont.truetype(str(Path("C:/Windows/Fonts") / name), size)


def wrap(draw, text, fnt, width):
    lines, line = [], ""
    for word in text.split():
        candidate = f"{line} {word}".strip()
        if draw.textbbox((0, 0), candidate, font=fnt)[2] <= width:
            line = candidate
        else:
            if line:
                lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines


def centered(draw, text, y, fnt, fill, max_width=900, gap=14):
    for line in wrap(draw, text, fnt, max_width):
        draw.text((W // 2, y), line, font=fnt, fill=fill, anchor="ma")
        y += fnt.size + gap
    return y


def gradient(top, bottom):
    img = Image.new("RGB", (W, H), top)
    px = img.load()
    a = tuple(int(top[i:i+2], 16) for i in (1, 3, 5))
    b = tuple(int(bottom[i:i+2], 16) for i in (1, 3, 5))
    for y in range(H):
        t = y / (H - 1)
        color = tuple(int(a[i] * (1 - t) + b[i] * t) for i in range(3))
        for x in range(W):
            px[x, y] = color
    return img


def base(theme):
    image = gradient(theme[0], theme[1])
    draw = ImageDraw.Draw(image)
    draw.ellipse((-140, -120, 430, 450), fill=theme[2])
    draw.ellipse((770, 1480, 1320, 2030), fill=theme[3])
    draw.rounded_rectangle((64, 64, 1016, 142), 39, fill="#ffffffd9")
    draw.text((W // 2, 103), "COLLECTOR VAULT", font=font(30, True), fill=PINK, anchor="mm")
    return image, draw


def screenshot_card(image, filename, y=745):
    source = Image.open(TOUR / filename).convert("RGB")
    source.thumbnail((876, 740), Image.Resampling.LANCZOS)
    card = Image.new("RGBA", (940, 800), (255, 255, 255, 255))
    card.paste(source, ((940 - source.width) // 2, (800 - source.height) // 2))
    card = card.filter(ImageFilter.GaussianBlur(0.01))
    shadow = Image.new("RGBA", (980, 840), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((20, 20, 960, 820), 44, fill=(53, 38, 48, 55))
    shadow = shadow.filter(ImageFilter.GaussianBlur(18))
    image.paste(shadow, (50, y - 20), shadow)
    image.paste(card, (70, y))


def make_scene(reel, index, title, subtitle, theme, screenshot=None, badge=None, bullets=None):
    image, draw = base(theme)
    if badge:
        draw.rounded_rectangle((310, 205, 770, 275), 35, fill=theme[4])
        draw.text((540, 240), badge, font=font(27, True), fill=DEEP, anchor="mm")
    y = centered(draw, title, 350 if badge else 245, font(74, True), DEEP, 920, 7)
    y = centered(draw, subtitle, y + 30, font(34), "#6f5965", 880, 8)
    if screenshot:
        screenshot_card(image, screenshot, max(720, y + 55))
    if bullets:
        by = max(770, y + 70)
        for text in bullets:
            draw.rounded_rectangle((94, by, 986, by + 132), 35, fill="#ffffffdd", outline=theme[4], width=3)
            draw.ellipse((125, by + 42, 173, by + 90), fill=PINK)
            draw.text((149, by + 66), "✓", font=font(26, True), fill="white", anchor="mm")
            draw.text((205, by + 66), text, font=font(29, True), fill=DEEP, anchor="lm")
            by += 156
    draw.text((540, 1810), "collector-vault-one.vercel.app", font=font(29, True), fill=DEEP, anchor="mm")
    draw.text((540, 1862), "Independent collector platform", font=font(20), fill="#806d77", anchor="mm")
    draw.text((W // 2, 103), "COLLECTOR VAULT", font=font(30, True), fill=PINK, anchor="mm")
    path = OUT / f"reel-{reel:02d}-scene-{index:02d}.png"
    image.save(path, quality=95)
    return path


REELS = [
    {
        "name": "free-vault-launch",
        "theme": ("#fff8f6", "#ffe1e9", "#ffd0dc", "#f8b9c9", "#ffd0dc"),
        "scenes": [
            ("Your collector era just got easier.", "Collector Vault is now FREE for every collector.", None, "FREE LAUNCH", None),
            ("No card. No countdown.", "Start organizing the moment you sign up.", "01-dashboard.png", None, None),
            ("Track the whole collection.", "Owned, missing, quantities, duplicates, favorites, wishlist, ISO, DISO, and trades.", "02-catalog-search.png", None, None),
            ("Build your free vault today.", "Save this. Share this. Invite your collector bestie.", None, "START FOR $0", ["3,400+ catalog entries", "Free essential tracking", "Optional Pro power tools"]),
        ],
    },
    {
        "name": "collector-bestie-pov",
        "theme": ("#f4eeff", "#ffddea", "#e7d8ff", "#ffc5d8", "#e8d8ff"),
        "scenes": [
            ("POV: your collector bestie sends you this.", "The spreadsheet era is officially over.", None, "SEND THIS", None),
            ("One searchable vault.", "Find figures across Sonny Angel, SMISKI, POP MART, and more.", "02-catalog-search.png", None, None),
            ("Know exactly what you need.", "Missing, ISO, DISO, wishlist, trades, and duplicates stay organized.", "01-dashboard.png", None, None),
            ("Bestie, it is free right now.", "Create an account with no card required.", None, "RUN, DON'T WALK", ["Track from any device", "Share social-ready lists", "Export your own data"]),
        ],
    },
    {
        "name": "free-vs-pro",
        "theme": ("#f0fbff", "#e2edff", "#d5f2ff", "#cadcff", "#cfeafa"),
        "scenes": [
            ("Free basics. Pro superpowers.", "Choose what fits your collector life.", None, "NEW TIERS", None),
            ("FREE forever", "Catalog, tracking, quantities, duplicates, missing, wishlist, ISO, DISO, trades, sharing, and exports.", "01-dashboard.png", None, None),
            ("Go Pro when you want more.", "Trade Match + chat, verified alerts, Live Wheel hosting, Seller Pro, and Whatnot import.", "03-trade-chat.png", None, None),
            ("Start at $0.", "Upgrade only when the premium tools earn their place in your routine.", None, "NO CARD REQUIRED", ["Free plan stays free", "$4.99 monthly Pro", "$49.99 yearly Pro"]),
        ],
    },
    {
        "name": "live-wheel-host",
        "theme": ("#effff7", "#dcf7e8", "#cbf1dc", "#bce7d1", "#c9f1db"),
        "scenes": [
            ("Want to go live without 1,000 followers?", "Collector Vault gives hosts a shareable live wheel room.", None, "HOST HACK", None),
            ("Your viewers see it all live.", "Wheel, participants, shuffle, spins, eliminations, chat, and the host stream.", "08-giveaway-wheel.png", None, None),
            ("Guests can watch free.", "Anyone with the room link can join without buying a membership.", "08-giveaway-wheel.png", None, None),
            ("Host with Collector Vault Pro.", "Build your collection free—upgrade when you are ready to run the show.", None, "GO LIVE YOUR WAY", ["Host-only wheel controls", "Viewer chat", "Optional audio or video"]),
        ],
    },
    {
        "name": "seller-glow-up",
        "theme": ("#fff9e9", "#ffe4ed", "#fff0b8", "#ffc8d8", "#ffe7a6"),
        "scenes": [
            ("Collector to seller glow-up.", "One platform can organize both sides of your hobby.", None, "BOSS MODE", None),
            ("Collect for free.", "Track figures, missing pieces, duplicates, wishlists, and trades.", "01-dashboard.png", None, None),
            ("Run the business with Pro.", "Suppliers, purchase orders, inventory, costs, fees, expenses, and profit.", "06-purchase-orders.png", None, None),
            ("Your vault can grow with you.", "Start free today and unlock Seller Pro only when you need it.", None, "START SMALL. GROW SMART.", ["Free collector workspace", "Optional seller tools", "Whatnot CSV import"]),
        ],
    },
]


def render_video(reel_index, scene_paths, name):
    output = OUT / f"collector-vault-{name}-reel.mp4"
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    command = [ffmpeg, "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(output)]
    process = subprocess.Popen(command, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    frames_per_scene = int(FPS * SCENE_SECONDS)
    for path in scene_paths:
        scene = Image.open(path).convert("RGB")
        for frame_index in range(frames_per_scene):
            progress = frame_index / max(frames_per_scene - 1, 1)
            scale = 1 + 0.018 * progress
            resized = scene.resize((int(W * scale), int(H * scale)), Image.Resampling.LANCZOS)
            left = (resized.width - W) // 2
            top = (resized.height - H) // 2
            process.stdin.write(resized.crop((left, top, left + W, top + H)).tobytes())
    process.stdin.close()
    if process.wait() != 0:
        raise SystemExit(f"Video rendering failed for {name}")
    cover = Image.open(scene_paths[0]).convert("RGB")
    cover.save(OUT / f"collector-vault-{name}-cover.png", quality=95)
    return output


def main():
    outputs = []
    for reel_index, reel in enumerate(REELS, 1):
        paths = []
        for scene_index, (title, subtitle, screenshot, badge, bullets) in enumerate(reel["scenes"], 1):
            paths.append(make_scene(reel_index, scene_index, title, subtitle, reel["theme"], screenshot, badge, bullets))
        outputs.append(render_video(reel_index, paths, reel["name"]))
    print("\n".join(str(path) for path in outputs))


if __name__ == "__main__":
    main()
