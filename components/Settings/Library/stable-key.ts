import { toRaw } from "vue";

/**
 * A key for a stored item that survives its moves.
 *
 * The items have no ids. With the index as key, Vue patched each row's content
 * in place on a sort or a drag instead of moving the row, so a row half-way
 * through confirming a delete could end up confirming another item. Keyed by
 * the object itself, a row moves with its item. An edit stores a new object,
 * which gets a fresh row.
 */
const keys = new WeakMap<object, number>();
let last = 0;

export function stableKey(item: object): number {
  const raw = toRaw(item);
  let key = keys.get(raw);
  if (key === undefined) {
    key = ++last;
    keys.set(raw, key);
  }
  return key;
}
