import { waitForElement } from "@/utils";
import { AutodartsToolsGameData } from "@/utils/game-data-storage";

export async function automaticFullscreen() {
  console.log("Autodarts Tools: Setting up automatic fullscreen");

  await waitForElement("#ad-ext-player-display");
  const gameData = await AutodartsToolsGameData.getValue();

  let isFullscreen: boolean = false;

  const menuBar = await waitForElement([
    "#root > div > div:nth-of-type(2) > div .chakra-wrap",
    "#root > div > div:nth-of-type(2) > div > div > div",
  ]);
  if (!menuBar) return console.error("Autodarts Tools: No menu bar found");

  const settingsBtn = document.querySelector("#ad-ext-game-variant");

  let fullscreenBtn: HTMLButtonElement;
  let fullscreenBtnSVG: SVGElement;

  if (!document.querySelector("#adt-fullscreen-toggle")) {
    fullscreenBtn = document.createElement("button");
    fullscreenBtn.id = "adt-fullscreen-toggle";
    fullscreenBtn.className = settingsBtn?.className || "";

    fullscreenBtnSVG = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    fullscreenBtnSVG.setAttribute("viewBox", "0 0 24 24");
    fullscreenBtnSVG.style.height = "1.2em";
    fullscreenBtnSVG.style.width = "1.2em";
    fullscreenBtnSVG.style.fill = "var(--tag-color)";
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z");
    fullscreenBtnSVG.appendChild(path);

    fullscreenBtn.appendChild(fullscreenBtnSVG);
  } else {
    fullscreenBtn = document.querySelector(
      "#adt-fullscreen-toggle",
    ) as HTMLButtonElement;
    fullscreenBtnSVG = fullscreenBtn.querySelector("svg") as SVGElement;
  }

  const menuBarUL
    = gameData.match?.variant === "Bull-off"
      ? document
        .querySelector("#ad-ext-game-variant")
        ?.parentElement?.parentElement?.querySelector("div:last-of-type")
        || menuBar.querySelector("div:nth-of-type(3) > div")
      : menuBar.querySelector("ul");
  if (!menuBarUL) return console.error("Autodarts Tools: No menu bar ul found");
  console.log(menuBarUL);
  console.log(menuBarUL.firstChild);

  if (gameData.match?.variant === "Bull-off") {
    (menuBarUL.firstChild as Element)?.prepend(fullscreenBtn);
  } else {
    menuBarUL.insertBefore(
      fullscreenBtn,
      menuBarUL.children[menuBarUL.children.length - 1],
    );
  }

  // Toggle fullscreen function
  const toggleFullscreen = (forceState?: boolean) => {
    const shouldEnterFullscreen
      = forceState !== undefined ? forceState : !document.fullscreenElement;

    if (shouldEnterFullscreen && !document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(
          `Error attempting to enable fullscreen mode: ${err.message}`,
        );
      });
      // Update SVG to show exit fullscreen icon
      fullscreenBtnSVG.children[0].setAttribute(
        "d",
        "M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z",
      );
      isFullscreen = true;
    } else if (!shouldEnterFullscreen && document.fullscreenElement) {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      // Update SVG to show enter fullscreen icon
      fullscreenBtnSVG.children[0].setAttribute(
        "d",
        "M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z",
      );
      isFullscreen = false;
    }
  };

  fullscreenBtn.addEventListener("click", () => toggleFullscreen());

  // Listen for fullscreen change event to update button icon
  document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement) {
      // Update SVG to show enter fullscreen icon when exiting fullscreen
      fullscreenBtnSVG.children[0].setAttribute(
        "d",
        "M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z",
      );
      isFullscreen = false;
    } else {
      // Update SVG to show exit fullscreen icon when entering fullscreen
      fullscreenBtnSVG.children[0].setAttribute(
        "d",
        "M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z",
      );
      isFullscreen = true;
    }
  });

  // Initial fullscreen activation when the feature is enabled
  toggleFullscreen(true);
}

export async function automaticFullscreenOnRemove() {
  console.log("Autodarts Tools: Cleaning up automatic fullscreen");

  const fullscreenBtn = document.querySelector("#adt-fullscreen-toggle");
  fullscreenBtn?.remove();

  // Exit fullscreen mode if active
  if (document.fullscreenElement) {
    document.exitFullscreen().catch((err) => {
      console.error(`Error attempting to exit fullscreen mode: ${err.message}`);
    });
  }
}
