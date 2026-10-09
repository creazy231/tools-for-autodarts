# WLED shows whose turn it is (`next_player`, `{player}`, `{player_ascii}`)

**Date:** 2026-10-09
**Source:** a handover written in the wled-project session, for the user's 32×8 matrix (WLED 16.0.1 on an ESP32, `http://192.168.0.227`), where autodarts runs in Firefox on an Android tablet.
**Status:** designed and built without approvals, at the user's request ("Work on this without me need to interact and do whatever you wanna do based on your recommendations since I'll be afk"). The calls made are listed under *Rulings*.

## The request

On every turn change in a match:

- a player with a WLED effect on their name keeps getting it;
- any other player who isn't a bot gets **their name on the matrix**, standing still when it fits and scrolling when it doesn't;
- bots keep `bot_throw`, and a won leg or match still overrides everything.

The handover asks for:

1. a `next_player` trigger, played at the start of a turn by a player who has no effect of their own, ahead of `gameon`;
2. `{player}` and `{player_ascii}` in JSON API effects, filled in with the name of the player whose turn it is, JSON-escaped (and, optionally, in the links of URL effects, URI-encoded);
3. JSON API effects sent with `mode: "cors"` and `Content-Type: application/json`, because "WLED only applies the JSON content type";
4. *Don't restart a running effect* compared by the request rather than by the effect object;
5. the trigger hint, the API type's hint and the README;
6. tests of the placeholders, the order of precedence and *Don't restart*.

## What was found

**WLED reads a JSON body whatever its content type, so point 3 does not hold.** The handover took the check from `AsyncJson.h` of Aircoookie/ESPAsyncWebServer, whose `canHandle()` does refuse anything but `application/json`. WLED doesn't use that header: it ships its own, `wled00/src/dependencies/json/AsyncJson-v6.h`, and its `canHandle()` checks the method and the address only. It is the same in 0.13.3, 0.14.4, 0.15.3 and 16.0.1. Probed on the user's matrix with `curl -X POST /json/state` (brightness restored to 128 after each):

| Content-Type | Answer | Applied |
|---|---|---|
| `text/plain;charset=UTF-8` (what a `no-cors` fetch sends) | 200 | yes |
| none | 200 | yes |
| `application/json` | 200 | yes |
| `application/x-www-form-urlencoded` | 400 | no |
| `multipart/form-data` | 400 | no |

The web server reads the two form types as form fields, and `text/plain` only when the body starts like `name=`. A JSON body starts with `{` or `[`, so it always reaches WLED's handler. So JSON API effects reach WLED as they are sent today. A `cors` request would add a preflight to every effect, and it would stop every effect aimed at a server that doesn't answer preflights: Node-RED's default, and many home-automation hooks. The preflight itself works on WLED: `OPTIONS /json/state` answers 200 with `Access-Control-Allow-Origin`, `-Methods` and `-Headers` all `*`.

**Preset effects are POSTs without a body**, not GETs: only URL effects are fetched with GET. They work, and stay as they are.

**What *Don't restart a running effect* misses.** It compares the effect object with the last one sent. Player A starts a turn and `next_player` is sent. If nothing else is sent before player B's turn, for instance because no effect is set up on A's darts or on `gameon`, B's turn finds the same object and is skipped, and A's name stays up. In the settings, the list's play button is skipped on a second press the same way, while **Test** never is, since it builds a new object each time. A comparison by request would start skipping Test too.

**Who is up.** `turnNames(match)[0]` (utils/team-calls.ts) is the player whose turn it is. With Teams it is the player on a shared seat, worked out from the shifts, and with own scores the seat's own player. It is the team's name only when a shared seat has no player, since empty names are dropped.

**The settings have a copy of their own.** `Wled.vue` imports `setEffect` from the match's module, and the settings are a content script of their own. That copy never sees a match, so there is no turn to fill a name in from.

**What WLED draws** (from the handover, WLED 16.0.1 sources):
- *Scrolling Text* (fx 122) draws the segment's name `n`, centred and standing still when it fits the width, scrolling when it doesn't.
- `c2: 64` is an 8 px proportional font, which fits about seven letters into 32 px.
- The built-in fonts cover ASCII 32–126 only.
- A segment name is cut at 64 characters on an ESP32 and at 32 on an ESP8266.
- An empty name shows the date and time.

## Decisions

1. **`next_player` comes between the player's own effect and `gameon`.** At the start of a turn (`turns[0].throws.length === 0`) the effect is, in order:
   - `bot_throw` for a bot;
   - the effect of the first of `turnNames(match)` that has one, as now;
   - `next_player`, when an effect has that trigger;
   - `gameon`.

   A won leg or match from `gameDataProcessor` still replaces it, and so does `other` on a board that isn't listed. The choice moves out of `processGameData` into `turnStartEffect()` in `utils/wled.ts`, which needs nothing at runtime and is tested under tsx.

2. **`{player}` is whoever is up in the latest update this page's WLED acted on.** `processGameData` keeps `turnNames(match)[0]` for the rest of the module. An effect that a board event sets between two updates (`takeout`, `throw`) therefore gets the same name. It is cleared when the match is left, before `idle` is sent, and it is empty in a lobby and on a board page, where WLED gets no match.

3. **Tries from the settings use the signed-in account's name.** The list's play button and **Test** fill the placeholders with the account the autodarts token names (`tokenAccount`, utils/team-room.ts). Signed out, they use "Player" in the site's language. That is what the player would see on their own turn. Tries are sent on every press, whatever *Don't restart a running effect* says: the option is about effects that go off by themselves.

