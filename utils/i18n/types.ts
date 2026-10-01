/**
 * The shapes the catalogs in locales/ are written in.
 */

/** A message that changes with a number: "1 sound", "3 sounds". `t()` picks the form by `params.count`. */
export interface Plural {
  one: string;
  other: string;
}

/** What a catalog holds at the end of a key path. */
export type Message = string | Plural;

/** The values a message's `{name}` placeholders are filled with. */
export type Params = Record<string, string | number>;

/**
 * A catalog file for another language: every key the English file has and no
 * other, each ending in a string or a plural. `satisfies Translation<typeof en>`
 * makes a missing or extra key a type error.
 */
export type Translation<T> = {
  [K in keyof T]: T[K] extends string ? string : T[K] extends Plural ? Plural : Translation<T[K]>;
};

/** Every key path in a catalog that ends in a message, e.g. "zoom.position.title". */
export type MessagePath<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends Message ? `${Prefix}${K}` : MessagePath<T[K], `${Prefix}${K}.`>;
}[keyof T & string];
