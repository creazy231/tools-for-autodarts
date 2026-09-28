import type { IConfig } from "@/utils/storage";

export type InstantReplayConfig = IConfig["instantReplay"];

/**
 * Instant Replay as it starts out: ten seconds of run-up, the number *Duration*
 * started at, and three of what follows the dart, which is about what the
 * replay showed before it was cut to the second.
 */
export function defaultInstantReplay(): InstantReplayConfig {
  return {
    enabled: false,
    deviceId: "",
    before: 10,
    after: 3,
    startDelay: 3,
    viewMode: "board-only",
    zoom: 1,
    positionX: 0,
    positionY: 0,
  };
}

/** A number of seconds, or nothing. */
function seconds(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;
}

/**
 * Settings from anywhere, in the current shape.
 *
 * Storage migrates what it holds, but an exported or a pasted config is merged
 * over the defaults as it is, so the settings page runs those through here as
 * well — and so does the match script, so an old shape never reaches the
 * recorder.
 *
 * The replay used to be counted back from the moment it began, *Start delay*
 * after the win, and played whole stretches of recording that added up to at
 * least *Duration*. *Duration* read as the run-up to the winning dart, and that
 * is what `before` is now, exactly, so its number carries over. What followed
 * the dart was the start delay, so that is where `after` starts.
 */
export function normalizeInstantReplay(saved: unknown): InstantReplayConfig {
  const defaults = defaultInstantReplay();
  if (!saved || typeof saved !== "object" || Array.isArray(saved)) return defaults;

  const old = saved as Record<string, any>;
  const next: Record<string, any> = {
    ...defaults,
    ...old,
    before: seconds(old.before) ?? seconds(old.duration) ?? defaults.before,
    after: seconds(old.after) ?? seconds(old.startDelay) ?? defaults.after,
    startDelay: seconds(old.startDelay) ?? defaults.startDelay,
  };
  delete next.duration;
  delete next.delay;
  return next as InstantReplayConfig;
}
