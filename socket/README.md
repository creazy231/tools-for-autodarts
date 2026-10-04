# Online Teams server

The team room for Tools for Autodarts' Online Teams: one room per autodarts
lobby, held in memory while the lobby and its match last. It shares each
account's teams (names, players, order, colours), tap-to-correct, the host's
partner rule and one-time claims between the Tools in a lobby. Darts and
scores stay with autodarts. Protocol version 1; the extension's side is
`utils/team-room.ts`.

```bash
bun install
bun run dev      # http://localhost:4455, what `yarn dev` builds talk to
bun test         # rooms.ts
bun run typecheck   # tsc, with the Bun types
```

`GET /health` answers `{"ok":true,"version":1,"rooms":n,"sockets":n}`.

A `yarn dev` build connects from play.autodarts.com to `ws://localhost:4455`,
which both browsers treat as a public site reaching into your machine (Local
Network Access). Chrome holds the connection until play.autodarts.com is allowed
to reach your device in its site settings, and Firefox refuses it while
`network.lna.blocking` is on in `about:config`. To build against another
server, set `ADT_TEAMS_SERVER` before `yarn dev`, e.g.
`ADT_TEAMS_SERVER=https://adt.tobias-thiele.de`.

## Deploying

`docker-compose.yml` is set up for Coolify: set the domain on the `socket`
service (store builds talk to `https://adt.tobias-thiele.de`), and keep
the `coolify` network and its `traefik.docker.network` label, or Traefik picks
a network at random and answers 504s.

`MAX_SOCKETS` (default 4000) caps the connections at once. Rooms are capped
too, in `LIMITS` in `rooms.ts`. There is no cap per IP address yet: behind
Traefik every client arrives from the proxy, so one would have to read the
forwarded address, and that is only safe once it's clear what the proxy (and
anything in front of it) puts there.
