#!/usr/bin/env python3
"""Draw callouts on a screenshot so an issue's picture makes its own point.

    annotate.py spec.json

Each mark gets a numbered badge on the image and a matching line in a legend
strip drawn underneath it. Text never sits on top of the screenshot, so a
callout can be as long as it needs to be and nothing collides.

Coordinates are given in a reference space (`ref_width`, default 1100), so you
can read them straight off a downscaled preview and let this script scale them
up to the real pixels.

  {
    "src_dir": "src", "out_dir": "out", "ref_width": 1100, "out_width": 1500,
    "images": [{
      "src": "attendees-table.png",
      "out": "22-attendees-columns.png",
      "crop": [x0, y0, x1, y1],                     # optional, reference space
      "marks": [
        {"box": [x, y, w, h], "text": "Header is a UUID", "color": "red"},
        {"arrow": [x1, y1, x2, y2], "text": "...", "color": "blue"},
        {"point": [x, y], "text": "...", "color": "amber"}
      ]
    }]
  }

Colours carry meaning, so use them consistently:
  red    the defect itself
  amber  a knock-on effect, or something to watch
  blue   context, or what should happen instead
Marks are numbered 1..n in the order you list them, so list them in the order
you want someone to read them.
"""
import json, math, os, sys
from PIL import Image, ImageDraw, ImageFont

PALETTE = {
    "red":   (220, 38, 38),
    "amber": (194, 101, 0),
    "blue":  (37, 99, 235),
    "green": (22, 163, 74),
}
INK = (31, 35, 40)
PAPER = (255, 255, 255)
RULE = (216, 222, 228)
FONT_DIR = "/System/Library/Fonts/Supplemental"


def font(size, bold=False):
    for name in (("Arial Bold.ttf",) if bold else ("Arial.ttf",)):
        try:
            return ImageFont.truetype(os.path.join(FONT_DIR, name), size)
        except OSError:
            pass
    return ImageFont.load_default()


def badge(draw, cx, cy, n, color, r):
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color, outline=PAPER,
                 width=max(2, r // 7))
    draw.text((cx, cy + 1), str(n), font=font(int(r * 1.25), True),
              fill=PAPER, anchor="mm")


def arrow(draw, p1, p2, color, width):
    draw.line([p1, p2], fill=color, width=width)
    ang = math.atan2(p2[1] - p1[1], p2[0] - p1[0])
    size = width * 4.5
    for s in (2.5, -2.5):
        draw.line([p2, (p2[0] + size * math.cos(ang + s),
                        p2[1] + size * math.sin(ang + s))], fill=color, width=width)


def wrap(draw, text, f, max_w):
    words, lines, cur = text.split(), [], ""
    for w in words:
        trial = f"{cur} {w}".strip()
        if draw.textlength(trial, font=f) <= max_w or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def legend(im, marks, scale):
    """Draw a legend strip under `im` and return the combined image."""
    if not marks:
        return im
    pad = int(18 * scale)
    r = int(13 * scale)
    f = font(int(18 * scale))
    tmp = ImageDraw.Draw(im)
    text_x = pad + r * 2 + int(10 * scale)
    max_w = im.width - text_x - pad

    blocks, height = [], pad
    for m in marks:
        lines = wrap(tmp, m.get("text", ""), f, max_w)
        lh = int(f.size * 1.35)
        blocks.append((lines, lh))
        height += max(len(lines) * lh, r * 2) + int(9 * scale)
    height += pad - int(9 * scale)

    out = Image.new("RGB", (im.width, im.height + height), PAPER)
    out.paste(im, (0, 0))
    d = ImageDraw.Draw(out)
    d.line([(0, im.height), (out.width, im.height)], fill=RULE, width=max(1, int(scale)))

    y = im.height + pad
    for i, ((lines, lh), m) in enumerate(zip(blocks, marks), 1):
        color = PALETTE[m.get("color", "red")]
        badge(d, pad + r, y + lh // 2, i, color, r)
        for j, line in enumerate(lines):
            d.text((text_x, y + j * lh + lh // 2), line, font=f, fill=INK, anchor="lm")
        y += max(len(lines) * lh, r * 2) + int(9 * scale)
    return out


def run(spec, base):
    src_dir = os.path.join(base, spec.get("src_dir", "src"))
    out_dir = os.path.join(base, spec.get("out_dir", "out"))
    os.makedirs(out_dir, exist_ok=True)
    ref_w = spec.get("ref_width", 1100)
    target = spec.get("out_width", 1500)

    for img in spec["images"]:
        im = Image.open(os.path.join(src_dir, img["src"])).convert("RGB")
        k = im.width / ref_w
        S = lambda v: v * k

        ox = oy = 0
        if "crop" in img:
            x0, y0, x1, y1 = [S(v) for v in img["crop"]]
            im = im.crop((int(x0), int(y0), int(x1), int(y1)))
            ox, oy = x0, y0

        # Work at output scale from here, so line weights and badges are crisp.
        if im.width != target:
            f = target / im.width
            im = im.resize((target, int(im.height * f)), Image.LANCZOS)
            k, ox, oy = k * f, ox * f, oy * f
            S = lambda v: v * k

        draw = ImageDraw.Draw(im)
        scale = target / 1500          # badge/legend sizing, independent of ref space
        lw = max(3, int(3.2 * scale))
        r = int(15 * scale)
        marks = img.get("marks", [])

        for i, m in enumerate(marks, 1):
            color = PALETTE[m.get("color", "red")]
            if "arrow" in m:
                x1, y1, x2, y2 = [S(v) for v in m["arrow"]]
                p1, p2 = (x1 - ox, y1 - oy), (x2 - ox, y2 - oy)
                arrow(draw, p1, p2, color, lw)
                bx, by = p1
            elif "point" in m:
                x, y = [S(v) for v in m["point"]]
                bx, by = x - ox, y - oy
                draw.ellipse([bx - r * 1.9, by - r * 1.9, bx + r * 1.9, by + r * 1.9],
                             outline=color, width=lw)
            else:
                x, y, w, h = [S(v) for v in m["box"]]
                x, y = x - ox, y - oy
                draw.rounded_rectangle([x, y, x + w, y + h], radius=int(7 * scale),
                                       outline=color, width=lw)
                bx, by = x, y
            # Keep the badge on the canvas whatever the mark sits against.
            bx = min(max(bx, r + 2), im.width - r - 2)
            by = min(max(by, r + 2), im.height - r - 2)
            badge(draw, bx, by, i, color, r)

        im = legend(im, marks, scale)
        out = os.path.join(out_dir, img["out"])
        im.save(out, optimize=True)
        print(f"{img['out']}  {im.size[0]}x{im.size[1]}  {os.path.getsize(out)//1024}KB")


if __name__ == "__main__":
    path = sys.argv[1]
    with open(path) as f:
        spec = json.load(f)
    run(spec, spec.get("base") or os.path.dirname(os.path.abspath(path)))
