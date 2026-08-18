import type { IConfig } from "@/utils/storage";

import { AutodartsToolsConfig } from "@/utils/storage";
import { SELECTORS, qs } from "@/utils/selectors";
import { waitForElement } from "@/utils";

/**
 * Board View — start every game showing what you actually want to see.
 *
 * The site has one button for this and it only cycles: camera 1, 2, 3, the
 * vector board, and round again. There is no way to ask for a particular view,
 * so this presses it until the one you asked for comes up.
 *
 * Reading the current view means reading the button's own label — the camera
 * number, or nothing at all for the vector board. It carries no aria-label,
 * title or data attribute, so there is nothing steadier to go on.
 */
const CLICK_DELAY = 500;

/**
 * Anything worth asking for. `live` is "whichever camera is nearest" — Darts
 * Zoom wants a camera without caring which, so that its close-ups come from the
 * same picture the board is showing.
 */
export type BoardView = "image" | "live" | "camera-1" | "camera-2" | "camera-3";

/** What the button says right now. Empty means the vector board. */
function currentView(): string | null {
  const button = qs<HTMLElement>(SELECTORS.match.cameraButton);
  return button ? (button.textContent ?? "").trim() : null;
}

function satisfies(view: string, target: BoardView): boolean {
  if (target === "image") return view === "";
  if (target === "live") return view !== "";
  return view === target.replace("camera-", "");
}

/**
 * Press until the board shows `target`, or until the cycle repeats itself.
 *
 * A board with one camera cannot show camera 3, and asking for it should stop
 * after one lap rather than press forever — so every view seen is remembered,
 * and arriving somewhere twice means the target is not on offer.
 */
export async function setBoardView(target: BoardView, timeout = 8000): Promise<boolean> {
  const button = await waitForElement(SELECTORS.match.cameraButton, timeout).catch(() => null);
  if (!button) {
    console.log("Autodarts Tools: Board View - no camera button on this screen");
    return false;
  }

  const seen = new Set<string>();
  for (let press = 0; press < 12; press++) {
    const view = currentView();
    if (view === null) return false;
    if (satisfies(view, target)) return true;
    if (seen.has(view)) break;

    seen.add(view);
    (button as HTMLElement).click();
    await new Promise(resolve => setTimeout(resolve, CLICK_DELAY));
  }

  console.log(`Autodarts Tools: Board View - "${target}" is not one of this board's views (saw ${[ ...seen ].map(v => v || "image").join(", ")})`);
  return false;
}

export async function boardView() {
  const config: IConfig = await AutodartsToolsConfig.getValue();
  const target = config.boardView.view;

  console.log(`Autodarts Tools: Board View - switching to ${target}`);
  await setBoardView(target);
}

export function boardViewOnRemove() {
  // Nothing to undo: this presses the site's own button and leaves the view
  // wherever the player takes it from there.
}