4. **Where the placeholders are filled in:**
   - JSON API effects: in the JSON body, each value escaped as the inside of a JSON string, so a quote or a backslash in a name can't break the body;
   - URL effects: in the link, URI-encoded (the handover's optional point);
   - not in a preset effect, and not in a JSON API effect's address.

   Anything else in braces is left as it is. The values go in through a replacer function, so a `$` in a name is taken literally. An effect without placeholders sends exactly what it sends today.

5. **`{player_ascii}` is the name in letters a matrix can draw**, built in this order:
   - Composed to NFC first, so an "ä" typed as "a" with a separate diaeresis is still read as "ä".
   - Letters spelled out in full: ä ae, ö oe, ü ue, Ä Ae, Ö Oe, Ü Ue, ß ss, ẞ SS. The same goes for the letters NFKD doesn't take apart: æ ae, Æ Ae, œ oe, Œ Oe, ø o, Ø O, ł l, Ł L, đ ð d, Đ Ð D, þ th, Þ Th, ı i.
   - Decomposed to NFKD, with the marks dropped (é e, ñ n, å a), compatibility forms included (ﬁ fi, full-width letters).
   - Every run of whitespace made one space. Anything outside ASCII 32–126 is dropped, and spaces are collapsed again.
   - Trimmed and cut to 32 characters, ESP8266's limit for a segment name.

6. ***Don't restart a running effect* compares the request**: method, address and body, with the placeholders filled in. The same effect for another player is sent again. Two effects that send the very same request no longer restart the lights. The request is built by `wledRequest(effect, player)` in the new `utils/wled-request.ts`, which also does the placeholders and `{player_ascii}`.

7. **The sending stays as it is**, `no-cors` for every type. A comment at the fetch records why, so it isn't "fixed" again.

8. **Settings and words:**
   - `next_player` joins WLED's trigger suggestions.
   - The URL and JSON API type hints name the two placeholders, through `<AppTrans>` with `<code>`.
   - The fallback name gets its own key.
   - All of it ships in English, German and Dutch.

9. **README and changelog:**
   - the README's WLED section gains `next_player`, a part on the player's name with the handover's matrix effect, the order a turn's effect is picked in, *Don't restart a running effect*, and a CSV line for a JSON API effect (its JSON can't hold a `;`);
   - `CHANGELOG.md` gets the feature under *Added*, and the restart rule and the play button under *Changed* and *Fixed*.

## Rulings

These are the calls made without the user, for review:

1. **Point 3 is not done.** JSON API effects stay `no-cors`, for the reasons under *What was found*. That makes the background relay moot too, and leaves Chrome's private-network preflight out of it.
2. URL effects take the placeholders as well.
3. `{player_ascii}` spells out more letters than the handover lists (ø, æ, œ, ł, đ, ð, þ, ı, ẞ), turns whitespace into single spaces, and composes to NFC first.
4. A name with nothing drawable in it (only emoji) gives an empty `{player_ascii}`, and WLED shows its clock for it. It isn't special-cased.
5. Tries from the settings use the signed-in account's name and are always sent.
6. Two effects that send the very same request no longer restart the lights. That is a change for setups with duplicate effects, and it follows the option's own description: "An effect that is already showing isn't sent again".
7. The work is committed on `feat/wled-player-name` and merged into `main` locally. Nothing is pushed.

## Not doing

- `cors` or a background relay for JSON API effects.
- Placeholders in preset effects or in a JSON API effect's address.
- Other placeholders (the score, the team, the leg). Nothing needs them yet.
- Settings for the font or the scrolling. They belong in the effect's JSON.
- Checking that a JSON effect's placeholders sit inside strings. The JSON field already refuses JSON that doesn't parse, and a placeholder outside a string doesn't.

## Parts

- New: `utils/wled-request.ts`, which builds the request, fills the placeholders and makes `{player_ascii}`.
- Changed:
  - `utils/wled.ts`: `turnStartEffect`;
  - `entrypoints/match.content/wled.ts`: the turn's player, the request key, and tries from the settings;
  - `components/Settings/Wled.vue`;
  - `utils/trigger-catalog.ts`;
  - `locales/{en,de,nl}/{triggers,wled}.ts`;
  - `README.md` and `CHANGELOG.md`.

## Testing

- **tsx:**
  - `asciiName`: umlauts, ß, decomposed input, other diacritics, the extra letters, emoji, whitespace and the 32-character cut;
  - `wledRequest` for each type: escaping of quotes, backslashes and newlines, URI-encoding, a `$` in a name, unknown braces, and effects without placeholders unchanged;
  - `turnStartEffect`: name effect before `next_player` before `gameon`, bots, disabled effects, the team's name.
- **The real `entrypoints/match.content/wled.ts`**, bundled with esbuild and driven by game-data frames, with `fetch` recorded. This covers the order of precedence in a match, wins, bots, and *Don't restart* with two players in a row and with the same player again. It runs against HEAD's file too, for red before green.
- **Hardware:**
  - the content-type probes above;
  - the matrix effect's JSON with a name, read back from `/json/state`;
  - in the dev Chrome, a try from the settings and a match's turns reaching the matrix, read back the same way.
  - The matrix's state is saved first and put back after.
- **Checks:**
  - `yarn compile` against the baseline;
  - `yarn lint`;
  - `yarn i18n:check`;
  - `yarn build` and `yarn build:firefox`;
  - the built manifests' permissions, unchanged.
