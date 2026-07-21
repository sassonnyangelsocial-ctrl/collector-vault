from pathlib import Path
import shutil

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'marketing' / 'reel-actual-platform'
TARGET = ROOT / 'public' / 'product-tour'
TARGET.mkdir(parents=True, exist_ok=True)

screens = [
    '01-dashboard.png', '02-catalog-search.png', '03-trade-chat.png',
    '04-alerts.png', '06-purchase-orders.png', '07-whatnot-import.png',
    '08-giveaway-wheel.png',
]

for name in screens:
    image = Image.open(SOURCE / name).convert('RGB')
    draw = ImageDraw.Draw(image)
    # Account identifiers occupy the upper-right utility area.
    draw.rounded_rectangle((1450, 0, image.width, 145), radius=18, fill='#fffaf6')
    if name == '07-whatnot-import.png':
        # Imported sales tables can contain real buyer handles and order IDs.
        draw.rounded_rectangle((0, 650, image.width, image.height), radius=24, fill='#fffaf6')
    image.save(TARGET / name, optimize=True)

shutil.copy2(SOURCE / 'collector-vault-launch-demo-reel.mp4', TARGET / 'collector-vault-demo-reel.mp4')
shutil.copy2(SOURCE / 'collector-vault-launch-demo-cover.png', TARGET / 'demo-cover.png')
