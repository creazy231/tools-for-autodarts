/**
 * Auto Start — arm a lobby to start itself once someone else joins.
 *
 * A toggle sits beside the lobby's own Start Game button. While it reads
 * "Autostart On", a second player arriving presses Start Game three seconds
 * later. Those three seconds are the grace period: a player who joins the wrong
 * lobby and leaves again cancels the start instead of triggering it.
 *
 * The armed state is deliberately not persisted. It presses a button that
 * starts a real game, so every lobby opens disarmed rather than inheriting a
 * decision made in some earlier lobby.
 */

import { createApp, ref, watch } from "vue";

import AutoStartToggle from "./AutoStartToggle.vue";
import { startGameButton, waitForStartGameButton } from "./start-game";

import { SELECTORS, qs, qsa } from "@/utils/selectors";

/** Players required before the lobby starts itself. */
const MIN_PLAYERS = 2;

/** Grace period between the lobby filling up and the button being pressed. */
const START_DELAY_MS = 3000;

/** Marks the nodes whose layout we borrowed, so they can be handed back. */
const UNCENTERED_FLAG = "data-autodarts-tools-uncentered";
const CENTERED_FLAG = "data-autodarts-tools-centered";

/** Survives a remount — see AutoStartToggle.vue. */
const armed = ref(false);

let ui: any = null;
let pageObserver: MutationObserver | null = null;
let startTimer: number | null = null;

/**
 * Module scope, not inside `autoStart`: the ref outlives the UI, and a watcher
 * registered per mount would stack up one more copy on every lobby visited.
 */
watch(armed, (value) => {
  console.log(`Autodarts Tools: Auto Start - ${value ? "armed" : "disarmed"}`);
  if (value) evaluate();
  else cancelPendingStart();
});

export async function autoStart(ctx: any) {
  if (ui) return;

  console.log("Autodarts Tools: Auto Start - Starting");

  const bar = await waitForActionBar();
  if (!bar) {
    console.warn("Autodarts Tools: Auto Start - No Start Game button on this page");
    return;
  }

  ui = await createShadowRootUi(ctx, {
    name: "autodarts-tools-auto-start",
    position: "inline",
    anchor: () => actionBar(),
    // Last child, so React never has to reconcile around a node it did not
    // create. On wide screens the chat button in between is absolutely
    // positioned, which leaves the toggle sitting right of Start Game anyway.
    append: "last",
    /**
     * Nothing is styled on the host: WXT resets it with
     * `:host { all: initial !important }`, and an important declaration from a
     * shadow tree beats even an important inline style on the host from out
     * here. The toggle is a flex item either way, which blockifies it, so the
     * layout comes out right without any of it.
     */
    onMount: (container: HTMLElement) => {
      const app = createApp(AutoStartToggle, { armed });
      app.mount(container);
      return app;
    },
    onRemove: (app: any) => app?.unmount(),
  });

  ui.mount();
  takeCentering();
  watchPage();
}

export async function onRemove() {
  cancelPendingStart();
  armed.value = false;

  pageObserver?.disconnect();
  pageObserver = null;

  ui?.remove();
  ui = null;

  releaseCentering();
}

// ------------------------------------------------------------------ anchors

/**
 * The `max-w-80` box the site wraps Start Game in to centre it.
 *
 * The button is found by where it sits rather than by its label — see
 * start-game.ts — so this mounts in a lobby that is still filling up, while
 * the button still reads "Needs at least 2 players", and in any language.
 */
function startGameWrapper(): HTMLElement | null {
  return startGameButton()?.parentElement ?? null;
}

/** The bar across the foot of the lobby; our toggle's host. */
function actionBar(): HTMLElement | null {
  return startGameWrapper()?.parentElement ?? null;
}

async function waitForActionBar(timeout = 10000): Promise<HTMLElement | null> {
  const button = await waitForStartGameButton(timeout);
  return button?.parentElement?.parentElement ?? null;
}

// ------------------------------------------------------------------- layout

/**
 * Make room for the toggle.
 *
 * The bar has no alignment of its own: Start Game is centred by an `mx-auto`
 * on its wrapper. Adding a second item in flow turns that auto margin into a
 * shove, pushing Start Game off centre and the toggle into the chat button at
 * the right edge. Centring the bar itself instead keeps the two together as a
 * pair. Both changes are flagged and reverted in `onRemove`.
 */
function takeCentering() {
  const wrapper = startGameWrapper();
  if (wrapper?.classList.contains("mx-auto")) {
    wrapper.classList.remove("mx-auto");
    wrapper.setAttribute(UNCENTERED_FLAG, "true");
  }

  const bar = actionBar();
  if (bar && bar.style.justifyContent !== "center") {
    bar.style.justifyContent = "center";
    bar.setAttribute(CENTERED_FLAG, "true");
  }
}

function releaseCentering() {
  for (const el of document.querySelectorAll<HTMLElement>(`[${UNCENTERED_FLAG}]`)) {
    el.classList.add("mx-auto");
    el.removeAttribute(UNCENTERED_FLAG);
  }
  for (const el of document.querySelectorAll<HTMLElement>(`[${CENTERED_FLAG}]`)) {
    el.style.justifyContent = "";
    el.removeAttribute(CENTERED_FLAG);
  }
}

// -------------------------------------------------------------- page watch

/**
 * One observer covers both jobs the lobby needs watching for: players arriving
 * and leaving, and React re-rendering the bar out from under the toggle.
 *
 * `takeCentering` and `evaluate` are both no-ops once their work is done, so
 * this cannot feed itself its own mutations.
 */
function watchPage() {
  pageObserver = new MutationObserver(() => {
    remountIfDetached();
    takeCentering();
    evaluate();
  });
  pageObserver.observe(document.body, { childList: true, subtree: true, characterData: true });
}

function remountIfDetached() {
  if (!ui || document.contains(ui.shadowHost) || !actionBar()) return;
  ui.remove();
  ui.mount();
}

// -------------------------------------------------------------------- start

/**
 * How many players are in the lobby.
 *
 * The site's own counter chip is the primary source; counting the rows covers
 * it being restyled away.
 */
function playerCount(): number {
  const count = qs(SELECTORS.lobby.playerCountChip)?.textContent?.match(/(\d+)\s*\/\s*\d+/);
  if (count) return Number(count[1]);
  return qsa(SELECTORS.lobby.playerRows).length;
}

function evaluate() {
  if (!armed.value) return;

  if (playerCount() < MIN_PLAYERS) {
    // Whoever we were waiting for left again. Stand down, keep watching.
    cancelPendingStart();
    return;
  }

  if (startTimer !== null) return;
  console.log(`Autodarts Tools: Auto Start - Lobby is full enough, starting in ${START_DELAY_MS / 1000}s`);
  startTimer = window.setTimeout(startGame, START_DELAY_MS);
}

function startGame() {
  startTimer = null;
  if (!armed.value) return;

  // The lobby had three seconds to change; re-read it rather than trusting the
  // count that armed the timer.
  if (playerCount() < MIN_PLAYERS) return;

  const button = startGameButton();
  if (!button || button.disabled) {
    console.warn("Autodarts Tools: Auto Start - Start Game is not available, staying armed");
    return;
  }

  button.click();
  console.log("Autodarts Tools: Auto Start - Started the game");
  armed.value = false;
}

function cancelPendingStart() {
  if (startTimer === null) return;
  clearTimeout(startTimer);
  startTimer = null;
}
