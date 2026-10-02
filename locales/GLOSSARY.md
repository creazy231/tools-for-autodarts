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
- **Dutch compounds** that start with *instelling* take the plural, as *instellingenbestand* and *instellingengegevens* do. *Instelling* also means an institution, so *instellingsgegevens* would read as an institution's data. The site's own compounds put *instellingen* last (*Wedstrijdinstellingen*, *Bordinstellingen*).

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
| Clear | `statistics.filters.clear` | Löschen | Wissen |
| Cancel | `common.cancel` | Abbrechen | Annuleren |
| Continue | `countrySelect.confirm` and six more buttons (`onboarding.step1.submit` …) | Weiter | Doorgaan |
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

*Clear* and *Delete* are the same word in the site's German (*Löschen*), so a text that names the clear button says *Löschen* too: "Suche löschen", "Lösche die Suche …". The site's plain *Continue* button is always *Weiter* / *Doorgaan*; *fortfahren* only appears in longer texts ("Mit Apple fortfahren", "um fortzufahren"), so a verb inside a sentence may use it.

*Bust* has no verb on the site. Its German is the noun in "… ist es ein Bust" and its Dutch the adjective in "dan ben je bust" (both `lobby.howToPlay.rules.x01`), so a trigger line says "Bei einem Spieler ist es ein Bust" and "Een speler is bust". Do not write *überworfen*, which the site never does, or *einen Bust*, since nothing there settles the noun's gender.

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
| our group *Before a match* | Before a match | Vor dem Match | Vóór de wedstrijd |

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

What's New (`locales/*/whatsNew.ts`) names settings and features that other panels own, and some that are gone. It writes them as below. When you convert the panel that owns one, use the same word, so a label reads the same in What's New and where the player finds it. In a sentence the label keeps its capital, as in the English, and carries no quotes. The exception is a label of three or more words, the site's or Tools' own: in the middle of a sentence it takes the site's quotes (German „…“, Dutch '…'), so that it isn't misparsed as part of the sentence, as in "een eigen knop 'Volgorde willekeurig maken'" (the site's) and „In dieser Lobby“ / 'In deze lobby' (Teams' own section). A label of one or two words stays unquoted ("onder Dart geland"). §7 says the same rule for every text.

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
| Shuffle | the lobby's button, the site's own (`lobby.players.randomizeOrder`) | Shuffle | Volgorde willekeurig maken (three words, so quoted in a sentence) |
| Scoreboard | Streaming Mode's overlay | Scoreboard | scorebord |
| Classic | Streaming Mode's first scoreboard, beside Autodarts | Klassisch | Klassiek |

*Dart landed* is the site's own and is in section 3 (*Dart geworfen*, *Dart geland*). The trigger token `bulloff` stays as it is. The site's *score bar* (*Punkteleiste*, *scorebalk*) is the bar that holds the visit's darts, not a scoreboard.

### Words later panels will need

Settled while the trigger hints were written (`locales/*/triggers.ts`), for the panels that name the same things. Use them as they are, so a label reads the same in a hint and where the player finds it.

| English | Where it is from | Deutsch | Nederlands |
|---|---|---|---|
| Partner rule | Teams' switch card in the lobby, beside the site's Autoscoring | Partnerregel | partnerregel (as a label, with a capital: Partnerregel) |
| your Boards list | the list of boards in WLED's settings, headed *Boards*; the trigger hint for throws on a board that is not in it says it | deiner Boards-Liste | je lijst Borden |
| Mark Ready | the tournament page's own button (`matchMaking.markReady`); the hints for a ready tournament match say it as a verb ("als bereit markiert werden", "gereed worden gemeld") | Als bereit markieren | Gereed melden |

Settled in the lobby panels (`locales/*/{discordWebhooks,autoStart,recentLocalPlayers,localLobby,qrCode}.ts`), for whatever else speaks of a lobby:

