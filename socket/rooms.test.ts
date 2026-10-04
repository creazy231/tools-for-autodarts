import { describe, expect, test } from "bun:test";

import { CLAIM_TTL_MS, LIMITS, ROOM_IDLE_MS, ROOM_MAX_MS, Rooms, parsePeer, parseTeams } from "./rooms";

const LOBBY = "01a10312-5fd9-7b43-88ab-73ac80cb938e";
const A = { userId: "5e1f2afd-6ac0-4fb0-b98a-cb9cf2811917", name: "creazy" };
const B = { userId: "39a06afc-edfd-4a82-b1af-5155a475fa37", name: "creazy_dev" };
const SEAT_RED = "01a10312-0000-7000-8000-000000000001";
const SEAT_BLUE = "01a10312-0000-7000-8000-000000000002";
const crimson = { preset: "crimson", from: "#6a1624", to: "#b8323f" };
const ocean = { preset: "ocean", from: "#374c98", to: "#0b55df" };
const red = { name: "TEAM RED", colour: crimson, format: "shared", seatIds: [ SEAT_RED ], players: [ "ANNA", "TOM" ] };
const blue = { name: "TEAM BLUE", colour: ocean, format: "shared", seatIds: [ SEAT_BLUE ], players: [ "LISA", "MAX" ] };

const lobby = (i: number) => `${String(i).padStart(8, "0")}-1111-4000-8000-000000000000`;
const user = (i: number) => ({ userId: `${String(i).padStart(8, "0")}-2222-4000-8000-000000000000`, name: `p${i}` });

function setup() {
  let now = 1_000_000;
  return { rooms: new Rooms(() => now), tick: (ms: number) => { now += ms; } };
}

function value<T>(result: { ok: true; value: T } | { ok: false; error: string }): T {
  if (!result.ok) throw new Error(`expected ok, got ${result.error}`);
  return result.value;
}

describe("join", () => {
  test("lists each account once, however many sockets it has", () => {
    const { rooms } = setup();
    value(rooms.join(LOBBY, "a1", A));
    value(rooms.join(LOBBY, "a2", A));
    const state = value(rooms.join(LOBBY, "b1", B));
    expect(state.peers.map(peer => peer.name)).toEqual([ "creazy", "creazy_dev" ]);
  });

  test("refuses a lobby id that isn't a UUID", () => {
    expect(setup().rooms.join("nope", "a1", A)).toEqual({ ok: false, error: "lobby" });
  });

  test("caps the rooms per socket and the accounts per room", () => {
    const { rooms } = setup();
    for (let i = 0; i < LIMITS.roomsPerSocket; i++) value(rooms.join(lobby(i), "a1", A));
    expect(rooms.join(lobby(99), "a1", A)).toEqual({ ok: false, error: "rooms" });
    for (let i = 0; i < LIMITS.peersPerRoom; i++) value(rooms.join(LOBBY, `s${i}`, user(i)));
    expect(rooms.join(LOBBY, "late", user(99))).toEqual({ ok: false, error: "full" });
    // An account already in the room still gets in on another socket.
    value(rooms.join(LOBBY, "s0-again", user(0)));
  });

  test("caps the rooms there are at once", () => {
    const { rooms } = setup();
    for (let i = 0; i < LIMITS.rooms; i++) value(rooms.join(lobby(i), `s${i}`, A));
    expect(rooms.join(lobby(LIMITS.rooms), "late", A)).toEqual({ ok: false, error: "busy" });
    // A room that is already there still takes a socket.
    value(rooms.join(lobby(0), "another", B));
  });

  test("caps the sockets in a room, one account's included", () => {
    const { rooms } = setup();
    for (let i = 0; i < LIMITS.socketsPerRoom; i++) value(rooms.join(LOBBY, `a${i}`, A));
    expect(rooms.join(LOBBY, "one-more", A)).toEqual({ ok: false, error: "full" });
  });
});

