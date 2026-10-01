# Glossary: the site's words, and ours

Tools speaks English, German and Dutch, in whichever language is picked on autodarts. This file is for whoever writes the German and Dutch next, a person or a model. Read it before you write a text, and add to it when you settle a word the tables don't cover.

Sections 3 and 4 were checked against play.autodarts.com on 2026-10-01.

## 1. How to use it

Before you write a German or Dutch text, ask the site whether it already says it:

```bash
yarn i18n:site "next leg"
yarn i18n:site lobby.gameSettings.
```

It prints autodarts' own English, German and Dutch for every text whose English or key contains what you typed:

```
game.nextLeg
  en  Next Leg
  de  Nächstes Leg
  nl  Volgende leg
```

**If the site has a word for it, use the site's word, even where you would have chosen another.** Players see our text next to the site's, and one button should not have two names.

- Search for one or two English words, or for a key prefix to list a whole area (`game.`, `lobby.gameSettings.`, `settings.soundEffects.`). A common word also matches the site's long rules texts, so skim for the short labels.
- A `—` in a column means the site has no text in that language. Write it yourself in the site's style, and say so in the commit message.
- To find the key of a label you can see, set `sessionStorage["autodarts.i18n.debug"] = "true"` in that tab and reload. The site then shows every label as its key.
- The site writes placeholders as `{{count}}` and plurals as `key_one` and `key_other`. Ours are `{count}` and `{ one, other }`. Take the site's words, not its syntax.
- The lookup reads the live site. It fetches the i18n chunk that `index.html` loads (`/assets/i18n-*.js`) and parses it without running it. If it stops with "No i18n chunk" or "Found no English table", the site has changed how it loads its languages: open the chunk, find the `Object.assign({"./locales/de/translation.json": …})` call that binds a table to each language, and update `scripts/site-strings.mjs`.

## 2. Tone

- **German says *du*,** lower-case in the middle of a sentence (*dein*, *dir*, *dich*). Never *Sie*.
- **Dutch says *je*** (*jouw* where the site stresses it). Never *u*.
- **Write what a German or Dutch speaker would write.** Read the English sentence first, and never translate word by word. Keep to roughly the English length. Where German runs much longer in a button, a pill or a card title, choose the shorter natural wording; a smaller font is not the fix.
- **On the site's own pages,** such as the line we add to Settings, a description is a short phrase with no full stop, as the site writes them ("Play animations during gameplay"). Inside Tools' own panels, a sentence stays a sentence.
- **Case.** No Title Case in either language. German capitalises its nouns. Dutch labels are sentence case, as the site's are: "Volgende leg", "Ongedaan maken", "Willekeurige checkout".

## 3. The site's words

When a text names a button, a setting or a darts term, it uses the site's word in that language. This is the seed list from the site's own tables, with five more darts words at the end.

| English | Site key | Deutsch | Nederlands |
|---|---|---|---|
| Next | `game.next` | Weiter | Volgende |
| Next Leg | `game.nextLeg` | Nächstes Leg | Volgende leg |
| Undo | `game.undo` | Rückgängig | Ongedaan maken |
| Board | `game.inputMethod.board` | Board | Bord |
| Boards | `tournaments.detail.boards.title` | Boards | Borden |
| Players | `lobby.players.title` | Spieler | Spelers |
| Add Player | `lobby.addPlayer.title` | Spieler hinzufügen | Speler toevoegen |
| Add Bot | `lobby.addBot.title` | Bot hinzufügen | Bot toevoegen |
| Start Game | `lobby.startGame` | Spiel starten | Spel starten |
| Match | `pages.match` | Match | Wedstrijd |
| Tournament | `pages.tournament` | Turnier | Toernooi |
| Friends | `friends.title` | Freunde | Vrienden |
| Legs, Sets | `lobby.gameSettings.matchMode.legs` / `.sets` | Legs, Sets | Legs, Sets (lower-case mid-sentence: legs, sets) |
| Bust | `game121.bust` | Bust | Bust |
| Bull-Off | `lobby.gameSettings.bullOff` | Bull-Off | Bull-off |
| Autoscoring | `lobby.autoscoring.title` | Autoscoring | Autoscoring |
| Caller | `settings.caller.title` | Caller | Caller |
| Sound effects | `settings.soundEffects.title` | Soundeffekte | Geluidseffecten |
| Dart landed | `settings.soundEffects.sounds.dartLanded` | Dart geworfen | Dart geland |
| Volume | `settings.caller.volume` | Lautstärke | Volume |
| Settings | `pages.settings` | Einstellungen | Instellingen |
| Language | `settings.general.language` | Sprache | Taal |
| System | `settings.general.system` | System | Systeem |
| Average | `botCard.average` | Durchschnitt | Gemiddelde |
| Winner | `matches.winner` | Gewinner | Winnaar |
| Reset | `statistics.filters.reset` | Zurücksetzen | Opnieuw instellen |
| Delete | `matches.delete` | Löschen | Verwijderen |
| Cancel | `common.cancel` | Abbrechen | Annuleren |
| Save | `common.save` | Speichern | Opslaan |
| Add | `lobby.players.add` | Hinzufügen | Toevoegen |
| Edit | `lobby.gameSettings.edit` | Bearbeiten | Bewerken |
| Close | `common.close` | Schließen | Sluiten |
| Done | `myDevices.credentials.done` | Fertig | Klaar |
| Local | `tournaments.create.modeLocal` | Lokal | Lokaal |
| Visit | `matchStats.breakdown.visitHistory` | Aufnahme | beurt |
| Opponent | `matchMaking.opponent` | Gegner | tegenstander |
| Throw | `inGameSettings.matchSettings.countEachThrow` | Wurf | worp |
| To throw | `game.bullOff.player.toThrow` | Ist dran | Aan de beurt |
| Score bar | `game.clippy.undoHintBody` | Punkteleiste | scorebalk |

