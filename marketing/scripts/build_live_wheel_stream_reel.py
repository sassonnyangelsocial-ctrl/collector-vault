from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / ".reel-tools"))

from PIL import Image, ImageDraw, ImageFilter, ImageFont
import imageio_ffmpeg

OUT = ROOT / "marketing" / "output" / "live-wheel-demo-2026-08-18"
OUT.mkdir(parents=True, exist_ok=True)
BACKGROUND = OUT / "live-wheel-glow-background.png"
SCREEN = ROOT / "public" / "product-tour" / "08-giveaway-wheel.png"
W, H, FPS, SECONDS = 1080, 1920, 24, 2.8
PLUM, PINK, CREAM, MUTED = "#30202a", "#f26b8a", "#fff8f6", "#8d7882"


def font(size, bold=False):
    name = "segoeuib.ttf" if bold else "segoeui.ttf"
    return ImageFont.truetype(str(Path("C:/Windows/Fonts") / name), size)


def centered(draw, text, y, size, fill=CREAM, max_width=900, bold=True):
    current, lines = "", []
    for word in text.split():
        candidate = f"{current} {word}".strip()
        if draw.textbbox((0, 0), candidate, font=font(size, bold))[2] <= max_width:
            current = candidate
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)
    for line in lines:
        draw.text((W // 2, y), line, font=font(size, bold), fill=fill, anchor="ma")
        y += size + 10
    return y


def live_pill(draw, label="LIVE WHEEL DEMO"):
    draw.rounded_rectangle((64, 62, 388, 128), 33, fill="#ffe8ef")
    draw.ellipse((91, 85, 111, 105), fill="#ec496e")
    draw.text((132, 95), label, font=font(22, True), fill="#b6385c", anchor="lm")


def app_card(canvas, crop_top, crop_bottom, zoom=1.0):
    source = Image.open(SCREEN).convert("RGB")
    source = source.crop((300, crop_top, 1600, crop_bottom))
    source = source.resize((int(930 * zoom), int(source.height * (930 * zoom / source.width))), Image.Resampling.LANCZOS)
    card = Image.new("RGBA", (960, min(980, source.height + 30)), "#fffaf8")
    if source.height > card.height - 30:
        source = source.crop((0, 0, source.width, card.height - 30))
    card.paste(source, ((card.width - source.width) // 2, 15))
    shadow = Image.new("RGBA", (1000, card.height + 40), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle((22, 22, 978, card.height + 18), 38, fill=(11, 5, 10, 130))
    shadow = shadow.filter(ImageFilter.GaussianBlur(18))
    canvas.paste(shadow, (40, 730), shadow)
    canvas.paste(card, (60, 750), card)


def scene(index):
    base = Image.open(BACKGROUND).convert("RGB").resize((W, H), Image.Resampling.LANCZOS)
    shade = Image.new("RGBA", (W, H), (25, 8, 18, 74))
    base = Image.alpha_composite(base.convert("RGBA"), shade)
    draw = ImageDraw.Draw(base)
    live_pill(draw)
    draw.text((1010, 96), "COLLECTOR VAULT", font=font(22, True), fill=CREAM, anchor="rm")

    if index == 1:
        centered(draw, "The Live Wheel is open.", 335, 76)
        centered(draw, "Run a synchronized free-entry draw from one shareable room.", 535, 34, "#f5dbe3", 840, False)
        draw.ellipse((315, 780, 765, 1230), fill="#ffffff18", outline="#ffd3e180", width=3)
        draw.arc((345, 810, 735, 1200), 15, 270, fill="#ffc35b", width=34)
        draw.polygon([(540, 756), (506, 820), (574, 820)], fill=CREAM)
        centered(draw, "HOST • SHARE • SPIN", 1350, 31, "#ffd5e0", 800)
        centered(draw, "Live Wheel is part of Seller Pro.", 1735, 30, CREAM, 850, False)
    elif index == 2:
        centered(draw, "Your host view, in the real app.", 260, 62)
        centered(draw, "Set the draw up, manage entries, and run the wheel from one workspace.", 450, 31, "#f5dbe3", 850, False)
        app_card(base, 80, 900, 1.0)
        draw.rounded_rectangle((90, 1625, 990, 1750), 28, fill="#fff8f6e8")
        draw.text((140, 1670), "Actual Collector Vault Live Wheel screen", font=font(27, True), fill=PLUM, anchor="lm")
        draw.text((140, 1711), "Demo data shown for illustration", font=font(22), fill=MUTED, anchor="lm")
    elif index == 3:
        centered(draw, "One room. Same spin.", 260, 70)
        centered(draw, "Share the room link so viewers can follow the draw together.", 455, 32, "#f5dbe3", 840, False)
        app_card(base, 510, 900, 1.28)
        draw.rounded_rectangle((94, 1540, 986, 1712), 32, fill="#ffffffdf")
        draw.text((140, 1590), "Viewer room", font=font(25, True), fill="#b6385c", anchor="lm")
        draw.text((140, 1633), "Watch the wheel, follow the spin, and chat in real time.", font=font(27, True), fill=PLUM, anchor="lm")
    else:
        centered(draw, "Make your next live moment feel organized.", 320, 66)
        centered(draw, "Set up the room. Share the link. Run the Live Wheel.", 535, 34, "#f5dbe3", 850, False)
        draw.rounded_rectangle((114, 900, 966, 1110), 42, fill="#fff8f6e8")
        draw.text((540, 968), "Collector Vault", font=font(39, True), fill=PLUM, anchor="mm")
        draw.text((540, 1024), "Live Wheel • Seller Pro", font=font(28, True), fill="#b6385c", anchor="mm")
        centered(draw, "collector-vault-one.vercel.app", 1690, 28, CREAM, 900, True)
        centered(draw, "For free-entry draws only. Follow applicable rules.", 1750, 23, "#f5dbe3", 900, False)
    path = OUT / f"scene-{index:02d}.png"
    base.convert("RGB").save(path, quality=95)
    return path


def render(paths):
    output = OUT / "collector-vault-live-wheel-demo-reel.mp4"
    command = [imageio_ffmpeg.get_ffmpeg_exe(), "-y"]
    for path in paths:
        command.extend(["-loop", "1", "-t", str(SECONDS), "-i", str(path)])
    prepared = ";".join(f"[{index}:v]scale={W}:{H},setsar=1[v{index}]" for index in range(len(paths)))
    joined = "".join(f"[v{index}]" for index in range(len(paths)))
    command.extend(["-filter_complex", f"{prepared};{joined}concat=n={len(paths)}:v=1:a=0[outv]", "-map", "[outv]", "-r", str(FPS), "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(output)])
    result = subprocess.run(command, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    if result.returncode != 0:
        raise SystemExit(result.stderr.decode("utf-8", errors="replace"))
    Image.open(paths[0]).convert("RGB").save(OUT / "collector-vault-live-wheel-demo-cover.png", quality=95)
    return output


if __name__ == "__main__":
    print(render([scene(index) for index in range(1, 5)]))
