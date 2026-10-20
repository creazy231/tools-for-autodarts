"""Build the Discord pictures for 3.4's WLED changes. See marketing/README.md.

    python3 make.py prepare <work-dir>      LEDs from the packs' GIFs and the name, one HTML page per variant
    node ../render.mjs <work-dir> <out-dir> pages → 1920 × 1080 PNGs
    python3 make.py finish <out-dir>        optimise, tag sRGB, check size and alpha

Every plate is a 64 × 8 matrix. A pack's plate is one frame of its GIF in
public/wled-packs/gifs, composited by Pillow, which the settings' own GIF
decoder matches. The name is drawn the way WLED 16 draws it with the README's
`next_player` effect: Scrolling Text with `c2` 64 picks the font TinyUnicode
8px (font_TinyUnicode_8px.wbf beside this script, from wled00/src/font of WLED
v16.0.1), and a name that fits stands still, centred.
"""
import html
import importlib.util
import json
import os
import re
import sys

from PIL import Image, ImageSequence

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", "..", ".."))
GIFS = os.path.join(REPO, "public", "wled-packs", "gifs")
SIZE = (1920, 1080)
MATRIX = (64, 8)

# Loading the App Store build would leave a __pycache__ beside it, in the repo.
sys.dont_write_bytecode = True
_spec = importlib.util.spec_from_file_location("appstore_build", os.path.join(HERE, "..", "..", "..", "app-store", "source", "build.py"))
appstore = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(appstore)


def gif_frame(name, index):
    """The GIF's frame `index` as WLED's Image effect shows it, a row of RGB triples per LED row."""
    image = Image.open(os.path.join(GIFS, name))
    for i, frame in enumerate(ImageSequence.Iterator(image)):
        if i == index:
            rgb = frame.convert("RGB")
            assert rgb.size == MATRIX, f"{name}: {rgb.size}, not {MATRIX}"
            return [[list(rgb.getpixel((x, y))) for x in range(MATRIX[0])] for y in range(MATRIX[1])]
    raise IndexError(f"{name} has no frame {index}")


def wbf_glyphs(path):
    """A WLED Bitmap Font: {character: rows of 0/1}. Rows are packed top first, MSB first, one bitstream per glyph."""
    data = open(path, "rb").read()
    assert data[0] == ord("W"), "not a WLED bitmap font"
    height, max_width, flags, first, last = data[1], data[2], data[4], data[5], data[6]
    count = last - first + 1
    widths = list(data[12:12 + count]) if flags & 1 else [max_width] * count
    glyphs, at = {}, 12 + (count if flags & 1 else 0)
    for code, width in zip(range(first, last + 1), widths):
        size = (width * height + 7) // 8
        bits = "".join(f"{byte:08b}" for byte in data[at:at + size])
        glyphs[chr(code)] = [[int(bits[row * width + col]) for col in range(width)] for row in range(height)]
        at += size
    assert at == len(data), "the font's glyphs don't add up to its size"
    return glyphs, data[3]


def name_frame(text, rgb):
    """The name on the matrix: Scrolling Text centres a text that fits, `ix` 128 adds no Y offset."""
    glyphs, spacing = wbf_glyphs(os.path.join(HERE, "font_TinyUnicode_8px.wbf"))
    cols, rows = MATRIX
    width = sum(len(glyphs[c][0]) + spacing for c in text) - spacing
    assert width <= cols, f"{text!r} is {width} LEDs wide and would scroll"
    frame = [[[0, 0, 0] for _ in range(cols)] for _ in range(rows)]
    x = cols - (cols + width) // 2
    for c in text:
        glyph = glyphs[c]
        top = (rows - len(glyph)) // 2
        for y, line in enumerate(glyph):
            for dx, lit in enumerate(line):
                if lit:
                    frame[top + y][x + dx] = list(rgb)
        x += len(glyph[0]) + spacing
    return frame


def prepare(work):
    copy = json.load(open(os.path.join(HERE, "copy.json")))
    img = os.path.join(work, "img")
    os.makedirs(img, exist_ok=True)
    with open(os.path.join(REPO, "public", "icon", "128.png"), "rb") as src, open(os.path.join(img, "icon-128.png"), "wb") as dst:
        dst.write(src.read())

    plates = []
    for plate in copy["plates"]:
        leds = name_frame(plate["name"], plate["rgb"]) if "name" in plate else gif_frame(plate["gif"], plate["frame"])
        plates.append(dict(leds=leds, trigger=plate["trigger"], label=plate["label"]))

    template = open(os.path.join(HERE, "template.html")).read()
    for variant in copy["variants"]:
        values = dict(
            LANG=variant["lang"],
            TITLE=variant["name"],
            KICKER=html.escape(variant["kicker"]),
            HEADLINE="<br>".join(html.escape(line) for line in variant["headline"]),
            # A hyphenated word stays on one line: "LED-Matrix" broke after "LED-".
            SUB=re.sub(r"(\S+-\S+)", r'<span class="nowrap">\1</span>', html.escape(variant["sub"])),
            POINTS="".join(f"<li><i></i>{html.escape(point)}</li>" for point in variant["points"]),
            PLATFORMS=html.escape(copy["platforms"]),
            PLATES=json.dumps(plates, separators=(",", ":")).replace("</", "<\\/"),
        )
        out = template
        for key, value in values.items():
            out = out.replace("{{" + key + "}}", str(value))
        assert "{{" not in out, f"unfilled placeholder in {variant['name']}"
        with open(os.path.join(work, f"{variant['name']}.html"), "w") as f:
            f.write(out)
        print(variant["name"])


def finish(out):
    for name in sorted(os.listdir(out)):
        if not (name.startswith("wled-") and name.endswith(".png")):
            continue
        path = os.path.join(out, name)
        image = Image.open(path)
        image.load()
        assert image.size == SIZE, f"{path}: {image.size}"
        image.convert("RGB").save(path, optimize=True, icc_profile=appstore.SRGB.tobytes())
        print(f"{name} {SIZE[0]}x{SIZE[1]} RGB sRGB {os.path.getsize(path) / 1e6:.2f} MB")


if __name__ == "__main__":
    command, *args = sys.argv[1:]
    {"prepare": prepare, "finish": finish}[command](*args)
