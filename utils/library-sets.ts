/**
 * Sets of a library: lists of items kept for an occasion, such as Halloween,
 * of which one is in use. WLED's effects, Animations' GIFs and the Caller's and
 * Sound FX's sounds keep theirs this way.
 *
 * The list that plays stays where its runtime has always read it: `effects`,
 * `data`, `sounds`. The other sets' lists wait in `sets`, each under the same
 * name, and the set in use keeps its place there by id and name only. So a
 * config from before sets is one set, an export plays its set in use in an
 * older version, and no runtime knows anything of sets. Specs:
 * docs/superpowers/specs/2026-10-10-wled-effect-sets-design.md and
 * docs/superpowers/specs/2026-10-10-library-sets-design.md.
 *
 * Each function takes a config section and the name of its list, and returns a
 * new section without changing its input. Nothing here is imported at runtime,
 * so tsx runs it.
 */

/** The features whose lists come in sets, and the name of each one's list. */
export const LIBRARY_SET_LISTS = { wledFx: "effects", animations: "data", caller: "sounds", soundFx: "sounds" } as const;
export type SetFeature = keyof typeof LIBRARY_SET_LISTS;

/** A set: its id and name and, unless it is the set in use, its list under the section's list name. */
export type LibrarySet<K extends string, T> = { id: string; name: string } & { [P in K]?: T[] };

/** A config section whose list `K` comes in sets. */
export type SetSection<K extends string, T> = { [P in K]: T[] } & { sets?: LibrarySet<K, T>[]; activeSet?: string };

/**
 * What section `S`'s list `K` holds. Read from that one list: inferred from the
 * section as a whole, it would take every other list in it too (WLED's
 * `disabledGameModes`, say).
 */
export type LibraryItem<S, K extends PropertyKey> = K extends keyof S ? (S[K] extends readonly (infer T)[] ? T : never) : never;

/** A set as the settings show it. */
export interface LibrarySetView<T> {
  id: string;
  /** As stored: "" is the first set, shown under the default name (librarySetLabel). */
  name: string;
  /** The stored list itself, so an edit in place reaches the config: for the set in use, the section's own list. */
  items: T[];
  /** Whether it is the set in use. */
  active: boolean;
}

/** The id of the first set: the one a config from before sets is. */
export const DEFAULT_LIBRARY_SET_ID = "default";

// What the functions read and write, whatever a section's list is called.
interface AnySet { id: string; name: string; [list: string]: unknown }
interface AnySection { sets?: AnySet[]; activeSet?: string; [key: string]: unknown }
type WrittenOut = AnySection & { sets: AnySet[]; activeSet: string };

/** Every set in order. A section without sets is one: the set in use, named "". */
export function listLibrarySets<S extends SetSection<K, unknown>, K extends string>(section: S, key: K): LibrarySetView<LibraryItem<S, K>>[] {
  type T = LibraryItem<S, K>;
  const fx = normalize(section as unknown as AnySection, key);
  const playing = fx[key] as T[];
  if (!fx.sets || !fx.activeSet) return [ { id: DEFAULT_LIBRARY_SET_ID, name: "", items: playing, active: true } ];
  return fx.sets.map(set => ({
    id: set.id,
    name: set.name,
    items: set.id === fx.activeSet ? playing : (set[key] as T[] | undefined) ?? [],
    active: set.id === fx.activeSet,
  }));
}

/** What a set is called: its name, or `defaultName` for the first set until it is renamed. */
export function librarySetLabel(set: { name: string }, defaultName: string): string {
  return set.name || defaultName;
}

/** Whether a set other than `exceptId` is called `name`, trimmed and in any case. A set named "" goes by `defaultName`. */
export function librarySetNameTaken(sets: readonly { id: string; name: string }[], name: string, defaultName: string, exceptId?: string): boolean {
  const wanted = name.trim().toLocaleLowerCase();
  return sets.some(set => set.id !== exceptId && librarySetLabel(set, defaultName).trim().toLocaleLowerCase() === wanted);
}

/**
 * The shape the functions here rely on, from whatever was stored or imported:
 * - no usable set: no `sets` and no `activeSet` at all;
 * - each set with an id of its own and a name, both text;
 * - a list on every set but the one in use, whose list is the section's own;
 * - a set in use, put first when `activeSet` names none.
 *
 * A set that needs nothing comes back as the same object, its list the same
 * array, so the settings go on editing what is stored. Fields this version
 * doesn't know are kept.
 */
export function normalizeLibrarySets<S extends SetSection<K, unknown>, K extends string>(section: S, key: K): S {
  return normalize(section as unknown as AnySection, key) as unknown as S;
}

/**
 * `id` as the set in use: the list that plays goes back to its own set, and
 * `id`'s list becomes the section's. The set already in use, or an id no set
 * has, gives back `section` itself.
 */
export function activateLibrarySet<S extends SetSection<K, unknown>, K extends string>(section: S, key: K, id: string): S {
  const fx = writtenOut(section as unknown as AnySection, key);
  const target = fx.sets.find(set => set.id === id);
  if (!target || id === fx.activeSet) return section;
  const sets = fx.sets.map((set) => {
    if (set.id === fx.activeSet) return { ...set, [key]: fx[key] };
    return set.id === id ? withoutList(set, key) : set;
  });
  return { ...fx, [key]: (target[key] as unknown[] | undefined) ?? [], sets, activeSet: id } as unknown as S;
}

