import type { IConfig } from "@/utils/storage";
import type { IGameData } from "@/utils/game-data-storage";

import { AutodartsToolsConfig } from "@/utils/storage";
import { AutodartsToolsGameData } from "@/utils/game-data-storage";
import { SELECTORS, qs } from "@/utils/selectors";

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
 *
 * Two things about that button, read off the site's own code, decide the shape
 * of everything below:
 *
 * - It is **disabled whenever the player at the oche has no board** — a bot, or
 *   a seat scored by hand — and while disabled its label is blank, exactly as it
 *   is for the vector board. A press then does nothing. Reading that blank as
 *   "the drawn board is already up" and stopping is how a match that opened on
 *   the bot's turn came up on camera 1 the moment the player's own turn came.
 * - The choice is **state the board component holds, keyed by board id**. Every
 *   board it has not seen starts on camera 1, and the lot is forgotten whenever
 *   the component is rebuilt — the screen rebuilt after the bull-off, a change
 *   of layout. So one press at the start of the match is not enough: the view
 *   goes back to a camera on its own, and this has to notice and press again.
 *
 * What it must not do is fight the player. A real click on the button — or the
 * site's own `1` / `2` / `3` shortcuts — means they want something else for
 * now, and the view is theirs until the next leg begins.
 */
const CLICK_DELAY = 500;
/** How long one attempt waits for a button that can be pressed. */
const PRESSABLE_TIMEOUT = 8000;
const POLL_INTERVAL = 250;
/** How long the screen gets to finish redrawing before the button is looked at. */
const SETTLE_DELAY = 150;

/**
 * Anything worth asking for. `live` is "whichever camera is nearest" — Streaming
 * Mode wants a camera without caring which, so that its board shows a picture
 * rather than the drawing. Darts Zoom used to ask for the same; it names a
 * camera now, the way Board View does.
 */
export type BoardView = "image" | "live" | "camera-1" | "camera-2" | "camera-3";

function cameraButton(): HTMLButtonElement | null {
  return qs<HTMLButtonElement>(SELECTORS.match.cameraButton);
}

/** What the button says right now. Empty means the vector board — or a button that cannot be pressed. */
function labelOf(button: HTMLElement): string {
  return (button.textContent ?? "").trim();
}

function pressable(button: HTMLElement | null): button is HTMLButtonElement {
  return !!button && !button.hasAttribute("disabled");
}

