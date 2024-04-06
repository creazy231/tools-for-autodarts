import { addStyles } from "@/utils";
import { AutodartsToolsConfig } from "@/utils/storage";

const canTrig = CSS.supports("(top: calc(sin(1) * 1px))");

function getSizes(size: number): { imgCircle: number; svgCircle: number; addVal: number } {
  switch (size) {
    case 1:
      return { imgCircle: 0.34, svgCircle: 0.43, addVal: -0.04 };
    case 2:
      return { imgCircle: 0.35, svgCircle: 0.44, addVal: 0 };
    case 3:
      return { imgCircle: 0.355, svgCircle: 0.45, addVal: 0.05 };
    case 4:
      return { imgCircle: 0.36, svgCircle: 0.4575, addVal: 0.065 };
    case 5:
      return { imgCircle: 0.365, svgCircle: 0.465, addVal: 0.085 };
    case 6:
      return { imgCircle: 0.37, svgCircle: 0.4725, addVal: 0.11 };
    case 7:
      return { imgCircle: 0.375, svgCircle: 0.48, addVal: 0.1375 };
    case 8:
      return { imgCircle: 0.38, svgCircle: 0.49, addVal: 0.165 };
    case 9:
      return { imgCircle: 0.385, svgCircle: 0.50, addVal: 0.195 };
    default:
      return { imgCircle: 0.345, svgCircle: 0.44, addVal: 0 };
  }
}

export async function liveViewRing() {
  if (!(document.getElementById("ad-ext-turn")?.nextElementSibling?.children[0]?.children[1]?.childElementCount === 2)) return;

  addStyles(`
          .ring {
            --inner-angle: calc((360 / var(--char-count)) * 1deg);
            --character-width: 1;
            font-size: calc(var(--font-size, 1) * 1rem);
            position: absolute;
            top: 50%;
            left: 50%;
            font-weight: 900;
        }
          .char {
            display: inline-block;
            position: absolute;
            top: 50%;
            left: 50%;
            /* line-height: 1; */
            transform:
            translate(-50%, -50%)
            rotate(calc(var(--inner-angle) * var(--char-index) - 2deg))
            translateY(var(--radius));
        }

        .ad-ext_boardview-container .ad-ext_boardview-numbers {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            display: none;
        }
        .ad-ext_boardview-container .ad-ext_boardview-numbers {
            display: block;
        }
        `);

  const config = await AutodartsToolsConfig.getValue();
  const ringSize = config.liveViewRing.size;
  const ringColorEnabled = config.liveViewRing.colorEnabled;
  const ringColor = config.liveViewRing.color;

  const ringHeadingEl = document.createElement("h1");
  ringHeadingEl.classList.add("ring");

  const boardViewContainer = document.getElementById("ad-ext-turn")?.nextElementSibling;
  if (!boardViewContainer) return;

  boardViewContainer.classList.add("ad-ext_boardview-container");
  const boardViewNumbersEl = document.createElement("div");
  boardViewNumbersEl.classList.add("ad-ext_boardview-numbers");
  boardViewContainer.children[0].appendChild(boardViewNumbersEl);

  const imageHolder = boardViewContainer.children[0].children[1].children[1];
  imageHolder.classList.add("ad-ext_boardview-image");

  const ringImage = imageHolder.querySelector("image");
  const ringSVG = imageHolder.querySelector("svg");

  const { imgCircle, svgCircle, addVal } = getSizes(ringSize);

  if (ringSVG) {
    ringSVG.style.background = ringColor;
    ringSVG.style.background = `radial-gradient(circle, #ffffff77 31%, ${ringColor} 58%)`;
    ringSVG.style.clipPath = `circle(${svgCircle * 100}%)`;
  }

  if (ringImage && ringColorEnabled) {
    ringImage.style.clipPath = `circle(${imgCircle * 100}%)`;
  }

  const ringOptions = {
    spacing: 1.4,
    text: "20  1  18  4  13  6  10  15  2  17  3  19  7  16  8  11  14  9  12  5  ",
  };

  const text = ringOptions.text;
  const chars = text.split("");
  ringHeadingEl.innerHTML = "";
  ringHeadingEl.style.setProperty("--char-count", chars.length.toString());

  for (let c = 0; c < chars.length; c++) {
    ringHeadingEl.innerHTML += `<span aria-hidden="true" class="char" style="--char-index: ${c};">${chars[c]}</span>`;
  }
  ringHeadingEl.style.setProperty("--character-width", ringOptions.spacing.toString());
  ringHeadingEl.style.setProperty("--radius", canTrig
    ? "calc((var(--character-width) / sin(var(--inner-angle))) * -1ch"
    : `calc(
              (${ringOptions.spacing} / ${Math.sin(360 / ringHeadingEl.children.length / (180 / Math.PI))})
              * -1ch
            )`);

  const minSize = Math.min(boardViewNumbersEl.offsetWidth, boardViewNumbersEl.offsetHeight);
  const newSize = (minSize * 3 / 1000 - (minSize / 3500) + addVal).toString();
  ringHeadingEl.style.setProperty("--font-size", newSize);

  document.documentElement.style.setProperty("--buffer",
    canTrig
      ? `calc((${ringOptions.spacing} / sin(${360 / ringHeadingEl.children.length}deg)) * ${newSize}rem)`
      : `calc((${ringOptions.spacing} / ${Math.sin(
                360 / ringHeadingEl.children.length / (180 / Math.PI))}) * ${newSize}rem)`);

  boardViewNumbersEl.appendChild(ringHeadingEl);
}
