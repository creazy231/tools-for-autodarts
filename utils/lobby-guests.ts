import { fetchWithAuth, getUserIdFromToken } from "@/utils/helpers";

/** Where the site keeps the board picked for autoscoring: its id, or `manual`. */
const BOARD_KEY = "selectedBoard";

/** The lobby a lobby page shows, from its address. */
export function lobbyIdFromUrl(path: string = window.location.pathname): string | undefined {
  return path.match(/\/lobby\/([0-9a-f-]+)/i)?.[1];
}

/**
 * The board the site's own Add Player dialog adds a guest on: the one picked
 * for autoscoring, or none when that is `manual` or nothing has been picked.
 * Left `undefined`, the field drops out of the request, as it does from the
 * site's. A guest is autoscored only by the board they were added with, and
 * the lobby looks the same either way.
 */
export function selectedBoard(): string | undefined {
  const board = localStorage.getItem(BOARD_KEY);
  return board && board !== "manual" ? board : undefined;
}

/**
 * Add a guest to the lobby on screen with the request the site's own Add
 * Player dialog makes, body and all. Resolves whether autodarts took it.
 */
export async function addGuest(name: string, feature: string): Promise<boolean> {
  const lobbyId = lobbyIdFromUrl();
  const hostId = await getUserIdFromToken();
  if (!lobbyId || !hostId) {
    console.warn(`Autodarts Tools: ${feature} - Cannot add a player without a lobby and a user id`);
    return false;
  }

  try {
    const response = await fetchWithAuth(`https://api.autodarts.com/gs/v0/lobbies/${lobbyId}/players`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, hostId, boardId: selectedBoard() }),
    });
    if (!response.ok) console.error(`Autodarts Tools: ${feature} - Failed to add player`, response.status, response.statusText);
    return response.ok;
  } catch (error) {
    console.error(`Autodarts Tools: ${feature} - Error adding player:`, error);
    return false;
  }
}

/** Where the site's Bot Settings keep the play speed it last used. */
const BOT_SPEED_KEY = "autodarts-bot-speed";

/** Add a bot at a level (the site's cpuPPR) to the lobby on screen, with the site's own bot request, at the speed its dialog last used. */
export async function addBot(name: string, ppr: number, feature: string): Promise<boolean> {
  const lobbyId = lobbyIdFromUrl();
  if (!lobbyId) return false;
  try {
    const response = await fetchWithAuth(`https://api.autodarts.com/gs/v0/lobbies/${lobbyId}/players`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, userId: null, cpuPPR: ppr, cpuSpeed: localStorage.getItem(BOT_SPEED_KEY) || "realistic" }),
    });
    if (!response.ok) console.error(`Autodarts Tools: ${feature} - Failed to add a bot`, response.status, response.statusText);
    return response.ok;
  } catch (error) {
    console.error(`Autodarts Tools: ${feature} - Error adding a bot:`, error);
    return false;
  }
}

/** Move one seat of the lobby on screen, as the site's drag does. */
export async function moveSeat(index: number, toIndex: number, feature: string): Promise<boolean> {
  const lobbyId = lobbyIdFromUrl();
  if (!lobbyId) return false;
  try {
    const response = await fetchWithAuth(`https://api.autodarts.com/gs/v0/lobbies/${lobbyId}/players/move/to-index`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ index, toIndex }),
    });
    if (!response.ok) console.error(`Autodarts Tools: ${feature} - Failed to move a seat`, response.status, response.statusText);
    return response.ok;
  } catch (error) {
    console.error(`Autodarts Tools: ${feature} - Error moving a seat:`, error);
    return false;
  }
}
