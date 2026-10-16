import type { IBoard } from "@/utils/board-data-storage";
import type { ILobbies } from "@/utils/websocket-helpers";

/**
 * The trigger a board's event and status stand for, or `undefined` for one
 * nothing listens to. WLED's list, which was the longest of the three copies
 * the Caller, Sound FX and WLED each kept; Sound FX plays these with its
 * `ambient_` prefix.
 */
export function boardTrigger(board: Partial<IBoard>): string | undefined {
  const event = board.event;
  const status = board.status;

  if ((event === "Starting" && (status === "" || status === "Starting")) || (event === "start" && status === "")) return "board_starting";
  if (event === "Started" && status === "Throw") return "board_started";
  if (event === "Stopping" && status === "Stopping") return "board_stopping";
  if (event === "Stopped" && status === "Stopped") return "board_stopped";
  if (event === "Disconnected" && (status === "Offline" || status === "")) return "board_stopped";
  if (event === "Manual reset" && status === "Throw") return "manual_reset_done";
  if (event === "Throw detected" && status === "Throw") return "throw";
  if (event === "Throw detected" && status === "Takeout") return "last_throw";
  if (event === "Takeout started" && status === "Takeout in progress") return "takeout";
  if (event === "Takeout finished" && status === "Throw") return "takeout_finished";
  if (event === "Calibration started") return "calibration_started";
  if (event === "Calibration finished") return "calibration_finished";
  return undefined;
}

/** Somebody joining a lobby (`lobby_in`) or leaving it (`lobby_out`), from two of its frames. */
export function lobbyTrigger(lobby: ILobbies | undefined, old: ILobbies | undefined): string | undefined {
  if (!lobby || !old) return undefined;
  const now = lobby.players?.length ?? 0;
  const before = old.players?.length ?? 0;
  if (now > before && now > 1) return "lobby_in";
  if (now < before && now > 0) return "lobby_out";
  return undefined;
}

/** `/lobby/<id>` on the rebuilt site, `/lobbies/<id>` on the old one. */
export function isOnALobbyPage(href: string): boolean {
  return /\/lobb(?:y|ies)\//.test(href);
}
