/**
 * JSON with every object's keys in sorted order, for telling whether two
 * values hold the same data.
 *
 * chrome.storage hands an object back with its keys in alphabetical order,
 * whatever order they were written in, so a plain JSON.stringify of a value read
 * back does not match the one that was written, even when nothing changed.
 * Arrays keep their order, since there the order is data.
 */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_key, item: unknown) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return item;
    const record = item as Record<string, unknown>;
    return Object.fromEntries(Object.keys(record).sort().map(key => [ key, record[key] ]));
  });
}
