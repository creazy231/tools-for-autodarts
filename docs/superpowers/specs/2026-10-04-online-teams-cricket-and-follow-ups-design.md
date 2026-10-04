# Online Teams: Cricket, and the follow-ups

Online Teams (spec `2026-10-03-online-teams-design.md`, merged to `main` on 2026-10-04) lets two teams on two boards play one autodarts online match. It was built, tested and announced for X01.

The user then asked, on 2026-10-04:

> merge back to main locally please. then I want you to continue on this online teams feature … and also add the cricket game mode the same way. do this all without me need to interact please. do everything based on your recommendations

So this spec was written without a review round. Every choice in it is a recommendation of mine, marked *(implementation choice)* where the user's words don't settle it.

## What "the same way" means for Cricket

autodarts runs the game in every mode. Tools and the room only add the team layer:
- who's up
- the order
- colours
- tap-to-correct
- own-score team legs and the team win
- the chip and the invitation

The partner rule is the one X01-only part. It needs a remaining score to compare, and Cricket has no such rule in steel-tip doubles either *(implementation choice)*.

**Checked live before this spec** with creazy (dev Chrome) and creazy_dev (Firefox), against the local server:
- a shared-score Cricket lobby and match on both screens: cells in team colours, chips, the pill
- tap-to-correct from the second account's screen, mirrored on the first
- a leg won ("TEST RED wins the leg · TOM"), with Next Leg only on the screen that owns the winning seat
- an own-score Cricket match, 2 v 2:
  - the host's Tools alternated the seats
  - the tally ran 1–0 and then "TEST RED wins the match 2 – 0" on both screens
  - Next Leg was held back
- the invitation in a Tactics lobby, and its one-tap join
- the Tactics match at 390 px in the stacked layout

**What was missing:**
- Cricket wasn't announced anywhere.
- The invitation names a Cricket lobby by the site's group title ("Cricket / Tactics", "Cricket / Taktik") instead of its game mode. The site's own card says "This game: Tactics" in every language.

**So, for Cricket:**
- **Announce it.** The README's Online Teams entry and the changelog say X01 and Cricket (Tactics included). The partner-rule bullet already says X01.
- **The invitation's game line** names a Cricket lobby by its `settings.gameMode` (`Cricket`, `Tactics`, `Hidden Cricket`), unchanged, as the site's "This game" line shows it. X01 keeps its base score, and every other mode keeps its group label.
- **Live, again, after the changes:** the Cricket matrix above, on both browsers.

Hidden Cricket can't be created with these accounts (the site answers 400 to `POST /lobbies`). It is the Cricket variant all the same, so it is covered but not tested live.

Other game modes stay as they are: not blocked in code, not announced.

## The follow-ups

### From the final review's deferred minors, and its side note on flicker

1. **No flicker after a server restart.** After a restart, the first screen back gets a room without the other account's teams. Its mirror took that as the whole truth, so the other team turned into plain seats until its owner came back. Now `withRoom` keeps, from the last mirror of the same lobby:
   - the teams and shifts of every owner who is neither a peer nor an owner in the new state
   - the rule, while the new state has none and its author isn't a peer

   An owner who is back in the room is taken from the new state, so a team removed on purpose still goes. The trust rules in `screenTeams` stay the judge of what is shown.
2. **The chip while reconnecting.** On a disconnect that socket.io will retry, the chip says *connecting*. After the first failed attempt it says *offline* until a connection holds, as the first spec's table says. Showing *connecting* again on every attempt would flap. A disconnect the server made, or our own, stays *offline*.
3. **A join that times out is asked again** after 3 s, while the page still wants that lobby's room and the socket is connected.
4. **Leaving is never rate-limited.** `room:leave` runs outside the limiter, so a socket that hit the limit can still leave.
5. **The status card names you before the room has.** The "(you)" line takes the token's name until the room knows it. The card's account list moves into a pure function, `statusAccounts`, in `utils/team-room.ts`.
6. **The invitation, on touch screens and in sets lobbies:**
   - The reason a saved team can't join ("This lobby plays own scores") is a visible line under the picks, no longer only a tooltip.
   - In a sets lobby, own-score saved teams are listed as unavailable, with a new line, "Own scores play legs, and this lobby plays sets" (`teams.online.invitation.setsLobby`, in en/de/nl). Before, they appeared in neither list. The drawer's `teams.problems.legsOnly` doesn't fit here: it tells the reader to change the lobby, which only the host can.
   - The lists come from a pure function, `inviteLists`.
7. **One mount at a time.** The chip and the invitation are created once even when the first frames ask several times, the way the drawer's `opening` guard works.
8. **`socket/` is type-checked again.** It gets its own `tsconfig.json` and a `typecheck` script (`tsc --noEmit`, with the TypeScript and Bun types it already has).
9. **The first spec's protocol table** says `{ ok, value }` for every ack, as the code does.

### Older bugs found while building Online Teams

1. **Saved own-score teams keep their bots.** `normalizeTeams` made every team's players unique, which merged an own-score team's two bots of one level into one and dropped its members. Only shared-score teams need unique names: they are the names of the people who take turns. Own-score teams keep their players as they are, empty names dropped, capped at six.
2. **A matches frame with no data** made `processWebSocketMessage` throw (`data.body` on `undefined`), twice at every match start. It now returns.
3. **Local Lobby moves players onto your board again.** It pressed the house button (`removeHostForIndex`, unlink), which the site draws on account seats you already host. "Play on my board" (`setHostForIndex`) is the 🌐. Local Lobby now presses the 🌐 on every row that has one. It still leaves another account's Online Teams seats where they are: their 🌐 is hidden, and they are skipped. The row logic moves into a pure function that a linkedom test covers.

## Out of scope

All of these were reported to the user on 2026-10-04 and stay theirs:
- checking the autodarts token on the server
- a cap on connections per IP address
- deploying `socket/`
- the store listings' data disclosure
- What's New

## Testing

- **Unit tests first, each seen failing:**
  - tsx: `withRoom` carry-over, `statusAccounts`, `inviteLists`, the invitation's game line, `normalizeTeams`, the null frame (with a stubbed WXT `storage`) and Local Lobby's rows (linkedom)
  - client tests against a spawned server: the chip while reconnecting and a retried join
  - a smoke test: leaving past the rate limit
- **Live, both browsers:**
  - Cricket, shared and own scores
  - the invitation's game line in German
  - a server restart mid-match with the other team staying dressed
  - Local Lobby pulling the other account's seat onto the host's board and leaving its team alone
  - the status card before joining
- **Checks:** `yarn compile` against the 14-error baseline, ESLint on changed files, `yarn i18n:check`, `bun run typecheck` and `bun test` in `socket/`, `yarn build` and `yarn build:firefox`.
