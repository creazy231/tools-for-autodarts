/**
 * Team Lobby — set a private lobby up for several people throwing on one board.
 *
 * Two chores get done for you:
 *
 *   - your own entry is dropped. Opening a lobby adds you to it, but in a team
 *     lobby the players are the team names you type in afterwards, so that row
 *     is one you would delete by hand every single time
 *   - anyone who joins on their own board is moved onto yours, because the
 *     whole point is that everybody throws at the same dartboard
 *
 * Private lobbies you host, only. On a public lobby this would remove you from
 * a game you meant to play in and drag strangers onto your board, and in
 * someone else's lobby it is not your call to make.
 */

import type { ILobbies } from "@/utils/websocket-helpers";

import { SELECTORS, qs, qsa } from "@/utils/selectors";
import { AutodartsToolsLobbyData } from "@/utils/lobby-data-storage";
import { fetchWithAuth, getUserIdFromToken } from "@/utils/helpers";

let unwatchLobbyData: (() => void) | null = null;
let rowObserver: MutationObserver | null = null;

/** Once per lobby: adding yourself back on purpose has to stick. */
let selfRemoved = false;
let removing = false;
/** So a public or someone else's lobby explains itself once, not every update. */
let skipLogged = false;

export async function teamLobby() {
  console.log("Autodarts Tools: Team Lobby - Starting");

  selfRemoved = false;
  removing = false;
  skipLogged = false;

  await apply(await AutodartsToolsLobbyData.getValue());

  // Leaving one lobby for another re-runs this without a teardown in between,
  // so both handles have to be released before they are overwritten — otherwise
  // each lobby of a session leaves behind a live storage watcher and a
  // full-document observer that nothing can reach any more. Reported by
  // @MaB-MaN in #230.
  unwatchLobbyData?.();
  unwatchLobbyData = AutodartsToolsLobbyData.watch((data?: ILobbies) => {
    void apply(data);
  });

  // A player's row renders a moment after the update that brought them in, and
  // its board button is only clickable once it is there.
  rowObserver?.disconnect();
  rowObserver = new MutationObserver(() => claimBoards());
  rowObserver.observe(document.body, { childList: true, subtree: true });
}

export async function onRemove() {
  unwatchLobbyData?.();
  unwatchLobbyData = null;

  rowObserver?.disconnect();
  rowObserver = null;

  selfRemoved = false;
  removing = false;
  skipLogged = false;
}

async function apply(lobby?: ILobbies) {
  if (!lobby) return;

  // The stored lobby can still be the one before this, and acting on it would
  // delete a player by index from a lobby we are no longer looking at.
  if (lobby.id !== window.location.pathname.match(/\/lobby\/([0-9a-f-]+)/i)?.[1]) return;

  const userId = await getUserIdFromToken();
  if (!userId) return;

  if (!lobby.isPrivate || lobby.host?.id !== userId) {
    if (!skipLogged) {
      skipLogged = true;
      console.log(`Autodarts Tools: Team Lobby - Skipping, this is ${lobby.isPrivate ? "not your lobby" : "a public lobby"}`);
    }
    return;
  }

  await removeSelf(lobby, userId);
  claimBoards();
}

/**
 * Drop the host's own entry.
 *
 * Done through the API rather than the row's ✕: the index comes from the same
 * player list the button acts on, so there is no chance of counting rows
 * differently from the site and removing somebody else.
 */
async function removeSelf(lobby: ILobbies, userId: string) {
  if (selfRemoved || removing) return;

  const index = (lobby.players ?? []).findIndex(player => player.userId === userId);
  if (index < 0) {
    // Not in the lobby: either we already removed it or the host did.
    selfRemoved = true;
    return;
  }

  removing = true;
  try {
    const response = await fetchWithAuth(
      `https://api.autodarts.com/gs/v0/lobbies/${lobby.id}/players/by-index/${index}`,
      { method: "DELETE" },
    );

    if (response.ok) {
      selfRemoved = true;
      console.log("Autodarts Tools: Team Lobby - Removed the host from the lobby");
    } else {
      console.error("Autodarts Tools: Team Lobby - Could not remove the host", response.status, response.statusText);
    }
  } catch (error) {
    console.error("Autodarts Tools: Team Lobby - Error removing the host:", error);
  } finally {
    removing = false;
  }
}

/**
 * Pull everyone onto this board.
 *
 * Every player row carries a board button, which the site disables while that
 * player is already playing here — so an enabled one is precisely a player who
 * needs moving, and clicking it disables it. That makes this safe to run on
 * every render, with no bookkeeping of who has been moved.
 */
function claimBoards() {
  for (const row of qsa(SELECTORS.lobby.playerRows)) {
    const button = qs<HTMLButtonElement>(SELECTORS.lobby.playerBoardButton, row);
    if (!button || button.disabled) continue;

    button.click();
    console.log("Autodarts Tools: Team Lobby - Moved a player onto this board");
  }
}
