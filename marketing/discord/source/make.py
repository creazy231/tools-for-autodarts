"""Build the Discord pictures for Teams. See marketing/README.md.

    python3 make.py prepare <work-dir>      captures → sRGB, the pill's callouts, one HTML page per variant
    node render.mjs <work-dir> <out-dir>    pages → 1920 × 1080 PNGs
    python3 make.py finish <out-dir>        optimise, tag sRGB, check size and alpha

The captures are one 1600 × 1000 @2x page from the yarn dev Chrome per language,
kept beside this script. The colour conversion is the App Store build's, so a
capture that embeds Display P3 is converted the same way, and an untagged one,
like these, is taken as the sRGB it is.
"""
import html
import importlib.util
import json
import os
import shutil
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
SIZE = (1920, 1080)

# Loading the App Store build would leave a __pycache__ beside it, in the repo.
sys.dont_write_bytecode = True
_spec = importlib.util.spec_from_file_location("appstore_build", os.path.join(HERE, "..", "..", "app-store", "source", "build.py"))
appstore = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(appstore)

# The window: a 3200 × 2104 Safari window (toolbar and @2x page) at this scale, from (742, 165).
WINDOW = dict(left=742, top=165, scale=0.35625)
# The callout shows the @2x pixels at this scale: the pill's row at 1.5× its size on the page.
CALLOUT_SCALE = 0.75


def prepare(work):
    copy = json.load(open(os.path.join(HERE, "copy.json")))
    img = os.path.join(work, "img")
    os.makedirs(img, exist_ok=True)
    shutil.copy(os.path.join(REPO, "public", "icon", "128.png"), os.path.join(img, "icon-128.png"))

    # One capture per language, the site and the pill in it; the callout is its
    # pill row, from TEAM RED's legs to TEAM BLUE's.
    layouts = {}
    window_width = 3200 * WINDOW["scale"]
    for lang, capture in copy["captures"].items():
        page = appstore.to_srgb(os.path.join(HERE, capture["file"]), os.path.join(img, capture["file"]))
        left, top, right, bottom = capture["callout"]
        page.crop((left, top, right, bottom)).save(os.path.join(img, f"callout-{lang}.png"), icc_profile=appstore.SRGB.tobytes())
        width, height = round((right - left) * CALLOUT_SCALE), round((bottom - top) * CALLOUT_SCALE)
        layouts[lang] = dict(
            CAPTURE=capture["file"], CALLOUT=f"callout-{lang}.png", CALLOUT_W=width, CALLOUT_H=height,
            # Centred on the window, over the site's action bar (Undo, Next), which it hides.
            CALLOUT_LEFT=round(WINDOW["left"] + window_width / 2 - width / 2),
            CALLOUT_TOP=round(WINDOW["top"] + (104 + sum(copy["actionBar"]) / 2) * WINDOW["scale"] - height / 2),
        )

    template = open(os.path.join(HERE, "template.html")).read()
    for variant in copy["variants"]:
        values = dict(
            layouts[variant["lang"]],
            LANG=variant["lang"],
            TITLE=variant["name"],
            KICKER=html.escape(variant["kicker"]),
            HEADLINE="<br>".join(html.escape(line) for line in variant["headline"]),
            SUB=html.escape(variant["sub"]),
            POINTS="".join(f"<li><i></i>{html.escape(point)}</li>" for point in variant["points"]),
            PLATFORMS=html.escape(copy["platforms"]),
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
        if not (name.startswith("teams-") and name.endswith(".png")):
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
