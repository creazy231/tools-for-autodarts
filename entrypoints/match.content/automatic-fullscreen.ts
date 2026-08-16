import { SELECTORS, qs } from "@/utils/selectors";
import { waitForElement } from "@/utils";

/**
 * Automatic Fullscreen — a fullscreen toggle in the match header.
 *
 * v1 cloned the settings button out of the Chakra menu bar and spliced it into
 * a `ul` that the rebuilt header does not have. This builds its own button and
 * matches the header's other icon buttons instead.
 *
 * Entering automatically is attempted but not relied on: browsers only grant
 * fullscreen from a user gesture, and arriving at a match from the lobby's
 * Start Game click is usually far enough removed that the request is refused.
 * The button is always there as the fallback, which is what actually worked in
 * v1 too.
 */
const BUTTON_ID = "adt-fullscreen-toggle";

const ENTER_PATH = "M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z";
const EXIT_PATH = "M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z";

let onFullscreenChange: (() => void) | null = null;

export async function automaticFullscreen() {
  if (document.getElementById(BUTTON_ID)) return;
  console.log("Autodarts Tools: Setting up automatic fullscreen");

  const header = await waitForElement(SELECTORS.match.header, 15000).catch(() => null);
  if (!header) return console.error("Autodarts Tools: Automatic Fullscreen - no match header found");

  // The icon buttons live in the header's right-hand group; a sibling of the
  // existing ones inherits their hit area and spacing for free.
  const iconGroup = qs<HTMLElement>(SELECTORS.match.headerIconGroup, header) ?? header;
  const sibling = iconGroup.querySelector("button");

  const button = document.createElement("button");
  button.id = BUTTON_ID;
  button.type = "button";
  button.title = "Toggle fullscreen";
  button.setAttribute("aria-label", "Toggle fullscreen");
  button.className = sibling?.className ?? "";

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "20");
  svg.setAttribute("height", "20");
  svg.setAttribute("fill", "currentColor");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", ENTER_PATH);
  svg.appendChild(path);
  button.appendChild(svg);

  const syncIcon = () => path.setAttribute("d", document.fullscreenElement ? EXIT_PATH : ENTER_PATH);

  button.addEventListener("click", () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(console.error);
    else document.documentElement.requestFullscreen().catch(err => console.warn("Autodarts Tools: Automatic Fullscreen -", err.message));
  });

  onFullscreenChange = syncIcon;
  document.addEventListener("fullscreenchange", onFullscreenChange);

  iconGroup.insertBefore(button, iconGroup.firstChild);

  document.documentElement.requestFullscreen()
    .then(syncIcon)
    .catch(() => console.log("Autodarts Tools: Automatic Fullscreen - the browser wants a click first; use the header button"));
}

export async function automaticFullscreenOnRemove() {
  console.log("Autodarts Tools: Cleaning up automatic fullscreen");

  document.getElementById(BUTTON_ID)?.remove();
  if (onFullscreenChange) {
    document.removeEventListener("fullscreenchange", onFullscreenChange);
    onFullscreenChange = null;
  }

  if (document.fullscreenElement) {
    document.exitFullscreen().catch(err => console.error(`Error attempting to exit fullscreen mode: ${err.message}`));
  }
}