*Visit*, *Throw* and *Score bar* are words inside longer site texts, and their keys are where to see them in use. Dutch nouns are lower case in the middle of a sentence (*beurt*, *tegenstander*, *legs*).

**German genders,** as the site's own sentences have them: *der Dart* ("einen Dart", "jeden Dart"), *das Leg*, *das Board*, *das Match*, *das Checkout* ("Zufälliges Checkout").

### Lobby settings

From `yarn i18n:site lobby.gameSettings.`. The Discord announcement names the lobby's settings with these words. First the settings, then the in and out modes, then the bull-off modes. *Legs*, *Sets* and *Bull-Off* are in the table above.

| English | Site key | Deutsch | Nederlands |
|---|---|---|---|
| Game Mode | `lobby.gameSettings.gameMode` | Spielmodus | Spelmodus |
| Base Score | `lobby.gameSettings.baseScore` | Basis-Punktestand | Beginscore |
| Target Score | `lobby.gameSettings.targetScore` | Zielpunktestand | Doelscore |
| In Mode | `lobby.gameSettings.inMode` | In-Modus | In-modus |
| Out Mode | `lobby.gameSettings.outMode` | Out-Modus | Uit-modus |
| Bull Mode | `lobby.gameSettings.bullMode` | Bull-Modus | Bull-modus |
| Max Rounds | `lobby.gameSettings.maxRounds` | Max. Runden | Max. rondes |
| First to | `lobby.gameSettings.matchMode.firstTo` | Erster bis | Eerste tot |
| Straight | `lobby.gameSettings.inOutMode.straight` | Straight | Straight |
| Double | `lobby.gameSettings.inOutMode.double` | Double | Dubbel |
| Master | `lobby.gameSettings.inOutMode.master` | Master | Master |
| Unknown | `lobby.gameSettings.inOutMode.unknown` | Unbekannt | Onbekend |
| Normal Bull Off | `lobby.gameSettings.bullOffMode.normal` | Normales Bull-Off | Normale bull-off |
| Normal | `lobby.gameSettings.bullOffMode.normalShort` | Normal | Normaal |
| PDC Bull Off | `lobby.gameSettings.bullOffMode.official` | PDC Bull-Off | PDC-bull-off |
| PDC | `lobby.gameSettings.bullOffMode.officialShort` | PDC | PDC |
| No Bull Off | `lobby.gameSettings.bullOffMode.off` | Kein Bull-Off | Geen bull-off |

*Max Players* has no label on the site. Follow its *Max. Runden* / *Max. rondes*: **Max. Spieler** / **Max. spelers** (ours).

## 4. Game modes

Modes and their groups use the site's labels (`lobby.gamePicker.games.*`, `lobby.gameTypes.*`). Only the labels are translated: the `GameMode` values in `utils/game-modes.ts` are the site's own variant names and never change.

