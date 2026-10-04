/**
 * Local Lobby — set a private lobby up for everyone to play at your board.
 *
 * Two chores get done for you:
 *
 *   - your own entry is dropped. Opening a lobby adds you to it, but in a local
 *     lobby the players are the guests you add afterwards, so that row is one
 *     you would delete by hand every single time
 *   - anyone who joins on their own board is moved onto yours, because the
 *     whole point is that everybody throws at the same dartboard
 *
 * Private lobbies you host, only. On a public lobby this would remove you from
 * a game you meant to play in and drag strangers onto your board, and in
 * someone else's lobby it is not your call to make.
 */

import type { RoomStore } from "@/utils/team-room";
import type { ILobbies } from "@/utils/websocket-helpers";

import { SELECTORS, qsa } from "@/utils/selectors";
import { AutodartsToolsLobbyData } from "@/utils/lobby-data-storage";
import { AutodartsToolsTeamRoom } from "@/utils/storage";
import { roomOf, screenTeams } from "@/utils/team-room";
import { CLAIM_GRACE_MS, boardButtonsToPress } from "@/utils/local-lobby-rows";
import { fetchWithAuth, getUserIdFromToken } from "@/utils/helpers";

let unwatchLobbyData: (() => void) | null = null;
let rowObserver: MutationObserver | null = null;
/** Online Teams' room per lobby (utils/team-room.ts), followed live: another account's team stays on its board. */
let roomStore: RoomStore = {};
let unwatchRoom: (() => void) | null = null;
/** The lobby and user the last pass found this to be the host's private lobby of, for the row observer's passes. */
let claimFor: { lobby: ILobbies; userId: string } | null = null;
/** When each seat of the lobby was first seen, for the grace before it is pulled onto this board (utils/local-lobby-rows.ts). */
let seenAt = new Map<string, number>();
let seenLobby = "";
/** A pass once the newest seat's grace is over: nothing else may change on the page by then. */
let claimTimer: ReturnType<typeof setTimeout> | undefined;

/** Once per lobby: adding yourself back on purpose has to stick. */
let selfRemoved = false;
let removing = false;
/** So a public or someone else's lobby explains itself once, not every update. */
let skipLogged = false;

export async function localLobby() {
  console.log("Autodarts Tools: Local Lobby - Starting");

  selfRemoved = false;
  removing = false;
  skipLogged = false;
  claimFor = null;

  roomStore = (await AutodartsToolsTeamRoom.getValue()) ?? {};
  unwatchRoom?.();
  unwatchRoom = AutodartsToolsTeamRoom.watch((value?: RoomStore) => {
    roomStore = value ?? {};
  });

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
  rowObserver = new MutationObserver(() => {
    if (claimFor) claimBoards(claimFor.lobby, claimFor.userId);
  });
  rowObserver.observe(document.body, { childList: true, subtree: true });
}

export async function onRemove() {
  unwatchLobbyData?.();
  unwatchLobbyData = null;

  rowObserver?.disconnect();
  rowObserver = null;

  unwatchRoom?.();
  unwatchRoom = null;
  claimFor = null;
  clearTimeout(claimTimer);
  seenAt = new Map();
  seenLobby = "";

  selfRemoved = false;
  removing = false;
  skipLogged = false;
}

async function apply(lobby?: ILobbies) {
  claimFor = null;
  if (!lobby) return;

  // The stored lobby can still be the one before this, and acting on it would
  // delete a player by index from a lobby we are no longer looking at.
  if (lobby.id !== window.location.pathname.match(/\/lobby\/([0-9a-f-]+)/i)?.[1]) return;

  const userId = await getUserIdFromToken();
  if (!userId) return;

  if (!lobby.isPrivate || lobby.host?.id !== userId) {
    if (!skipLogged) {
      skipLogged = true;
      console.log(`Autodarts Tools: Local Lobby - Skipping, this is ${lobby.isPrivate ? "not your lobby" : "a public lobby"}`);
    }
    return;
  }

  claimFor = { lobby, userId };
  await removeSelf(lobby, userId);
  claimBoards(lobby, userId);
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
      console.log("Autodarts Tools: Local Lobby - Removed the host from the lobby");
    } else {
      console.error("Autodarts Tools: Local Lobby - Could not remove the host", response.status, response.statusText);
    }
  } catch (error) {
    console.error("Autodarts Tools: Local Lobby - Error removing the host:", error);
  } finally {
    removing = false;
  }
}

/**
 * Pull everyone onto this board, by the 🌐 on each row whose seat someone
 * else hosts (utils/local-lobby-rows.ts).
 *
 * Online Teams: a seat of another account's team stays on that account's
 * board (utils/team-room.ts). Rows come in seat order.
 */
function claimBoards(lobby: ILobbies, userId: string) {
  const players = lobby.players ?? [];
  const now = Date.now();
  if (seenLobby !== lobby.id) {
    seenLobby = lobby.id;
    seenAt = new Map();
  }
  if (players.some(seat => seat.id && !seenAt.has(seat.id))) {
    for (const seat of players) if (seat.id && !seenAt.has(seat.id)) seenAt.set(seat.id, now);
    clearTimeout(claimTimer);
    claimTimer = setTimeout(() => {
      if (claimFor) claimBoards(claimFor.lobby, claimFor.userId);
    }, CLAIM_GRACE_MS + 100);
  }
  const room = roomOf(roomStore, lobby.id);
  const theirs = new Set(screenTeams({ players, saved: [], lineup: undefined, shifts: {}, room, me: userId, hostId: lobby.host?.id }).remote.flatMap(team => team.seatIds));
  for (const button of boardButtonsToPress(qsa(SELECTORS.lobby.playerRows), players.map(seat => seat.id), theirs, seenAt, now)) {
    button.click();
    console.log("Autodarts Tools: Local Lobby - Moved a player onto this board");
  }
}
