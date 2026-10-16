/**
 * Settings that were renamed, carried over to their new name.
 *
 * Storage migrates what it holds, but an exported or pasted config arrives as
 * it was saved and is merged over the defaults, which already hold the new
 * name, switched off. So this runs on the imported config before that merge,
 * and in the storage migration as well.
 */
export function renameSettings<T>(config: T): T {
  if (!config || typeof config !== "object") return config;
  return renameTriggers(renameTeamLobby(config));
}

function renameTeamLobby<T>(config: T): T {
  if (!("teamLobby" in (config as object))) return config;
  // Team Lobby is Local Lobby since 3.1.1.
  const { teamLobby, ...rest } = config as Record<string, any>;
  return { ...rest, localLobby: rest.localLobby ?? teamLobby } as T;
}

/**
 * A win for one player or team was `gameshot_<name>` and `matchshot_<name>`
 * (Sound FX: with `ambient_` in front). A name may hold underscores itself,
 * which made those ambiguous, so it is joined with `+` now, as every trigger
 * with a name or a game in it is (utils/game-events/match.ts): `gameshot+alice`.
 * The Caller, Sound FX, WLED and Animations' items are carried over.
 */
const NAMED_WIN = /^(ambient_)?(gameshot|matchshot)_(.+)$/i;

export function renameTrigger(trigger: string): string {
  return trigger.replace(NAMED_WIN, (_, ambient = "", event, name) => `${ambient}${event}+${name}`);
}

function renameItems(items: unknown): unknown {
  if (!Array.isArray(items)) return items;
  return items.map((item: any) => {
    if (Array.isArray(item?.triggers)) return { ...item, triggers: item.triggers.map((trigger: unknown) => (typeof trigger === "string" ? renameTrigger(trigger) : trigger)) };
    if (typeof item?.triggers === "string") return { ...item, triggers: renameTrigger(item.triggers) };
    return item;
  });
}

/** Every list of the four, the one in use and those in its sets (utils/library-sets.ts), which keep theirs under the same key. */
function renameTriggers<T>(config: T): T {
  const next = { ...(config as Record<string, any>) };
  const lists: [ string, string ][] = [ [ "caller", "sounds" ], [ "soundFx", "sounds" ], [ "wledFx", "effects" ], [ "animations", "data" ] ];
  for (const [ feature, list ] of lists) {
    const section = next[feature];
    if (!section || typeof section !== "object") continue;
    next[feature] = {
      ...section,
      ...(Array.isArray(section[list]) && { [list]: renameItems(section[list]) }),
      ...(Array.isArray(section.sets) && { sets: section.sets.map((set: any) => (set && Array.isArray(set[list]) ? { ...set, [list]: renameItems(set[list]) } : set)) }),
    };
  }
  return next as T;
}
