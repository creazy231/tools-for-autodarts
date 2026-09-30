/**
 * Settings that were renamed, carried over to their new name.
 *
 * Storage migrates what it holds, but an exported or pasted config arrives as
 * it was saved and is merged over the defaults, which already hold the new
 * name, switched off. So this runs on the imported config before that merge,
 * and in the storage migration as well.
 */
export function renameSettings<T>(config: T): T {
  if (!config || typeof config !== "object" || !("teamLobby" in config)) return config;
  // Team Lobby is Local Lobby since 3.1.1.
  const { teamLobby, ...rest } = config as Record<string, any>;
  return { ...rest, localLobby: rest.localLobby ?? teamLobby } as T;
}