| English | Where it is from | Deutsch | Nederlands |
|---|---|---|---|
| to join (a lobby) | the site's Join button (`lobby.players.join`, `lobbies.join`: Beitreten, Deelnemen) | beitreten | deelnemen |
| the host (of a lobby) | the site's own word (`lobby.leaveLobby.description`) | Host (*mit dir als Host*) | host (*waar jij host bent*) |
| a private lobby | the site's *private* (`subscriptions.features.items.privateTournaments.name`); Dutch joins it to the noun | private Lobby | privélobby |
| the lobby's QR code | `lobby.qrShare.title` ("Lobby-QR-Code teilen", "QR-code van lobby delen") | Lobby-QR-Code | QR-code van de lobby |
| a Discord post | Discord's own word for it (the site has none): the noun is the message, the verb is *to post* | Nachricht, posten | bericht, plaatsen |
| to announce a lobby in Discord | the Discord button's tooltip, "Announce this lobby in Discord". The site's *Announce* is the Caller's spoken one (*ansagen*, *omroepen*, `settings.caller.callScoresDescription`), which a written post is not, so it follows the site's noun *Ankündigungen* / *aankondigingen* (`account.marketing.fields.autodarts.description`) | ankündigen | aankondigen |
| Sent | the button's state once the post is out. The site's own word in both languages (`friends.sections.sent`: Gesendet, Verzonden) | Gesendet | Verzonden |
| Failed | the button's state when the post did not go through. The site's German for failed is *fehlgeschlagen* (14 letters, too wide for a button in the lobby's header, `myDevices.link.wifiFailed`), so the button says *Fehler*, the site's word for an error (`appError.subtitle`). *Mislukt* is the site's own Dutch (`myDevices.link.wifiFailed`) | Fehler | Mislukt |
| NEW GAME ON AUTODARTS | the post's headline, in capitals as the English is; the site has no text for it | NEUES SPIEL AUF AUTODARTS | NIEUW SPEL OP AUTODARTS |
| Game has started! | the line the post gets once the game starts; the site's own sentence for a started tournament (`tournaments.detail.toast.alreadyStarted`) | Das Spiel hat begonnen! | Het spel is begonnen! |
| the strip of saved-player buttons under the lobby's list | not the site's; a row of buttons is a *Leiste* in German, and *strook* in Dutch, the word Darts Zoom's strip of tiles uses too | Leiste | strook |

Settled in Teams (`locales/*/teams.ts`), for whatever else names its parts:

| English | Where it is from | Deutsch | Nederlands |
|---|---|---|---|
| Add Team | Teams' button beside the site's Add Player and Add Bot (`teams.lobby.addTeam`), built like theirs | Team hinzufügen | Team toevoegen |
| Saved teams | the heading of the saved teams, in the panel and the drawer | Gespeicherte Teams | Opgeslagen teams |
| Shared score, Own scores | the drawer's two tabs; in capitals on a saved team's chip (SHARED SCORE, OWN SCORES) | Gemeinsamer Score, Eigene Scores | Gedeelde score, Eigen scores |
| to check out | a verb in the site's own texts ("Darts zum Auschecken", "Gooi … uit"); the noun stays *Checkout* (*das* in German, *de* in Dutch) | auschecken | uitgooien |
| teammate | not the site's | Teamkollege | teamgenoot |
| X wins the leg, X wins the match | the pill; the German was the extension's before the catalogs | X gewinnt das Leg, X gewinnt das Match | X wint de leg, X wint de wedstrijd |
| Bot Level N | the seat name Teams gives its bots (`botName()`), never translated. The site's own Add Bot labels a level "Bot-Level N" in German and "Botniveau N" in Dutch (`lobby.addBot.botLevel`) and names the seat with that label (a German Add Bot seated "Bot-Level 1", checked in a lobby on 2026-10-02), and the drawer's picker says "Level N" and "Niveau N", as `botCard.level` does. Teams matches its bots by level (`cpuPPR`), not by name, so a bot the site named "Bot-Level 3" beside one Teams named "Bot Level 3" splits nothing, and the seat name stays as saved teams have it | Bot Level N (stays) | Bot Level N (stays) |

Settled in the small match features (`locales/*/{takeoutNotification,nextPlayerOnTakeoutStuck,automaticNextLeg,smallerScores,largerLegsSets,largerPlayerNames,largerPlayerMatchData,winnerAnimation,automaticFullscreen,enhancedScoringDisplay,gotcha}.ts`), for whatever else speaks of the match screen:

| English | Where it is from | Deutsch | Nederlands |
|---|---|---|---|
| the match screen, the match page | the site's *Match* and *Wedstrijd* (`pages.match`); What's New already says *Match-Bildschirm* and *wedstrijdscherm* for the screen | Match-Bildschirm, Match-Seite | wedstrijdscherm, wedstrijdpagina |
| the oche | the darts word for the throwing line; the site has no text for it. German players say *Oche* too, and in darts usage it is neuter: *das Oche*, "am Oche", "vom Oche aus". Dutch has the plain *werplijn*, which needs no explaining (a Dutch reader may prefer *oche*: § 9) | das Oche | werplijn |
| layout | not the site's | Layout | lay-out (the Woordenlijst's spelling) |
| sidebar | the site's own (`a11y.toggleSidebar`) | Seitenleiste | zijbalk |
| font size | not the site's | Schriftgröße | lettergrootte |
| a player's card | not the site's; the box that holds a player's name and score | Spielerkarte | spelerskaart |
| fullscreen | not the site's. The feature's name says *Vollbildmodus* and *volledig scherm*, and a sentence does too | Vollbildmodus | volledig scherm |
| leg average, match average | the site's own (`inGameSettings.matchSettings.showLegAverage`, `.showMatchAverage`) | Leg-Durchschnitt, Match-Durchschnitt | leggemiddelde, wedstrijdgemiddelde |
| a nine-darter, Perfect Leg | darts jargon, not the site's. The number takes a hyphen in front of *Darter* / *darter*; the caption over the winning card is set in capitals by CSS | 9-Darter, Perfektes Leg | 9-darter, Perfecte leg |
| Countdown | one word in both: the Discord Webhooks panel and the two Next features write it the same | Countdown | Countdown (*countdown* in a sentence) |
| to press Next | the site's Next as a label of one word, unquoted: "Drückt für dich Weiter", "Drukt voor je op Volgende" | Weiter drücken | op Volgende drukken |