| Mode | English | Deutsch | Nederlands |
|---|---|---|---|
| `X01` | X01 | X01 | X01 |
| `Cricket` | Cricket / Tactics | Cricket / Taktik | Cricket / Tactics |
| `CountUp` | Count Up | Count Up | Count Up |
| `ATC` | Around The Clock | Around The Clock | Around the Clock |
| `Random Checkout` | Random Checkout | Zufälliges Checkout | Willekeurige checkout |
| `RTW` | Round the World | Round the World | Round the World |
| `Segment Training` | Segment Training | Segmenttraining | Segmenttraining |
| `Bob's 27`, `121`, `Shanghai`, `Gotcha`, `Bermuda`, `Killer` | as named | as named | as named |
| `Bull-off` | Bull-off | Bull-Off | Bull-off |
| group *Practice* | Practice | Training | Oefenen |
| group *Party* | Party | Party | Party |
| our group *X01 and Cricket* | X01 and Cricket | X01 und Cricket | X01 en Cricket |
| our group *Before a match* | Before a match | Vor dem Match | Voor de wedstrijd |

## 5. Feature names

These are the names in every card, dialog heading and sentence that mentions a feature. They live in `locales/*/features.ts`. A name that works as a name stays (*Caller*, *Teams*, *WLED*); a descriptive one is translated. When a text mentions another feature, write that feature's name from this table, in the same language.

| Where | English | Deutsch | Nederlands |
|---|---|---|---|
| Tab | Lobbies | Lobbys | Lobby's |
| Tab | Matches | Matches | Wedstrijden |
| Tab | Boards | Boards | Borden |
| Tab | Sounds & Animations | Sounds & Animationen | Geluiden & animaties |
| Lobbies | Discord Webhooks | Discord-Webhooks | Discord-webhooks |
| Lobbies | Autostart | Autostart | Autostart |
| Lobbies | Recent Local Players | Letzte lokale Spieler | Recente lokale spelers |
| Lobbies | Local Lobby | Lokale Lobby | Lokale lobby |
| Lobbies | Teams | Teams | Teams |
| Lobbies | QR Code | QR-Code | QR-code |
| Matches | Colors | Farben | Kleuren |
| Matches | Takeout Notification | Takeout-Hinweis | Takeout-melding |
| Matches | Auto Next Player on Takeout | Automatisch weiter bei Takeout | Automatisch volgende bij takeout |
| Matches | Automatic Next Leg | Automatisch nächstes Leg | Automatisch volgende leg |
| Matches | Smaller Scores | Kleinere Scores | Kleinere scores |
| Matches | Streaming Mode | Streaming-Modus | Streamingmodus |
| Matches | Larger Legs/Sets | Größere Legs/Sets | Grotere legs/sets |
| Matches | Larger Player Names | Größere Spielernamen | Grotere spelersnamen |
| Matches | Larger Player Match Data | Größere Spielerdaten | Grotere spelersgegevens |
| Matches | Winner Animation | Gewinner-Animation | Winnaarsanimatie |
| Matches | Automatic Fullscreen | Automatischer Vollbildmodus | Automatisch volledig scherm |
| Matches | Darts Zoom | Darts Zoom | Darts Zoom |
| Matches | Board View | Board-Ansicht | Bordweergave |
| Matches | Board Skins | Board Skins | Board Skins |
| Matches | Quick Correction | Schnellkorrektur | Snelle correctie |
| Matches | Enhanced Scoring Display | Erweiterte Score-Anzeige | Uitgebreide scoreweergave |
| Matches | Instant Replay | Instant Replay | Instant Replay |
| Matches | Gotcha Helper | Gotcha-Helfer | Gotcha-hulp |
| Boards | External Boards | Externe Boards | Externe borden |
| Sounds | Animations | Animationen | Animaties |
| Sounds | Caller | Caller | Caller |
| Sounds | Sound FX | Sound FX | Sound FX |
| Sounds | WLED | WLED | WLED |

"Auto Next Player on Takeout" presses the site's Next, so its German and Dutch names say the site's word for Next ("Weiter", "Volgende"). The settings dialog's heading becomes "Einstellungen - …" and "Instellingen - …".

### Labels quoted in What's New

What's New (`locales/*/whatsNew.ts`) names settings and features that other panels own, and some that are gone. It writes them as below. When you convert the panel that owns one, use the same word, so a label reads the same in What's New and where the player finds it. In a sentence the label keeps its capital, as in the English, and carries no quotes.

