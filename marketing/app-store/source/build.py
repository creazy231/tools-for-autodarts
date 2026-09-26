"""Build the App Store screenshots from raw captures. See marketing/README.md.

    python3 build.py prepare <captures-dir> <work-dir>   captures → sRGB, one HTML page per screenshot
    node render.mjs <work-dir> <out-dir>                 pages → PNG at the App Store sizes
    python3 build.py finish <out-dir>                    optimise, tag sRGB, check size and alpha

Captures come straight from the yarn dev Chrome, which writes them in Display P3
with the profile embedded. They are converted here so that the headless
renderer, which works in sRGB, puts every colour back where the site had it.
"""
import html
import io
import json
import os
import shutil
import sys

from PIL import Image, ImageCms

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
SRGB = ImageCms.ImageCmsProfile(ImageCms.createProfile("sRGB"))

SIZES = {"iphone": (1320, 2868), "mac": (2880, 1800)}
LAYOUT = {
    # 6.9" iPhone: headline and subline, then the phone scaled to fill the rest.
    "iphone": dict(COPY_TOP=150, HEAD_SIZE=150, HEAD_MIN=112, SUB_SIZE=54, SUB_GAP=30, SUB_MAX=1100,
                   PHONE_TOP=560, S=0.752),
    # Mac: headline and subline, then a Safari window round a 1600 × 1000 @2x capture.
    "mac": dict(COPY_TOP=96, HEAD_SIZE=124, HEAD_MIN=100, SUB_SIZE=46, SUB_GAP=18, SUB_MAX=2200,
                WIN_TOP=350, K=0.6606),
}


def to_srgb(src, dst):
    image = Image.open(src)
    icc = image.info.get("icc_profile")
    rgb = image.convert("RGB")
    if icc:
        profile = ImageCms.ImageCmsProfile(io.BytesIO(icc))
        rgb = ImageCms.profileToProfile(rgb, profile, SRGB, renderingIntent=ImageCms.Intent.RELATIVE_COLORIMETRIC,
                                        outputMode="RGB")
    rgb.save(dst, icc_profile=SRGB.tobytes())
    return rgb


def mean(image, box):
    return image.crop(box).resize((1, 1), Image.BOX).getpixel((0, 0))[:3]


def css(rgb, factor=1.0):
    return "rgb({}, {}, {})".format(*(round(c * factor) for c in rgb))


def prepare(captures, work):
    img = os.path.join(work, "img")
    os.makedirs(img, exist_ok=True)
    shutil.copy(os.path.join(REPO, "public", "icon", "128.png"), os.path.join(img, "icon-128.png"))
    shots = json.load(open(os.path.join(HERE, "shots.json")))
    for platform, items in shots.items():
        template = open(os.path.join(HERE, f"template-{platform}.html")).read()
        width, height = SIZES[platform]
        for shot in items:
            page = to_srgb(os.path.join(captures, shot["capture"]), os.path.join(img, shot["capture"]))
            values = dict(LAYOUT[platform], W=width, H=height, TITLE=f"{platform} {shot['name']}",
                          IMG=f"img/{shot['capture']}", HEADLINE=html.escape(shot["headline"]),
                          SUB=html.escape(shot["sub"]))
            if platform == "iphone":
                # Safari tints the status bar with the top of the page, and the
                # page carries on, darkening, under its toolbar.
                w, h = page.size
                values["TOP"] = css(mean(page, (0, 0, w, 4)))
                bottom = mean(page, (0, h - 6, w, h))
                values["BOTTOM"] = css(bottom)
                values["BOTTOM_DARK"] = css(bottom, 0.45)
            out = template
            for key, value in values.items():
                out = out.replace("{{" + key + "}}", str(value))
            assert "{{" not in out, f"unfilled placeholder in {platform} {shot['name']}"
            with open(os.path.join(work, f"{platform}--{shot['name']}.html"), "w") as f:
                f.write(out)
            print(f"{platform}/{shot['name']}")


def finish(out):
    for platform, (width, height) in SIZES.items():
        folder = os.path.join(out, platform)
        for name in sorted(os.listdir(folder)):
            if not name.endswith(".png"):
                continue
            path = os.path.join(folder, name)
            image = Image.open(path)
            image.load()
            assert image.size == (width, height), f"{path}: {image.size}"
            image.convert("RGB").save(path, optimize=True, icc_profile=SRGB.tobytes())
            print(f"{platform}/{name} {width}x{height} RGB sRGB {os.path.getsize(path) / 1e6:.2f} MB")


if __name__ == "__main__":
    command, *args = sys.argv[1:]
    {"prepare": prepare, "finish": finish}[command](*args)
