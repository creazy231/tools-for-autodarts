/**
 * Writes what the team room says into `local:teams-room`, which every reader
 * of teams uses (the lobby, the match, the team view, the Caller), in every
 * tab, and which outlasts a reload or an outage.
 */

import type { RoomState } from "@/utils/team-room";

import { AutodartsToolsTeamRoom } from "@/utils/storage";
import { withRoom } from "@/utils/team-room";

export async function mirrorRoom(state: RoomState): Promise<void> {
  const store = await AutodartsToolsTeamRoom.getValue();
  await AutodartsToolsTeamRoom.setValue(withRoom(store ?? {}, state, Date.now()));
}
