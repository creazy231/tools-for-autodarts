/**
 * The rebuilt site's own list of guest players, in `localStorage`.
 *
 * The site caps it at six, but Recent Local Players writes its whole list
 * back into it (see entrypoints/lobby.content/recent-local-players.ts), and
 * reads it first on the next sync. So a name has to leave both lists to be
 * gone: one deleted from the config alone came back the next time a lobby
 * opened.
 */
export const GUEST_KEY = "autodarts-guest-players";

/**
 * Take names out of the site's list, matched as the sync matches them:
 * trimmed, whatever the case. A store that is missing, unreadable or not a
 * list is left as it is, and so is anything in it that is not a name.
 *
 * The write is announced with a `storage` event, as the lobby's own write is:
 * the site reads the key once and then keeps the list in memory, and the
 * settings overlay leaves the page under it mounted. Without the event a lobby
 * open under the settings would still offer the name, and write it back with
 * its next add.
 */
export function forgetGuestPlayers(names: readonly string[]) {
  const forget = new Set(names.map(name => name.trim().toLowerCase()));

  const oldValue = localStorage.getItem(GUEST_KEY);
  let list: unknown;
  try {
    list = JSON.parse(oldValue ?? "null");
  } catch {
    return;
  }
  if (!Array.isArray(list)) return;

  const kept = list.filter(entry => typeof entry !== "string" || !forget.has(entry.trim().toLowerCase()));
  if (kept.length === list.length) return;

  const newValue = JSON.stringify(kept);
  localStorage.setItem(GUEST_KEY, newValue);
  window.dispatchEvent(new StorageEvent("storage", {
    key: GUEST_KEY,
    oldValue,
    newValue,
    storageArea: localStorage,
    url: window.location.href,
  }));
}
