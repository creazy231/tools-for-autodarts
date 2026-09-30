import type { IMatch } from "@/utils/websocket-helpers";
import type { CallContext, LineupStore, ShiftStore } from "@/utils/teams";

import { getUserIdFromToken } from "@/utils/helpers";
import { AutodartsToolsConfig, AutodartsToolsTeamLineups, AutodartsToolsTeamShifts } from "@/utils/storage";
import { legWinCallNames, lineupOf, matchWinCallNames, normalizeTeams, shiftsOf, turnCallNames } from "@/utils/teams";

/**
 * The names the Caller, Sound FX and WLED call a seat by. The rules are
 * utils/teams.ts's (`turnCallNames` and the two for wins); this keeps what
 * they need current for the page: the saved teams, whose guests the shared
 * seats are, the tap-to-correct shifts and the own-score lineups. With Teams
 * off, every seat is only its own name, as it always was.
 */
let teams = normalizeTeams(undefined);
let hostId: string | null = null;
let shifts: ShiftStore = {};
let lineups: LineupStore = {};
let loading: Promise<void> | undefined;

/** Loads it all once for every feature on the page, and watches it from then on. */
export function loadTeamCalls(): Promise<void> {
  loading ??= (async () => {
    teams = normalizeTeams((await AutodartsToolsConfig.getValue())?.teams);
    AutodartsToolsConfig.watch((config) => {
      teams = normalizeTeams(config?.teams);
    });
    hostId = await getUserIdFromToken();
    shifts = (await AutodartsToolsTeamShifts.getValue()) ?? {};
    AutodartsToolsTeamShifts.watch((value) => {
      shifts = value ?? {};
    });
    lineups = (await AutodartsToolsTeamLineups.getValue()) ?? {};
    AutodartsToolsTeamLineups.watch((value) => {
      lineups = value ?? {};
    });
  })();
  return loading;
}

function context(match: IMatch): CallContext {
  if (!teams.enabled) return { saved: [], hostId, shifts: {}, lineup: undefined };
  return { saved: teams.saved, hostId, shifts: shiftsOf(shifts, match.id), lineup: lineupOf(lineups, match.id) };
}

/** Whoever is up: the player, then their team. */
export function turnNames(match: IMatch): string[] {
  return turnCallNames(match, context(match));
}

/** A leg won: the player who checked out, then their team. */
export function legWinNames(match: IMatch): string[] {
  return legWinCallNames(match, context(match));
}

/** A match won: the team, then the player who checked out. */
export function matchWinNames(match: IMatch): string[] {
  return matchWinCallNames(match, context(match));
}