describe("teams", () => {
  test("are stamped with the sender and replace only the sender's", () => {
    const { rooms } = setup();
    rooms.join(LOBBY, "a1", A);
    rooms.join(LOBBY, "b1", B);
    value(rooms.setTeams(LOBBY, "a1", [ red ]));
    value(rooms.setTeams(LOBBY, "b1", [ blue ]));
    const state = value(rooms.setTeams(LOBBY, "a1", [ { ...red, players: [ "TOM", "ANNA" ] } ]));
    expect(state.teams.map(team => [ team.owner, team.name, team.players.join() ])).toEqual([
      [ A.userId, "TEAM RED", "TOM,ANNA" ],
      [ B.userId, "TEAM BLUE", "LISA,MAX" ],
    ]);
  });

  test("an empty list takes the sender's teams out", () => {
    const { rooms } = setup();
    rooms.join(LOBBY, "a1", A);
    rooms.setTeams(LOBBY, "a1", [ red ]);
    expect(value(rooms.setTeams(LOBBY, "a1", [])).teams).toEqual([]);
  });

  test("come from a capped number of accounts, however many come and go", () => {
    const { rooms } = setup();
    for (let i = 0; i < LIMITS.ownersPerRoom; i++) {
      value(rooms.join(LOBBY, `s${i}`, user(i)));
      value(rooms.setTeams(LOBBY, `s${i}`, [ red ]));
      rooms.leave(LOBBY, `s${i}`);
    }
    value(rooms.join(LOBBY, "late", user(99)));
    expect(rooms.setTeams(LOBBY, "late", [ red ])).toEqual({ ok: false, error: "full" });
    // An account that has teams there may still change them.
    value(rooms.join(LOBBY, "s0-again", user(0)));
    value(rooms.setTeams(LOBBY, "s0-again", [ blue ]));
  });

  test("are refused from a socket that isn't in the room", () => {
    const { rooms } = setup();
    rooms.join(LOBBY, "a1", A);
    expect(rooms.setTeams(LOBBY, "b1", [ blue ])).toEqual({ ok: false, error: "room" });
  });

  test("are checked: colours, seat ids, counts, lengths, duplicates", () => {
    expect(parseTeams([ { ...red, colour: { ...crimson, from: "red" } } ]).ok).toBe(false);
    expect(parseTeams([ { ...red, seatIds: [ "seat-1" ] } ]).ok).toBe(false);
    expect(parseTeams([ { ...red, seatIds: [] } ]).ok).toBe(false);
    expect(parseTeams([ { ...red, format: "mixed" } ]).ok).toBe(false);
    expect(parseTeams([ { ...red, name: "X".repeat(LIMITS.nameLength + 1) } ]).ok).toBe(false);
    expect(parseTeams([ { ...red, players: Array(LIMITS.playersPerTeam + 1).fill("ANNA") } ]).ok).toBe(false);
    expect(parseTeams([ red, red ]).ok).toBe(false);
    expect(parseTeams(Array.from({ length: LIMITS.teamsPerOwner + 1 }, (_, i) => ({ ...red, name: `T${i}` }))).ok).toBe(false);
    expect(parseTeams("teams").ok).toBe(false);
    expect(parseTeams([ red, blue ])).toEqual({ ok: true, value: [ red, blue ] });
  });
});

describe("shifts", () => {
  test("only for a team the sender owns, and within range", () => {
    const { rooms } = setup();
    rooms.join(LOBBY, "a1", A);
    rooms.join(LOBBY, "b1", B);
    rooms.setTeams(LOBBY, "a1", [ red ]);
    rooms.setTeams(LOBBY, "b1", [ blue ]);
    expect(value(rooms.setShift(LOBBY, "a1", { team: "TEAM RED", shift: 1 })).shifts).toEqual([ { owner: A.userId, team: "TEAM RED", shift: 1 } ]);
    expect(rooms.setShift(LOBBY, "a1", { team: "TEAM BLUE", shift: 1 })).toEqual({ ok: false, error: "owner" });
    expect(rooms.setShift(LOBBY, "a1", { team: "TEAM RED", shift: LIMITS.maxShift + 1 })).toEqual({ ok: false, error: "shift" });
    expect(rooms.setShift(LOBBY, "a1", { team: "TEAM RED", shift: 0.5 })).toEqual({ ok: false, error: "shift" });
  });

  test("go with their team", () => {
    const { rooms } = setup();
    rooms.join(LOBBY, "a1", A);
    rooms.setTeams(LOBBY, "a1", [ red ]);
    rooms.setShift(LOBBY, "a1", { team: "TEAM RED", shift: 1 });
    expect(value(rooms.setTeams(LOBBY, "a1", [])).shifts).toEqual([]);
  });
});