| English | Where it is from | Deutsch | Nederlands |
|---|---|---|---|
| Delay | Instant Replay's old setting, gone | Verzögerung | Vertraging |
| Start delay | Instant Replay's setting | Startverzögerung | Startvertraging |
| Center position | Darts Zoom's old *Center* position, gone | Mittelposition | Middenpositie |
| Bottom, Top | Darts Zoom, *Position* | Unten, Oben | Onderaan, Bovenaan |
| On Board | Darts Zoom, *Position* (the panel writes "On board") | Auf dem Board | Op het bord |
| Prefer combined throws | Caller | Kombinierte Würfe bevorzugen | Gecombineerde worpen voorrang geven |
| Quiet Own Darts | the feature's name; its row on the site's sound settings reads "Only on others' turns" | Eigene Darts stummschalten | Eigen darts dempen |
| Shuffle Players | gone, the lobby has the site's Shuffle | Spieler mischen | Spelers schudden |
| Hide Menu In Match | gone | Menü im Match ausblenden | Menu in wedstrijd verbergen |
| Shuffle | the lobby's button, the site's own (`lobby.players.randomizeOrder`) | Shuffle | Volgorde willekeurig maken |
| Scoreboard | Streaming Mode's overlay | Scoreboard | scorebord |
| Classic | Streaming Mode's first scoreboard, beside Autodarts | Klassisch | Klassiek |

*Dart landed* is the site's own and is in section 3 (*Dart geworfen*, *Dart geland*). The trigger token `bulloff` stays as it is. The site's *score bar* (*Punkteleiste*, *scorebalk*) is the bar that holds the visit's darts, not a scoreboard.

## 6. Takeout

The site never says *takeout* in German or Dutch. It writes "beim Abziehen der Darts" and "nadat de darts zijn verwijderd" (`onboarding.step5.features.takeout`), and "vor dem Abziehen" and "vóór het verwijderen van de darts" (`onboarding.step5.goodToKnow.mistakes`). Descriptions follow that. Feature names keep *Takeout*, the board's own word for its status: "Takeout-Hinweis", "Takeout-melding", "Automatisch weiter bei Takeout".

## 7. Punctuation

- **Dashes.** German and Dutch keep the English's spaced em dash " — ", as the site's own German and Dutch do. Measured on 2026-10-01 over the 1601 texts `yarn i18n:site .` prints: 20 English texts have one. 19 of those 20 German texts keep " — " (one has " – "), and 17 of the 19 Dutch texts keep it (two are reworded, with a comma and a colon; the twentieth has no Dutch). Never change " — " to " – " or " - ". Where the English has a spaced hyphen, as in "Settings - Darts Zoom", the hyphen stays.
- **The en dash "–"** is only for a number range, written as the English writes it, with no spaces: `0–180`, `s1–s20`. The site has no number range in its texts, so this follows Tools' English. A trigger token such as `100-180` is what users type, and its hyphen stays.
- **Quotes.** The site rarely quotes: 3 of its English texts do, all with a straight "…". Its Dutch writes '…' (a plain apostrophe on both sides) in all 4 of its quoted texts, including all 3 where the English quotes. Its German is mixed: „…“ (U+201E opens, U+201C closes) in 2 texts and a straight "…" in 3 others. We write „…“ in German and '…' in Dutch where the English quotes something, and add no quotes where the English has none.
- **Numbers** keep their English format: `1.5 s`, `45%`. Not `1,5 s`.

## 8. What stays literal

`locales/untranslated.json` lists the text that is the same in every language and may sit in the code as it is. Only brand and product names, units, notation and format names go there. Add an entry only for text that really is identical in all three languages, say why in the commit message, and add its row here.

| Entry | Why it stays |
|---|---|
| `Tools for Autodarts` | The extension's name. |
| `Autodarts Tools` | The extension's earlier name, which the overlay's header and its Ko-fi text still use. |
| `Autodarts` | The site's name. |
| `Discord` | A brand. The site's own German and Dutch write it the same. |
| `Ko-fi` | A brand. |
| `GitHub` | A brand. |
| `WLED` | The product's name, and the name of the feature. |
| `GIF` | A file format. |
| `OK` | The same word in all three languages. The site's `game.ok` is "OK" in German and Dutch too. |
| `BETA` | The badge on Teams and Instant Replay, written the same in every language. |
| `s` | Unit: seconds. |
| `ms` | Unit: milliseconds. |
| `min` | Unit: minutes. |
| `rem` | Unit: a CSS length. |
| `px` | Unit: pixels. |
| `dB` | Unit: decibels. |
| `×` | The multiplication sign after a speed or zoom number (`1.5×`). |

What is never translated beyond this file (what users type or import, trigger tokens such as `gameshot` and `t20`, names that identify something to autodarts, the site-text lists in `utils/selectors.ts`) is in section 5 of `docs/superpowers/specs/2026-10-01-i18n-design.md`.

## 9. Dutch review

No native Dutch speaker has checked these texts yet. They are written from the site's Dutch and this glossary. Anyone who can read Dutch should go through `locales/nl/`, and fix a word here first, so the glossary and the catalogs stay in step. Then change it in `locales/nl/` wherever it occurs.
