from PIL import Image, ImageDraw, ImageFont

W, H = 2048, 2048
bg = (245, 239, 227)

canvas = Image.new("RGB", (W, H), bg)

logo = Image.open("public/logo.png").convert("RGBA")
logo_size = 520
logo.thumbnail((logo_size, logo_size))

x = (W - logo.width) // 2
y = 610
canvas.paste(logo, (x, y), logo)

draw = ImageDraw.Draw(canvas)

try:
    font_big = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 120)
    font_small = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 64)
except:
    font_big = ImageFont.load_default()
    font_small = ImageFont.load_default()

title = "DOKAN"
subtitle = "Trénerská zóna"

title_box = draw.textbbox((0, 0), title, font=font_big)
subtitle_box = draw.textbbox((0, 0), subtitle, font=font_small)

draw.text(
    ((W - (title_box[2] - title_box[0])) // 2, y + logo.height + 90),
    title,
    fill=(17, 17, 17),
    font=font_big,
)

draw.text(
    ((W - (subtitle_box[2] - subtitle_box[0])) // 2, y + logo.height + 230),
    subtitle,
    fill=(90, 90, 90),
    font=font_small,
)

canvas.save("resources/splash.png")
print("Hotovo: resources/splash.png")