A card's description sits in a column two thirds of the card's width, in a card of fixed height, so on a phone a long German or Dutch sentence cuts off the toggle under it. Aim for about the English length: the Auto Next Player card's "if takeout stucks" sentence was written as "wenn das Abziehen … hängt" and "als de darts … niet zijn verwijderd", and its "automatically" left out, since the card's name says it.

Settled in Darts Zoom, Board View, Board Skins and Quick Correction (`locales/*/{zoom,boardView,boardSkins,quickCorrection}.ts`), for whatever else speaks of the board and its pictures:

| English | Where it is from | Deutsch | Nederlands |
|---|---|---|---|
| the drawn board | the board autodarts draws itself, as against a camera's picture | das gezeichnete Board | het getekende bord |
| the view | what the board shows: camera 1, 2, 3 or the drawn board | Ansicht | weergave |
| the camera button | the site's button that cycles the view; it has no text of its own, so Tools names it | Kamera-Button | cameraknop |
| a close-up | Darts Zoom's tile of where a dart landed; not the site's | Nahaufnahme | close-up |
| skin | the design Board Skins puts on the drawn board; the feature's name keeps the English word, and so does the picker's heading | Skin (*der*) | skin |
| the skins | Default, Classic, qwellcode, Opal, Marble, Sorbet. qwellcode is a brand and stays. Classic is the site's own *klassisch* / *klassiek* (`userMenu.switchToV1.title`) | Standard, Klassisch, qwellcode, Opal, Marmor, Sorbet | Standaard, Klassiek, qwellcode, Opaal, Marmer, Sorbet |
| number pad | the keyboard's number block, which Quick Correction reads. Not the site's on-screen *Keypad* (`inGameSettings.scoreEntry.keypad`: *Zifferntastatur*, *Toetsenblok*) | Ziffernblock | numeriek toetsenblok |
| to correct a dart | the site's own verb (`game.clippy.undoHintBody`), and its words for a dart read wrong (`subscriptions.features.items.referee.description`) | korrigieren, falsch erkannt | corrigeren, verkeerd herkend |
| to stand aside | one feature keeping out of another's way, as Board View does while Board Skins is on; not the site's | sich heraushalten | zich afzijdig houden |

Settled in Colors (`locales/*/colors.ts`), for whatever else names a colour pair or a part of what Colors paints. The words a suggested team name is made of (`teams.colourWords`: ROT, BLAU) are a different list and stay as Teams has them.