/** A new set at the end, holding a copy of `items`, and its id. The set in use stays in use. */
export function addLibrarySet<S extends SetSection<K, unknown>, K extends string>(section: S, key: K, name: string, items: readonly unknown[]): { section: S; id: string } {
  const fx = writtenOut(section as unknown as AnySection, key);
  const id = newSetId(new Set(fx.sets.map(set => set.id)));
  // JSON rather than structuredClone, which refuses the settings' reactive proxies.
  const set: AnySet = { id, name: name.trim(), [key]: JSON.parse(JSON.stringify(items)) };
  return { section: { ...fx, sets: [ ...fx.sets, set ] } as unknown as S, id };
}

/** `id` under `name`, trimmed. An id no set has gives back `section` itself. */
export function renameLibrarySet<S extends SetSection<K, unknown>, K extends string>(section: S, key: K, id: string, name: string): S {
  const fx = writtenOut(section as unknown as AnySection, key);
  if (!fx.sets.some(set => set.id === id)) return section;
  return { ...fx, sets: fx.sets.map(set => (set.id === id ? { ...set, name: name.trim() } : set)) } as unknown as S;
}

/**
 * Every set but `id`. Neither the set in use, whose list is what plays, nor an
 * id no set has is deleted: both give back `section` itself.
 */
export function deleteLibrarySet<S extends SetSection<K, unknown>, K extends string>(section: S, key: K, id: string): S {
  const fx = normalize(section as unknown as AnySection, key);
  if (!fx.sets || id === fx.activeSet || !fx.sets.some(set => set.id === id)) return section;
  return { ...fx, sets: fx.sets.filter(set => set.id !== id) } as unknown as S;
}

/** How many items, in every list of the section, keep their file under `fileId`. No id is no file. */
export function libraryFileUses<S extends SetSection<K, unknown>, K extends string>(section: S, key: K, fileOf: (item: LibraryItem<S, K>) => string | undefined, fileId: string | undefined): number {
  if (!fileId) return 0;
  let uses = 0;
  for (const list of lists(section as unknown as AnySection, key)) {
    for (const item of list) if (fileOf(item as LibraryItem<S, K>) === fileId) uses++;
  }
  return uses;
}

/** The files of `candidates` that no list of the section keeps any more, each once: the ones to delete. */
export function unusedLibraryFiles<S extends SetSection<K, unknown>, K extends string>(section: S, key: K, fileOf: (item: LibraryItem<S, K>) => string | undefined, candidates: readonly LibraryItem<S, K>[]): string[] {
  const kept = new Set<string>();
  for (const list of lists(section as unknown as AnySection, key)) {
    for (const item of list) {
      const id = fileOf(item as LibraryItem<S, K>);
      if (id) kept.add(id);
    }
  }
  const unused = new Set<string>();
  for (const item of candidates) {
    const id = fileOf(item);
    if (id && !kept.has(id)) unused.add(id);
  }
  return [ ...unused ];
}

function normalize(section: AnySection, key: string): AnySection {
  if (!section || typeof section !== "object") return section;
  const { sets: stored, activeSet: storedActive, ...rest } = section;
  const fx: AnySection = Array.isArray(rest[key]) ? rest : { ...rest, [key]: [] };

  const ids = new Set<string>();
  const kept: AnySet[] = [];
  for (const set of Array.isArray(stored) ? stored : []) {
    if (!set || typeof set !== "object" || typeof set.id !== "string" || !set.id || ids.has(set.id)) continue;
    ids.add(set.id);
    kept.push(set);
  }
  if (!kept.length) return fx;

  let activeSet = typeof storedActive === "string" ? storedActive : "";
  if (!activeSet) activeSet = ids.has(DEFAULT_LIBRARY_SET_ID) ? newSetId(ids) : DEFAULT_LIBRARY_SET_ID;
  const sets = kept.map(set => tidy(set, set.id === activeSet, key));
  if (!ids.has(activeSet)) sets.unshift({ id: activeSet, name: "" });
  return { ...fx, sets, activeSet };
}

/** The section with its sets written out: one without sets gets the one set it is. */
function writtenOut(section: AnySection, key: string): WrittenOut {
  const fx = normalize(section, key);
  if (fx.sets && fx.activeSet) return { ...fx, sets: fx.sets, activeSet: fx.activeSet };
  return { ...fx, sets: [ { id: DEFAULT_LIBRARY_SET_ID, name: "" } ], activeSet: DEFAULT_LIBRARY_SET_ID };
}

/** Every list of the section: the one that plays, then every other set's. */
function lists(section: AnySection, key: string): unknown[][] {
  const fx = normalize(section, key);
  const others = (fx.sets ?? []).filter(set => set.id !== fx.activeSet).map(set => (set[key] as unknown[] | undefined) ?? []);
  return [ (fx[key] as unknown[] | undefined) ?? [], ...others ];
}

/** A stored set in the shape listLibrarySets reads, and the same object when it already is. */
function tidy(set: AnySet, inUse: boolean, key: string): AnySet {
  const name = typeof set.name === "string" ? set.name : "";
  if (inUse) return name === set.name && !(key in set) ? set : withoutList({ ...set, name }, key);
  const list = Array.isArray(set[key]) ? set[key] : [];
  return name === set.name && list === set[key] ? set : { ...set, name, [key]: list };
}

function withoutList(set: AnySet, key: string): AnySet {
  const copy = { ...set };
  delete copy[key];
  return copy;
}

/** An id no set in `taken` has. Random rather than counted, so two tabs adding a set at once don't pick the same one. */
function newSetId(taken: ReadonlySet<string>): string {
  for (;;) {
    const id = `set-${Math.random().toString(36).slice(2, 10)}`;
    if (id.length > 4 && !taken.has(id)) return id;
  }
}