function satisfies(view: string, target: BoardView): boolean {
  if (target === "image") return view === "";
  if (target === "live") return view !== "";
  return view === target.replace("camera-", "");
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/** The camera button once it can be pressed, or null when it never came up in time. */
async function pressableButton(timeout: number): Promise<HTMLButtonElement | null> {
  const deadline = Date.now() + timeout;
  for (;;) {
    const button = cameraButton();
    if (pressable(button)) return button;
    if (Date.now() >= deadline) return null;
    await wait(POLL_INTERVAL);
  }
}

/**
 * Press until the board shows `target`, or until the cycle repeats itself.
 *
 * Waits first for a button that can be pressed — see above for why a blank,
 * disabled one must not count as the drawn board. A board with one camera
 * cannot show camera 3, and asking for it should stop after one lap rather than
 * press forever — so every view seen is remembered, and arriving somewhere
 * twice means the target is not on offer.
 */
export async function setBoardView(target: BoardView, timeout = PRESSABLE_TIMEOUT): Promise<boolean> {
  if (!await pressableButton(timeout)) {
    console.log("Autodarts Tools: Board View - no camera button to press right now");
    return false;
  }

  const seen = new Set<string>();
  for (let press = 0; press < 12; press++) {
    // Re-read each time: the site may have rebuilt the button, or the turn may
    // have passed to a seat without a board, in which case the next press would
    // do nothing and the blank label would read as the drawn board.
    const button = cameraButton();
    if (!pressable(button)) return false;

    const view = labelOf(button);
    if (satisfies(view, target)) return true;
    if (seen.has(view)) break;

    seen.add(view);
    button.click();
    await wait(CLICK_DELAY);
  }

  console.log(`Autodarts Tools: Board View - "${target}" is not one of this board's views (saw ${[ ...seen ].map(v => v || "image").join(", ")})`);
  return false;
}

/** Which game a match state belongs to — a new leg or set is a new game. */
function gameOf(data: IGameData | undefined): string {
  const match = data?.match;
  return match ? `${match.variant}:${match.set ?? 0}:${match.leg ?? 0}` : "";
}

/**
 * Put the board on `target` now, and again every time the site lets go of it.
 *
 * "Lets go of it" is anything that leaves the button pressable and showing the
 * wrong view without the player having asked for it: the screen being rebuilt,
 * the turn passing to a board the site has not been told about, the button
 * coming back to life after a bot's turn. All of them show up as a mutation
 * under the app root, so one observer covers the lot; it only ever acts when
 * the view is wrong, so a screen that redraws on every dart costs a
 * `querySelector` a time.
 *
 * The player's own press — trusted events only; ours are synthetic — hands the
 * view over to them until the next leg. Returns the function that stops it all.
 */
export function keepBoardView(target: BoardView): () => void {
  let stopped = false;
  let applying = false;
  let playersChoice = false;
  let game = "";
  let settle: ReturnType<typeof setTimeout> | undefined;

  const apply = async () => {
    if (stopped || applying || playersChoice) return;
    applying = true;
    try {
      await setBoardView(target);
    } finally {
      applying = false;
    }
  };

  const check = () => {
    if (stopped || applying || playersChoice) return;
    const button = cameraButton();
    if (!pressable(button) || satisfies(labelOf(button), target)) return;
    void apply();
  };

  const onClick = (event: MouseEvent) => {
    if (!event.isTrusted) return;
    const button = cameraButton();
    if (button && event.target instanceof Node && button.contains(event.target)) {
      playersChoice = true;
      console.log("Autodarts Tools: Board View - the player changed the view, leaving it until the next leg");
    }
  };
  const onKeydown = (event: KeyboardEvent) => {
    if (!event.isTrusted || event.target instanceof HTMLInputElement) return;
    if (event.code === "Digit1" || event.code === "Digit2" || event.code === "Digit3") playersChoice = true;
  };
  document.addEventListener("click", onClick, true);
  window.addEventListener("keydown", onKeydown, true);

  const observer = new MutationObserver(() => {
    if (settle) clearTimeout(settle);
    settle = setTimeout(() => {
      settle = undefined;
      check();
    }, SETTLE_DELAY);
  });
  observer.observe(qs(SELECTORS.app.contentRoot) ?? document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: [ "disabled" ],
  });

  const unwatch = AutodartsToolsGameData.watch((value: IGameData) => {
    const next = gameOf(value);
    if (!next || next === game) return;
    const first = game === "";
    game = next;
    if (first) return;
    playersChoice = false;
    check();
  });
  AutodartsToolsGameData.getValue().then((value) => {
    if (game === "") game = gameOf(value);
  });

  void apply();

  return () => {
    stopped = true;
    if (settle) clearTimeout(settle);
    observer.disconnect();
    unwatch();
    document.removeEventListener("click", onClick, true);
    window.removeEventListener("keydown", onKeydown, true);
  };
}

let stopKeeping: (() => void) | null = null;

export async function boardView() {
  const config: IConfig = await AutodartsToolsConfig.getValue();
  const target = config.boardView.view;

  console.log(`Autodarts Tools: Board View - keeping the board on ${target}`);
  stopKeeping?.();
  // Not awaited: the first press can wait several seconds for a button that can
  // be pressed, and nothing after this in the match start-up depends on it.
  stopKeeping = keepBoardView(target);
}

export function boardViewOnRemove() {
  // The view itself is left wherever it is — this presses the site's own
  // button, and there is nothing to put back. Only the watching stops.
  stopKeeping?.();
  stopKeeping = null;
}