| English | Where it is from | Deutsch | Nederlands |
|---|---|---|---|
| the card pairs | the names under the player card's colour buttons; not the site's. A button is 64 px wide and cuts a longer name off (the widest, Dutch *Standaard*, is 60 px in bold at 12 px), so the names stay short | Blaubeere, Ozean, Limette, Petrol, Orange, Karmin, Gold, Schiefer, qwellcode | Bosbes, Oceaan, Limoen, Petrol, Oranje, Karmijn, Goud, Leisteen, qwellcode |
| the page pairs | the names under the background's colour buttons, on the same terms | Royal, Wald, Petrol, Wein, Pflaume, Glut, Graphit, qwellcode | Royaal, Bos, Petrol, Wijn, Pruim, Gloed, Grafiet, qwellcode |
| Default (a pair) | as Board Skins' Default | Standard | Standaard |
| Custom (a pair of your own) | not the site's: its *Custom Darts* is *Personalisierte Darts* / *Aangepaste darts*, too long for the label under the two pickers. *Own* is the site's (*Eigene Turniere*, *Eigen toernooien*) | Eigene | Eigen |
| Top left, Bottom right | the two ends of a pair, as the pickers' tooltips name them; not the site's | Oben links, Unten rechts | Linksboven, Rechtsonder |
| the throw bar | the site's *score bar* (section 3): the bar that holds the visit's darts | Punkteleiste | scorebalk |
| the bottom bar | not the site's: the bar along the foot of the match screen with undo and Next. A bar is a *Leiste* and a *balk*, as in Darts Zoom's *Position der Leiste* | untere Leiste | balk onderaan |
| the home page | the site's *Home* (`pages.home`); its *Zurück zur Startseite* and *Terug naar home* say the page too | Startseite | homepage |
| autodarts' mark | the faint logo on the page behind the match | Logo | logo |
| the sample match screen | it imitates the site, so a player and a bot's seat are named as the site names them (*You* is not a site text; `lobby.addBot.botLevel` is *Bot-Level N*, *Botniveau N*), and the averages read *Leg* and *Match* (`matchStats.breakdown.leg`, `pages.match`) | Du, Bot-Level 3, Leg, Match | Jij, Botniveau 3, Leg, Wedstrijd |

Settled in Streaming Mode (`locales/*/streamingMode.ts`), for whatever else names the overlay or what it draws. The words the overlay prints about the game are the site's: the race is its lobby pill, the games are the short names of its statistics page where it has one and its game picker's names for the rest, and the short word for average is the one its own tables use.