describe("rule", () => {
  test("keeps who said it", () => {
    const { rooms } = setup();
    rooms.join(LOBBY, "b1", B);
    expect(value(rooms.setRule(LOBBY, "b1", { partnerRule: true })).rule).toEqual({ by: B.userId, partnerRule: true });
    expect(rooms.setRule(LOBBY, "b1", { partnerRule: "yes" })).toEqual({ ok: false, error: "rule" });
  });
});

describe("claims", () => {
  test("the first one wins, across sockets and accounts", () => {
    const { rooms } = setup();
    rooms.join(LOBBY, "a1", A);
    rooms.join(LOBBY, "a2", A);
    rooms.join(LOBBY, "b1", B);
    expect(rooms.claim(LOBBY, "a1", "undo|m|d1")).toEqual({ ok: true, value: true });
    expect(rooms.claim(LOBBY, "a2", "undo|m|d1")).toEqual({ ok: true, value: false });
    expect(rooms.claim(LOBBY, "b1", "undo|m|d1")).toEqual({ ok: true, value: false });
    expect(rooms.claim(LOBBY, "b1", "")).toEqual({ ok: false, error: "key" });
    expect(rooms.claim(LOBBY, "b1", "k".repeat(LIMITS.claimKeyLength + 1))).toEqual({ ok: false, error: "key" });
  });

  test("expire", () => {
    const { rooms, tick } = setup();
    rooms.join(LOBBY, "a1", A);
    rooms.claim(LOBBY, "a1", "k");
    tick(CLAIM_TTL_MS + 1);
    rooms.sweep();
    expect(rooms.claim(LOBBY, "a1", "k")).toEqual({ ok: true, value: true });
  });
});

describe("leaving and expiry", () => {
  test("a socket that leaves takes its peer out but leaves its teams", () => {
    const { rooms } = setup();
    rooms.join(LOBBY, "a1", A);
    rooms.join(LOBBY, "b1", B);
    rooms.setTeams(LOBBY, "b1", [ blue ]);
    const [ state ] = rooms.leaveAll("b1");
    expect(state.peers.map(peer => peer.name)).toEqual([ "creazy" ]);
    expect(state.teams.map(team => team.name)).toEqual([ "TEAM BLUE" ]);
  });

  test("an empty room lasts ROOM_IDLE_MS, then goes", () => {
    const { rooms, tick } = setup();
    rooms.join(LOBBY, "a1", A);
    rooms.setTeams(LOBBY, "a1", [ red ]);
    rooms.leave(LOBBY, "a1");
    tick(ROOM_IDLE_MS - 1);
    expect(rooms.sweep()).toBe(0);
    expect(value(rooms.join(LOBBY, "a2", A)).teams.map(team => team.name)).toEqual([ "TEAM RED" ]);
    rooms.leave(LOBBY, "a2");
    tick(ROOM_IDLE_MS + 1);
    expect(rooms.sweep()).toBe(1);
    expect(rooms.state(LOBBY)).toBeUndefined();
  });

  test("a room swept away is no longer one of its sockets' rooms", () => {
    const { rooms, tick } = setup();
    rooms.join(LOBBY, "a1", A);
    tick(ROOM_MAX_MS + 1);
    rooms.sweep();
    expect(rooms.roomsOf("a1")).toEqual([]);
    expect(rooms.leaveAll("a1")).toEqual([]);
  });

  test("no room outlives ROOM_MAX_MS", () => {
    const { rooms, tick } = setup();
    rooms.join(LOBBY, "a1", A);
    tick(ROOM_MAX_MS + 1);
    expect(rooms.sweep()).toBe(1);
    expect(rooms.counts()).toEqual({ rooms: 0, sockets: 0 });
  });
});

describe("peers", () => {
  test("need a UUID and a name", () => {
    expect(parsePeer({ userId: A.userId, name: "creazy" })).toEqual(A);
    expect(parsePeer({ userId: "x", name: "creazy" })).toBeUndefined();
    expect(parsePeer({ userId: A.userId, name: " " })).toBeUndefined();
  });
});
