/**
 * Turning a catalog message into the text for one use: a plural's form, the
 * `{name}` placeholders, and — for plain text — the inline tags taken out.
 */

import type { Language } from "./site-language";
import type { Message, Params, Plural } from "./types";

/** Whether a catalog entry is a plural rather than a plain string. */
export function isPlural(message: unknown): message is Plural {
  return typeof message === "object" && message !== null && "one" in message && "other" in message;
}

const pluralRules = new Map<Language, Intl.PluralRules>();

/**
 * The form of a plural that fits `count`, by the language's own rules.
 * English, German and Dutch have only "one" and "other". A count that is not a
 * number takes "other".
 */
export function selectPlural(message: Plural, count: unknown, language: Language): string {
  const value = typeof count === "string" && count.trim() !== "" ? Number(count) : count;
  if (typeof value !== "number" || !Number.isFinite(value)) return message.other;

  let rules = pluralRules.get(language);
  if (!rules) pluralRules.set(language, rules = new Intl.PluralRules(language));
  return rules.select(value) === "one" ? message.one : message.other;
}

/** The text of a message for these params, a plural resolved to one form. */
export function messageText(message: Message, params: Params | undefined, language: Language): string {
  return isPlural(message) ? selectPlural(message, params?.count, language) : message;
}

/**
 * `{name}` → the value of `params.name`. A placeholder with no value stays as
 * it is written, and a value is never searched for placeholders itself, so a
 * player called "{count}" stays "{count}".
 */
export function interpolate(text: string, params?: Params): string {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : placeholder);
}

/**
 * A message as plain text: `<b>`, `<i>` and `<code>` dropped, `<br>` a line
 * break. For `t()`, whose result goes into text nodes and attributes, where a
 * tag would only show up as characters. Messages with markup are drawn with
 * <AppTrans>.
 */
export function stripMarkup(text: string): string {
  return text.replace(/<br\s*\/?>/g, "\n").replace(/<\/?(?:b|i|code)>/g, "");
}
