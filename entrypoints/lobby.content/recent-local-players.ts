/**
 * Recent Local Players — keep every local player you have ever entered.
 *
 * The rebuilt site keeps its guest players in `localStorage` under
 * `autodarts-guest-players` and rewrites the whole array on every add, capped
 * at six. Enter a seventh name and the oldest is gone for good — there is no
 * other copy of it anywhere.
 *
 * So the extension keeps its own list, capped only by the setting, and does two
 * things with it:
 *
 *   - writes it back into the site's own store, so the site's Add Player
 *     dialog offers the whole list rather than the last six
 *   - renders a strip of saved players under the lobby's player list, which
 *     adds one in a single click no matter what the site is currently showing
 *
 * The strip is what makes this reliable. The site reads its store when the
 * lobby mounts and keeps the array in memory from then on, so an add during the
 * session still collapses its own list back to six until the next lobby.
 */

import { createApp, ref } from "vue";

import RecentLocalPlayersStrip from "./RecentLocalPlayers.vue";

import { SELECTORS, qs } from "@/utils/selectors";
import { AutodartsToolsConfig } from "@/utils/storage";
import { fetchWithAuth, getUserIdFromToken } from "@/utils/helpers";

/** Where the rebuilt site keeps its own (capped) list. */
const GUEST_KEY = "autodarts-guest-players";

/** Shared with the strip; see RecentLocalPlayers.vue. */
const names = ref<string[]>([]);

let ui: any = null;
let pageObserver: MutationObserver | null = null;
/** Last value we read from or wrote to the site's store, to skip idle work. */
let lastSeen: string | null = null;

export async function recentLocalPlayers(ctx: any) {
  if (ui) return;

  console.log("Autodarts Tools: Recent Local Players - Starting");

  const anchor = await waitForCardContent();
  if (!anchor) {
    console.warn("Autodarts Tools: Recent Local Players - No player list on this page");
    return;
  }

  await sync();

  ui = await createShadowRootUi(ctx, {
    name: "autodarts-tools-recent-local-players",
    position: "inline",
    anchor: () => qs(SELECTORS.lobby.playersCardContent),
    append: "last",
    // The host takes no styling — WXT's `:host { all: initial !important }`
    // reset beats anything set from out here. The strip is a flex item in the
    // card, which blockifies it, so it lays out correctly regardless.
    onMount: (container: HTMLElement) => {
      const app = createApp(RecentLocalPlayersStrip, { names, add: addPlayer });
      app.mount(container);
      return app;
    },
    onRemove: (app: any) => app?.unmount(),
  });

  ui.mount();
  watchPage();
}

export async function onRemove() {
  pageObserver?.disconnect();
  pageObserver = null;

  ui?.remove();
  ui = null;

  lastSeen = null;
  names.value = [];
}

// ------------------------------------------------------------------- anchor

async function waitForCardContent(timeout = 10000): Promise<HTMLElement | null> {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const el = qs(SELECTORS.lobby.playersCardContent);
    if (el) return el;
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  return null;
}

/**
 * The lobby re-renders whenever a player joins or leaves, which is also when
 * the site rewrites its list — so one observer covers both remounting the strip
 * and noticing names we have not saved yet.
 */
function watchPage() {
  pageObserver = new MutationObserver(() => {
    remountIfDetached();
    if (localStorage.getItem(GUEST_KEY) !== lastSeen) void sync();
  });
  pageObserver.observe(document.body, { childList: true, subtree: true });
}

function remountIfDetached() {
  if (!ui || document.contains(ui.shadowHost) || !qs(SELECTORS.lobby.playersCardContent)) return;
  ui.remove();
  ui.mount();
}

// -------------------------------------------------------------------- sync

/** Take everything the site knows, add everything we know, store both. */
async function sync() {
  const config = await AutodartsToolsConfig.getValue();
  const saved = config.recentLocalPlayers.players ?? [];
  const cap = Math.max(1, config.recentLocalPlayers.cap || 10);

  const merged = merge(readSiteList(), saved, cap);
  names.value = merged;

  if (!sameList(merged, saved)) {
    await AutodartsToolsConfig.setValue({
      ...config,
      recentLocalPlayers: { ...config.recentLocalPlayers, players: merged },
    });
  }

  writeSiteList(merged);
}

function readSiteList(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(GUEST_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((n: unknown): n is string => typeof n === "string") : [];
  } catch {
    return [];
  }
}

/**
 * Hand the full list back to the site.
 *
 * A plain write is invisible to it: it reads the key once, when the lobby
 * mounts, and works from memory afterwards. It does listen for `storage`
 * events, which the browser only fires in *other* tabs — dispatching one here
 * is what makes it take the longer list, which it then shows the next time the
 * Add Player dialog mounts.
 */
function writeSiteList(players: string[]) {
  const newValue = JSON.stringify(players);
  const oldValue = localStorage.getItem(GUEST_KEY);
  lastSeen = newValue;
  if (oldValue === newValue) return;

  localStorage.setItem(GUEST_KEY, newValue);
  window.dispatchEvent(new StorageEvent("storage", {
    key: GUEST_KEY,
    oldValue,
    newValue,
    storageArea: localStorage,
    url: window.location.href,
  }));
}

/**
 * Newest first. The site's list leads because its head is whoever was added
 * last; ours follows, holding the names it has already dropped.
 */
function merge(site: string[], saved: string[], cap: number): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const raw of [ ...site, ...saved ]) {
    const name = raw.trim();
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }

  return out.slice(0, cap);
}

function sameList(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((name, i) => name === b[i]);
}

// --------------------------------------------------------------------- add

/**
 * Add a saved player to the lobby.
 *
 * This is the request the site's own Add Player dialog makes. Going straight to
 * it keeps a click a click, rather than opening a dialog, typing into it and
 * pressing its button on the user's behalf.
 */
async function addPlayer(name: string): Promise<boolean> {
  const lobbyId = window.location.pathname.match(/\/lobby\/([0-9a-f-]+)/i)?.[1];
  const hostId = await getUserIdFromToken();

  if (!lobbyId || !hostId) {
    console.warn("Autodarts Tools: Recent Local Players - Cannot add a player without a lobby and a user id");
    return false;
  }

  try {
    const response = await fetchWithAuth(`https://api.autodarts.com/gs/v0/lobbies/${lobbyId}/players`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, hostId }),
    });

    if (!response.ok) {
      console.error("Autodarts Tools: Recent Local Players - Failed to add player", response.status, response.statusText);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Autodarts Tools: Recent Local Players - Error adding player:", error);
    return false;
  }
}