| English | Where it is from | Deutsch | Nederlands |
|---|---|---|---|
| the overlay | not the site's: the broadcast screen Streaming Mode puts over the match, which a streaming programme captures | Overlay | overlay (*de overlay*) |
| chroma key | not the site's: the streamer's word for the flat colour their software removes. German hyphenates the compound (*Chroma-Key-Farbe*); Dutch writes it solid (*chromakeykleur*), and in a pair keeps the hyphen on the first (*chromakey- of afbeeldingsachtergrond*) | Chroma-Key | chromakey |
| the stream icon | not the site's: the overlay's switch in the match header | Stream-Symbol | streampictogram |
| the match header | not the site's: the bar along the top of the match screen, with Exit on the left and the icons on the right | Kopfzeile des Matches | koptekst van het wedstrijdscherm |
| the footer | not the site's: the line along the bottom of the overlay | Fußzeile | voettekst |
| First to 3 Legs, First to 3 Sets | the site's lobby pill: *First to* (`lobby.gameSettings.matchMode.firstTo`) and the count (`legsLabel_one` and `_other`, `setsLabel_one` and `_other`), so a count of one is singular | Erster bis 3 Legs, Erster bis 1 Leg | Eerste tot 3 legs, Eerste tot 1 leg |
| a game's name in the title | the site's short name where its statistics page has one (`statistics.overviewPage.modes.*`: X01, Cricket, Count Up, Random Checkout, Bob's 27, Killer), because the Autodarts scoreboard's title cell truncates and the picker's *Cricket / Taktik* and *Cricket / Tactics* do not fit it. Every other game keeps the game picker's name (§ 4), and English is the variant as sent | Cricket, Random Checkout | Cricket, Willekeurige checkout |
| Avg | the short word for average, as the site's own tables write it (`advancedStatistics.activity.avg`, `tournaments.status.avgMin`). The Autodarts scoreboard sets it in capitals | Ø | Gem. |
| Board Scale, Score Scale | not the site's: the two sliders behind the gear in the overlay's footer, which size the board and the scoreboard; the label says the percent of the slider's range | Board-Größe, Scoreboard-Größe | Bordgrootte, Scorebordgrootte |
| Drawn board (an option) | as in Darts Zoom, but a button label: German keeps the adjective alone, since *Gezeichnetes Board* made the option group wider than a 320 px window | Gezeichnet | Getekend bord |
| Volume (the sliders' spoken name) | a mistake in the English, which both sliders' thumbs have said from the start and which is kept until it is fixed on its own; the site's *Volume* is `settings.caller.volume` | Lautstärke | Volume |

Settled in Instant Replay (`locales/*/instantReplay.ts`), for whatever else speaks of the replay, its webcam or the dart that wins a leg. *Start delay* is in the What's New table above (Startverzögerung, Startvertraging), and the panel's row and its number field are written the same.

| English | Where it is from | Deutsch | Nederlands |
|---|---|---|---|
| the gameshot (the dart that wins the leg) | the site's *game shot* (`referee-dialog.checking-gameshot`, "is verifying game shot"), the only text in which the site names it. The caller's and the trigger's `gameshot` is a token and is never translated. A German player may know it as *Gameshot*, which is also the word the trigger token spells; the site's own German is *Spielwurf* | Spielwurf | game shot (two words, as the site writes it) |
| the winning dart | not the site's: the dart that wins the leg, where a sentence says so rather than a label | der entscheidende Dart | de winnende dart |
| Replay | the badge over the replay and the section's heading. The site has no replay text (`yarn i18n:site replay` finds only *needsMorePlayers*), and the feature's name stays Instant Replay in every language, so the badge keeps the word | Replay | Replay |
| webcam | not the site's: the camera of the player's computer, as against the board's cameras, which the site writes *Kamera* and *camera* | Webcam | webcam |
| camera access | the site's own (`lens.cameraPermissionDenied.title`, "Kamera-Zugriff erforderlich", "Cameratoegang is vereist") | Kamerazugriff | cameratoegang |
| Allow camera (a button) | the site's `permissions.camera.rationale.title` is *Kamerazugriff erlauben* and *Camera toestaan*. The German button drops *zugriff* (the button is 159 px at 15 px, against 207 px for the long form, and 187 px for the English), the Dutch is the site's words as they are | Kamera erlauben | Camera toestaan |
| Try again (the alert's button) | the site's `appError.tryAgain` is *Erneut versuchen* and *Opnieuw proberen*, 110 and 115 px at 13 px against the English 57. The button sits in a slot that does not shrink, beside the message, so a long label leaves the message 93 px at a 390 px window, and a word such as *Kamerazugriff* then runs under the button at 375 px. The button says one word | Nochmal | Opnieuw |
| Preview | the site's own (`lobby.autoscoring.preview`) | Vorschau | Voorbeeld |
| Framing | not the site's: the zoom and the two pan sliders, which cut the picture | Bildausschnitt | uitsnede |
| Covers | not the site's: what the replay is laid over, the board or the whole page | Abdeckung | bedekking |
| celebration | autodarts' own moment after a won leg, when the card lights up | Siegesfeier | viering |
| the pan words | beside a slider, in a box that is 80 px wide and holds the longest English value, "100% down", in 79 px. *links*, *oben* and *Mitte* fit as well. *rechts*, *unten*, *boven* and *onder* are over by 2 to 6 px at 100%, which the box lets run on one line. *omhoog* and *omlaag* would be over by 11 to 18, so Dutch says where the picture sits | links, rechts, oben, unten, Mitte | links, rechts, boven, onder, midden |

Settled in External Boards (`locales/*/externalBoards.ts`), for whatever else names a saved board or what is done with it. The two placeholders are the site's own words, and *Follow* is the site's verb without its noun, since the card already names the board.

| English | Where it is from | Deutsch | Nederlands |
|---|---|---|---|
| Follow (a saved board's button) | the site's `myDevices.board.follow`, "Board folgen" and "Bord volgen", without the noun | Folgen | Volgen |
| Board name (the placeholder) | the site's own (`myDevices.registration.namePlaceholder`) | Board-Name | Naam van bord |
| Board ID or link (the placeholder) | the site's *Board-ID* and *Bord-ID* (`myDevices.credentials.boardId`) and its *Link* (`lobby.qrShare.copied`; a Dutch noun is lower case mid-sentence) | Board-ID oder Link | Bord-ID of link |
| to forget a board | not the site's: taking it out of Tools' list, the trash button's tooltip. The word Saved Players already uses for "drops the rest for good" (*vergisst*, *vergeet*) | vergessen | vergeten |
| Unnamed board | not the site's: what a board saved without a name is called in the list, and never stored | Unbenanntes Board | Naamloos bord |
| to paste | Tools' own (`settings.importMenu.paste`: "Aus der Zwischenablage einfügen", "Vanaf klembord plakken") | einfügen | plakken |
| a board link | not the site's: the link that is shared to follow a board. German hyphenates the compound as the site does *Board-ID*; Dutch writes it solid | Board-Link | bordlink |
| already in the list | the site's own *bereits* and *al* (`errorPage.lobby.description`, `account.email.errors.emailInUse`) | bereits in der Liste | al in de lijst |

The error line sits beside the shared Add button, and *Hinzufügen* and *Toevoegen* (73 and 71 px at 13 px bold, against 25 for *Add*) leave less room for it than the English has. The button keeps its width (`shrink-0`, the one class the boards page gained) and the line wraps in what is left. The two errors are worded about as long as the English ones (141 and 168 px at 12 px; German 158 and 177, Dutch 151 and 143). On a 375 px phone a card is 263 px inside its padding (the site's page column pads 32 px a side, the card 24), and there the German errors take two lines and the English and Dutch ones one; at 390 px only the German duplicate error wraps. The card's sentence is the imperative in both languages (*Speichere … um ihnen einfach zu folgen*, *Bewaar … en volg ze makkelijk*) because the third-person *Speichert … damit du ihnen einfach folgen kannst* is 14% longer than the English (473 px against 414 at 16 px) and takes a third line where the English takes two, in a column of 190 px at 14 px and of 230 px at 16 px.

Settled in Animations (`locales/*/animations.ts`, and the four shared words of the library panels in `locales/*/library.ts`), for whatever else speaks of a GIF, a list's menu or how long something stays up. The site plays animations (*Animationen abspielen*, *Animaties afspelen*), so a GIF *plays* here too; and it deletes *dauerhaft* and *definitief* and says "This can't be undone" itself (*Dies kann nicht rückgängig gemacht werden*, *Dit kan niet ongedaan worden gemaakt*).

| English | Where it is from | Deutsch | Nederlands |
|---|---|---|---|
| Show for (the option, and the chip on a tile) | not the site's: how long an animation stays up. The chip and its tooltip read "Anzeigedauer: 2.37 s" and "Duur: 2.37 s", since a chip's label can only end in the number. Zoom's *Hold for* is *Haltedauer* and *Duur* | Anzeigedauer | Duur |
| Start delay, Covers, Board only, Full page | Instant Replay's words for the same rows | Startverzögerung, Abdeckung, Nur Board, Ganze Seite | Startvertraging, Bedekking, Alleen bord, Hele pagina |
| Fit, Cover, Contain | not the site's: how a GIF fills its space (CSS `object-fit`). *Cover* fills it and may crop, *Contain* shows all of it | Skalierung, Ausfüllen, Einpassen | Schaling, Vullen, Inpassen |
| Other (the filter pill for triggers that are no event) | the site's own (`subscriptions.cancellation.reason.options.other`) | Sonstiges | Anders |
| a GIF, GIFs | a format name, never translated. German keeps *GIFs*; Dutch writes the plural of an abbreviation with an apostrophe | GIF, GIFs | GIF, GIF's (*de GIF*) |
| an animation (the noun) | the feature's word, as a noun in a sentence or a label: *Animation löschen* (German capitalises it), *animatie verwijderen* (lower case, as it stands where an item's name does: *180 verwijderen*) | Animation | animatie |
| Add from a link | as the sound dialogs' *Sound von einem Link hinzufügen* and *Geluid toevoegen via een link* | Von einem Link hinzufügen | Toevoegen via een link |
| Use the GIF's length | the button that reads how long one run of a GIF takes | GIF-Länge nutzen | GIF-lengte gebruiken |
| Add animation (the dialog's button) | shortened to the shared *Hinzufügen* and *Toevoegen*, as the sound dialogs' *Add sound* is: next to *Abbrechen* the long form is 323 px against the 310 px a 390 px phone leaves | Hinzufügen | Toevoegen |
| More actions, More, Delete all…, Delete all | the three-dot menu of a list and its confirm button, shared by the four library panels (`library.moreActions` and the rest); Recent Local Players says the same | Weitere Aktionen, Mehr, Alle löschen…, Alle löschen | Meer acties, Meer, Alles verwijderen…, Alles verwijderen |

The alt of a tile and its switch fill the triggers into "Animation on …": German *bei* takes the dative, so an animation with no trigger is *Animation bei keinem Trigger*, and Dutch *bij* takes *geen trigger*. A trigger that animations have no event for is *Animationen kennen diesen Trigger nicht* and *Animaties kennen deze trigger niet*. The hint under the Show for field names the option through a placeholder (`{option}`), so it can never differ from the row's title.

A card's description sits in a column of two thirds of a fixed-height card, so the German and Dutch cards are written no longer than the English in lines, at 14, 15 and 16 px in columns of 150 to 290 px (the German drops *special* and lists the events in the singular). The footers of the dialogs fit a 390 px phone (310 px of content): *Abbrechen* and *Hinzufügen* take 247 px, *Annuleren* and *Alles verwijderen* in the Delete all dialog 283 px, against 280 px on a 360 px phone.

Settled in the Caller (`locales/*/caller.ts`, and the words the Caller and Sound FX share in `locales/*/library.ts` under `sounds`), for whatever else speaks of calling a score, a caller set or a sound. The site's in-game caller settings call a score *ansagen* and *afroepen* (`inGameSettings.callerSettings.callCheckout` is the very English *Call checkout*: *Checkout ansagen*, *Checkout afroepen*), and name the Caller's parts with a hyphen and the capital (*Caller-Stimme*, *Caller-stem*, *Caller-Einstellungen*, *Caller-instellingen*). The site's account settings say *omroepen* for the same Dutch verb (`settings.caller.callScores`); the Caller is an in-game feature, so the in-game *afroepen* wins here, as What's New and the trigger hints already have it.

| English | Where it is from | Deutsch | Nederlands |
|---|---|---|---|
| Call every dart, Call checkout | the second is the site's own row; the first uses its verb | Jeden Dart ansagen, Checkout ansagen | Elke dart afroepen, Checkout afroepen |
| a caller set | not the site's: a ready-made set of voice recordings. Written as the site writes *Caller-Stimme* | Caller-Set | Caller-set |
| the Caller's sounds | the same pattern: *Caller-Sounds*, *Caller-geluiden* | Caller-Sounds | Caller-geluiden |
| a sound | the sound dialogs' noun (`library.soundDialog`): *der Sound*, *het geluid*. A default name is written once, when the sound is made, and never changed after | Sound (Unbenannter Sound) | geluid (Naamloos geluid) |
| recordings | German says *Sprachaufnahmen*, because *Aufnahme* is a visit on the site (§ 3) and one sentence must not use it for both | Sprachaufnahmen | opnamen |
| text to speech | as the sound dialogs say it: *Text-to-Speech* (hyphenated in a compound: *Text-to-Speech-Stimmen*) and *tekst-naar-spraak* | Text-to-Speech | tekst-naar-spraak |
| female, male (a set's voice) | the words in the select's labels, "NL - Laura (weiblich)" | weiblich, männlich | vrouw, man |
| Import (a set) | the dialog's button and its heading, beside the shared Cancel | Importieren | Importeren |

The card's sentence is the infinitive in both languages, as the English is an imperative (*… ansagen*, *… afroepen*). The Dutch says *eigen geluiden* where the English says *customizable sound effects*, because *aanpasbare geluidseffecten* takes a line more than the English in a column of 230 px at 14 px; the German card is never longer in lines than the English at 14, 15 and 16 px in columns of 150 to 290 px. The import dialog's footer fits a 390 px phone (310 px of content) and a 360 px one (280): *Abbrechen* and *Importieren* take 248 px, *Annuleren* and *Importeren* 240 px. A search in the sound list finds a sound by the name the list shows, so it also finds *Unbenannter Sound* or *Naamloos geluid* by those words.

Settled in Sound FX (`locales/*/soundFx.ts`, and `library.sounds` for what it shares with the Caller), for whatever else speaks of sound effects. The site's own word for them (`settings.soundEffects.title`) is *Soundeffekte* and *geluidseffecten*, and the site *plays* them (`settings.soundEffects.enabled`: *Soundeffekte abspielen*, *Geluidseffecten afspelen*), so the card, the audio notice and the "all deleted" toast say those words, while the feature's own name stays *Sound FX* in every sentence that names it.

| English | Where it is from | Deutsch | Nederlands |
|---|---|---|---|
| sound effects | the site's own (`settings.soundEffects.title`) | Soundeffekte | geluidseffecten |
| the Caller's (triggers) | the intro tells you to start Sound FX's triggers with `ambient_` (the message holds it as `<code>{prefix}</code>`, so leave the placeholder alone) to keep them apart from the Caller's. The feature's name, in the possessive each language forms: the genitive in German, *die van* in Dutch (the Caller's parts are otherwise compounds: *Caller-Sounds*, *Caller-geluiden*) | denen des Callers | die van de Caller |
| lobby and tournament sounds | one compound each, with the first half's hyphen left hanging | Lobby- und Turniersounds | lobby- en toernooigeluiden |
| a configuration | the site's own (`account.removeAccount.loseItems.boards`: *Konfigurationen*, *Configuraties*) | Konfiguration | configuratie |
| a groan on a bust, a crowd on a 180 | the intro's two sample sounds; not the site's. The site's *ist es ein Bust* (`lobby.howToPlay.rules.x01`) makes *Bust* masculine or neuter, so the dative *bei einem Bust* is safe (*ein* has one dative for both) while the accusative stays unsettled (§ 3); a 180 is feminine, as in Animations (*eine 180*) | ein Stöhnen bei einem Bust, Publikumsjubel bei einer 180 | een kreun bij een bust, gejuich bij een 180 |

The card's sentence is the infinitive in both languages, as the Caller's is (*Soundeffekte … abspielen*, the site's own phrase, and *Geluidseffecten afspelen …*). Both list the three examples without *special events like* (*Soundeffekte bei 180, Checkout oder Matchgewinn abspielen*, *Geluidseffecten afspelen bij een 180, checkout of gewonnen wedstrijd*), because the full forms (*Soundeffekte bei Ereignissen wie einer 180, einem Checkout oder einem gewonnenen Match abspielen*, *Geluidseffecten afspelen bij bijzondere momenten zoals een 180, een checkout of een gewonnen wedstrijd*) take one to three lines more than the English in columns of 150 to 290 px, and the short ones are never longer in lines than the English at 14, 15 and 16 px. *Options* is the Caller's and Animations' word (*Optionen*, *Opties*), and the sentence *Jeder Sound wird bei den Triggern abgespielt, die du ihm gibst* (*Elk geluid wordt afgespeeld bij de triggers die je eraan geeft*) is the Caller's intro's, word for word.

## 6. Takeout

The site never says *takeout* in German or Dutch. It writes "beim Abziehen der Darts" and "nadat de darts zijn verwijderd" (`onboarding.step5.features.takeout`), and "vor dem Abziehen" and "vóór het verwijderen van de darts" (`onboarding.step5.goodToKnow.mistakes`). Descriptions follow that. Feature names keep *Takeout*, the board's own word for its status: "Takeout-Hinweis", "Takeout-melding", "Automatisch weiter bei Takeout".

## 7. Punctuation

- **Dashes.** German and Dutch keep the English's spaced em dash " — ", as the site's own German and Dutch do. Measured on 2026-10-01 over the 1601 texts `yarn i18n:site .` prints: 20 English texts have one. 19 of those 20 German texts keep " — " (one has " – "), and 17 of the 19 Dutch texts keep it (two are reworded, with a comma and a colon; the twentieth has no Dutch). Never change " — " to " – " or " - ". Where the English has a spaced hyphen, as in "Settings - Darts Zoom", the hyphen stays.
- **The en dash "–"** is only for a number range, written as the English writes it, with no spaces: `0–180`, `s1–s20`. The site has no number range in its texts, so this follows Tools' English. A trigger token such as `100-180` is what users type, and its hyphen stays.
- **Quotes.** The site rarely quotes: 3 of its English texts do, all with a straight "…". Its Dutch writes '…' (a plain apostrophe on both sides) in all 4 of its quoted texts, including all 3 where the English quotes. Its German is mixed: „…“ (U+201E opens, U+201C closes) in 2 texts and a straight "…" in 3 others. We write „…“ in German and '…' in Dutch where the English quotes something. Where the English has no quotes, a label of three or more words in the middle of a sentence takes them too, whether it is the site's label or Tools' own („In dieser Lobby“, 'In deze lobby', 'Volgorde willekeurig maken'), so that it isn't misparsed as part of the sentence. A label of one or two words stays unquoted.
- **Numbers** keep their English format: `1.5 s`, `45%`. Not `1,5 s`.

## 8. What stays literal

`locales/untranslated.json` lists the text that may stay as the English has it: in the code, and in a German or Dutch catalog, where `yarn i18n:check` otherwise reports a sentence of three words or more that is still the English. Only brand and product names, units, notation, format names and the names of games go there, and a game only when the site leaves its name untranslated in German, in Dutch or in both. Add an entry only for text that needs no translation in the language that keeps it (a name, a unit, a notation, a name the site leaves as it is), say why in the commit message, and add its row here.

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
| `MISS` | Notation: the label on Quick Correction's grid for a dart that missed the board, and the value the correction sends to autodarts. A label that is also a value cannot be translated. |
| `BULL` | Notation: the label on Quick Correction's grid for the bull, and the value the correction sends to autodarts, as `MISS` is. |
| `Around The Clock` | The game's name, which the site's German leaves in English (`lobby.gamePicker.games.atc`). Its Dutch is "Around the Clock", so only the German is identical. |
| `Round the World` | The game's name, which the site's German and Dutch both leave in English (`lobby.gamePicker.games.rtw`). |
| `Edit Channel › Integrations › Webhooks` | Where Discord makes a webhook, as Discord's own menus read, and how the Discord Webhooks panel names it in every language (`discordWebhooks.panel.url.path`). |

What is never translated beyond this file (what users type or import, trigger tokens such as `gameshot` and `t20`, names that identify something to autodarts, the site-text lists in `utils/selectors.ts`) is in section 5 of `docs/superpowers/specs/2026-10-01-i18n-design.md`.

## 9. Dutch review

No native Dutch speaker has checked these texts yet. They are written from the site's Dutch and this glossary. Anyone who can read Dutch should go through `locales/nl/`, and fix a word here first, so the glossary and the catalogs stay in step. Then change it in `locales/nl/` wherever it occurs.
