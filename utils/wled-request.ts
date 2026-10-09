import { type IWled, WledType } from "@/utils/storage";

/**
 * What an effect sends, and `key`: the same for the same request. *Don't
 * restart a running effect* compares keys, so the same effect with another
 * player's name in it counts as new, and two effects that send the very same
 * thing count as one.
 */
export interface WledRequest {
  url: string;
  init: RequestInit;
  key: string;
}

/** The longest segment name an ESP8266 keeps (an ESP32 keeps 64). */
const ASCII_NAME_LENGTH = 32;

/**
 * Letters written out before the marks come off the rest: the German ones the
 * way German spells them without dots, and the ones NFKD doesn't take apart.
 */
const SPELLED_OUT: Record<string, string> = {
  ä: "ae", ö: "oe", ü: "ue", Ä: "Ae", Ö: "Oe", Ü: "Ue", ß: "ss", ẞ: "SS",
  æ: "ae", Æ: "Ae", œ: "oe", Œ: "Oe", ø: "o", Ø: "O",
  ł: "l", Ł: "L", đ: "d", Đ: "D", ð: "d", Ð: "D", þ: "th", Þ: "Th", ı: "i",
};

/** `{player}` and `{player_ascii}`, the names an effect can carry. */
const PLACEHOLDER = /\{(player|player_ascii)\}/g;

/**
 * A name in what WLED's fonts draw, ASCII 32–126: "Jürgen" is "Juergen",
 * "José" is "Jose", and emoji go. Composed first, so an "ü" typed as "u" and
 * a separate diaeresis is still spelled out.
 */
export function asciiName(name: string): string {
  return name
    .normalize("NFC")
    .replace(/[äöüÄÖÜßẞæÆœŒøØłŁđĐðÐþÞı]/g, letter => SPELLED_OUT[letter])
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/ {2,}/g, " ")
    .trim()
    .slice(0, ASCII_NAME_LENGTH)
    .trimEnd();
}

/**
 * `text` with `{player}` and `{player_ascii}` filled in for `player`, each
 * value through `escape` first, as its place in the text needs it.
 */
export function fillPlaceholders(text: string, player: string, escape: (value: string) => string): string {
  return text.replace(PLACEHOLDER, (_, name: string) => escape(name === "player" ? player : asciiName(player)));
}

/** A value as it goes between a JSON string's quotes. */
function jsonString(value: string): string {
  return JSON.stringify(value).slice(1, -1);
}

/**
 * What `effect` sends, with `player` in its placeholders: in a JSON API
 * effect's JSON, escaped for a JSON string, and in a URL effect's link,
 * URI-encoded. A preset effect has none.
 */
export function wledRequest(effect: IWled, player: string): WledRequest {
  const method = effect.type === WledType.URL ? "GET" : "POST";
  let url = effect.url;
  let body: string | undefined;
  if (effect.type === WledType.PRESET) {
    url = (effect.url.startsWith("http") ? "" : "http://")
      + effect.url
      + (effect.url.endsWith("/") ? "" : "/")
      + "win/PL=" + effect.preset;
  } else if (effect.type === WledType.URL) {
    url = fillPlaceholders(effect.url, player, encodeURIComponent);
  } else if (effect.type === WledType.API) {
    body = effect.json_api && fillPlaceholders(effect.json_api, player, jsonString);
  }

  return {
    url,
    init: {
      // A browser sends a `no-cors` body as text/plain, whatever the header
      // says, and WLED reads it as JSON all the same: the /json handler it
      // ships (src/dependencies/json/AsyncJson-v6.h) doesn't look at the type,
      // from 0.13 to 16. `cors` would put a preflight in front of every effect
      // and stop the ones sent to a server that doesn't answer one.
      mode: "no-cors",
      method,
      cache: "no-cache",
      credentials: "omit",
      ...(effect.type === WledType.API && {
        headers: { "Content-Type": "application/json" },
        body,
      }),
    },
    key: `${method} ${url}\n${body ?? ""}`,
  };
}
