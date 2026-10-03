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
```

`GET /health` answers `{"ok":true,"version":1,"rooms":n,"sockets":n}`.

## Deploying

`docker-compose.yml` is set up for Coolify: set the domain on the `socket`
service (store builds talk to `https://adt-socket.tobias-thiele.de`), and keep
the `coolify` network and its `traefik.docker.network` label, or Traefik picks
a network at random and answers 504s.
