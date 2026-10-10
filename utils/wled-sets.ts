import type { IConfig, IWled, IWledSet } from "@/utils/storage";

/**
 * WLED's effect sets: lists of effects kept for an occasion, such as Halloween,
 * of which one is in use.
 *
 * The list that plays stays where the runtime has always read it,
 * `wledFx.effects`. The other sets' lists wait in `wledFx.sets`, where the set
 * in use keeps its place by id and name only. So a config from before sets is
 * one set, an export plays its set in use in an older version, and
 * entrypoints/match.content/wled.ts knows nothing of sets.
 * Spec: docs/superpowers/specs/2026-10-10-wled-effect-sets-design.md.
 *
 * Each function takes the `wledFx` section and returns a new one without
 * changing its input, and nothing here is imported at runtime, so tsx runs it.
 */

type WledFx = IConfig["wledFx"];
type WrittenOut = WledFx & { sets: IWledSet[]; activeSet: string };

/** The id of the first set: the one a config from before sets is. */
export const DEFAULT_SET_ID = "default";

/** A set as the settings show it. */
export interface WledSetView {
  id: string;
  /** As stored: "" is the first set, shown under the default name (setLabel). */
  name: string;
  /** The stored list itself, so an edit in place reaches the config: for the set in use, `wledFx.effects`. */
  effects: IWled[];
  /** Whether it is the set in use. */
  active: boolean;
}

/** Every set in order. A config without sets is one: the set in use, named "". */
export function listSets(wledFx: WledFx): WledSetView[] {
  const fx = normalizeWledSets(wledFx);
  if (!fx.sets || !fx.activeSet) return [ { id: DEFAULT_SET_ID, name: "", effects: fx.effects, active: true } ];
  return fx.sets.map(set => ({
    id: set.id,
    name: set.name,
    effects: set.id === fx.activeSet ? fx.effects : set.effects ?? [],
    active: set.id === fx.activeSet,
  }));
}

/** What a set is called: its name, or `defaultName` for the first set until it is renamed. */
export function setLabel(set: { name: string }, defaultName: string): string {
  return set.name || defaultName;
}

/** Whether a set other than `exceptId` is called `name`, trimmed and in any case. A set named "" goes by `defaultName`. */
export function setNameTaken(sets: readonly { id: string; name: string }[], name: string, defaultName: string, exceptId?: string): boolean {
  const wanted = name.trim().toLocaleLowerCase();
  return sets.some(set => set.id !== exceptId && setLabel(set, defaultName).trim().toLocaleLowerCase() === wanted);
}

/**
 * The shape the functions here rely on, from whatever was stored or imported:
 * - no usable set: no `sets` and no `activeSet` at all;
 * - each set with an id of its own and a name, both text;
 * - a list of effects on every set but the one in use, whose list is `effects`;
 * - a set in use, put first when `activeSet` names none.
 *
 * A set that needs nothing comes back as the same object, its list the same
 * array, so the settings go on editing what is stored. Fields this version
 * doesn't know are kept.
 */
export function normalizeWledSets(wledFx: WledFx): WledFx {
  if (!wledFx || typeof wledFx !== "object") return wledFx;
  const { sets: stored, activeSet: storedActive, ...rest } = wledFx;
  const fx: WledFx = Array.isArray(rest.effects) ? rest : { ...rest, effects: [] };

  const ids = new Set<string>();
  const kept: IWledSet[] = [];
  for (const set of Array.isArray(stored) ? stored : []) {
    if (!set || typeof set !== "object" || typeof set.id !== "string" || !set.id || ids.has(set.id)) continue;
    ids.add(set.id);
    kept.push(set);
  }
  if (!kept.length) return fx;

  let activeSet = typeof storedActive === "string" ? storedActive : "";
  if (!activeSet) activeSet = ids.has(DEFAULT_SET_ID) ? newSetId(ids) : DEFAULT_SET_ID;
  const sets = kept.map(set => tidy(set, set.id === activeSet));
  if (!ids.has(activeSet)) sets.unshift({ id: activeSet, name: "" });
  return { ...fx, sets, activeSet };
}

/**
 * `id` as the set in use: the list that plays goes back to its own set, and
 * `id`'s list becomes `effects`. The set already in use, or an id no set has,
 * gives back `wledFx` itself.
 */
export function activateSet(wledFx: WledFx, id: string): WledFx {
  const fx = writtenOut(wledFx);
  const target = fx.sets.find(set => set.id === id);
  if (!target || id === fx.activeSet) return wledFx;
  const sets = fx.sets.map((set) => {
    if (set.id === fx.activeSet) return { ...set, effects: fx.effects };
    return set.id === id ? withoutEffects(set) : set;
  });
  return { ...fx, effects: target.effects ?? [], sets, activeSet: id };
}

/** A new set at the end, holding a copy of `effects`, and its id. The set in use stays in use. */
export function addSet(wledFx: WledFx, name: string, effects: readonly IWled[]): { wledFx: WledFx; id: string } {
  const fx = writtenOut(wledFx);
  const id = newSetId(new Set(fx.sets.map(set => set.id)));
  // JSON rather than structuredClone, which refuses the settings' reactive proxies.
  const set: IWledSet = { id, name: name.trim(), effects: JSON.parse(JSON.stringify(effects)) };
  return { wledFx: { ...fx, sets: [ ...fx.sets, set ] }, id };
}

/** `id` under `name`, trimmed. An id no set has gives back `wledFx` itself. */
export function renameSet(wledFx: WledFx, id: string, name: string): WledFx {
  const fx = writtenOut(wledFx);
  if (!fx.sets.some(set => set.id === id)) return wledFx;
  return { ...fx, sets: fx.sets.map(set => (set.id === id ? { ...set, name: name.trim() } : set)) };
}

/**
 * Every set but `id`. Neither the set in use, whose effects are what plays,
 * nor an id no set has is deleted: both give back `wledFx` itself.
 */
export function deleteSet(wledFx: WledFx, id: string): WledFx {
  const fx = normalizeWledSets(wledFx);
  if (!fx.sets || id === fx.activeSet || !fx.sets.some(set => set.id === id)) return wledFx;
  return { ...fx, sets: fx.sets.filter(set => set.id !== id) };
}

/** `wledFx` with its sets written out: a config without sets gets the one set it is. */
function writtenOut(wledFx: WledFx): WrittenOut {
  const fx = normalizeWledSets(wledFx);
  if (fx.sets && fx.activeSet) return { ...fx, sets: fx.sets, activeSet: fx.activeSet };
  return { ...fx, sets: [ { id: DEFAULT_SET_ID, name: "" } ], activeSet: DEFAULT_SET_ID };
}

/** A stored set in the shape listSets reads, and the same object when it already is. */
function tidy(set: IWledSet, inUse: boolean): IWledSet {
  const name = typeof set.name === "string" ? set.name : "";
  if (inUse) return name === set.name && !("effects" in set) ? set : withoutEffects({ ...set, name });
  const effects = Array.isArray(set.effects) ? set.effects : [];
  return name === set.name && effects === set.effects ? set : { ...set, name, effects };
}

function withoutEffects(set: IWledSet): IWledSet {
  const copy = { ...set };
  delete copy.effects;
  return copy;
}

/** An id no set in `taken` has. Random rather than counted, so two tabs adding a set at once don't pick the same one. */
function newSetId(taken: ReadonlySet<string>): string {
  for (;;) {
    const id = `set-${Math.random().toString(36).slice(2, 10)}`;
    if (id.length > 4 && !taken.has(id)) return id;
  }
}
