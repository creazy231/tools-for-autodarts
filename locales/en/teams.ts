/**
 * Teams — the panel and card, components/Settings/Teams.vue; in the lobby, the
 * Add Team drawer (entrypoints/lobby.content/AddTeamDrawer.vue, TeamNameChip.vue)
 * and what entrypoints/lobby.content/teams.ts writes into the site's lobby; in
 * the match, the pill (entrypoints/match.content/TeamsPill.vue) and the chips on
 * a team's card. The sentences built from names and counts are put together in
 * utils/teams-text.ts. Its name is features.teams.
 */
export default {
  card: "Play in teams: on a shared score, or each on their own. Add them in the lobby, and the match shows whose turn it is in each team's colours.",
  /** `addTeam` is lobby.addTeam, the button's own name. Add Player and Add Bot are the site's buttons beside it, in the site's words. */
  intro: "Play in teams two ways. With a shared score, a team is one player on your board and its players take turns on it, like steel-tip doubles. When someone else steps up, tap their name on the team's card. With own scores, everyone keeps their own score and a leg counts for their team, and a bot can play on a team. A team can be a single player, for 2 vs 1. Own-score teams in X01 can play the partner rule: switch it on the lobby page, next to Autoscoring. Add teams in a lobby you host with <b>{addTeam}</b>, next to Add Player and Add Bot.",
  /** The heading of the saved teams, in the panel and in the drawer. problems.savedNotAdded names it in the same words. */
  savedTeams: "Saved teams",
  /** The panel's list of saved teams. */
  list: {
    emptyTitle: "No saved teams yet",
    /** `addTeam` is lobby.addTeam. */
    emptyText: "Teams you add with {addTeam} in a lobby are kept here, with their players and colour, so a rematch or the next lobby knows them.",
    noMatch: "No saved team has that in its name or its players.",
    searchPlaceholder: "Search teams",
  },
  /** The chip before a saved team's players, set in capitals: how it keeps score. drawer.tabs are the same two, as the drawer's tabs. */
  formats: {
    shared: "SHARED SCORE",
    own: "OWN SCORES",
  },
  /**
   * The colour's word in the name the drawer suggests for a new team, "TEAM RED",
   * by the colour's preset id; written in capitals, as the site shows a name. It is
   * written in the language of the moment the name is suggested, and a saved name
   * never changes with the language after that.
   */
  colourWords: {
    default: "RASPBERRY",
    blueberry: "PURPLE",
    ocean: "BLUE",
    lime: "GREEN",
    petrol: "TEAL",
    orange: "ORANGE",
    crimson: "RED",
    gold: "GOLD",
    slate: "SLATE",
    qwellcode: "QWELLCODE",
  },
  /** What Teams writes into the site's lobby page. */
  lobby: {
    /** The button beside the site's Add Player and Add Bot, which opens the drawer; also the drawer's heading and its button while adding. */
    addTeam: "Add Team",
    /** The pencil on a team's row: its tooltip, and its spoken name. */
    edit: {
      title: "Edit team",
      label: "Edit {name}",
    },
    /** A player's place in an own-score team, beside its name under theirs: "1 of 2". */
    memberOf: "{place} of {size}",
    /** The switch card beside the site's Autoscoring. */
    partnerRule: {
      title: "Partner rule",
      text: "Own-score teams in X01: nobody may check out while a teammate has more left than both opponents together. A checkout that breaks it is a bust.",
      /** Under the text while the rule is on but can't come in yet. */
      pending: "It counts once there are two own-score teams and everyone is on one.",
    },
    /**
     * The note under the players when the teams aren't the same size: "RED has 2
     * players and BLUE 1: the bigger team throws more often each round." `first` is
     * the first team, `rest` each of the others, `note` the sentence they go in as
     * `{teams}`, joined as the language joins a list.
     */
    uneven: {
      first: { one: "{name} has {count} player", other: "{name} has {count} players" },
      rest: "{name} {count}",
      note: "{teams}: the bigger team throws more often each round.",
    },
  },
  /** The Add Team drawer. */
  drawer: {
    /** The heading while a team is edited. While one is added, it is lobby.addTeam. */
    editTeam: "Edit Team",
    sharedLine: "The team plays as one player on your board, and its players take turns in this order.",
    ownLine: {
      /** The lobby's "First to N legs". */
      legs: {
        one: "Everyone keeps their own score. A leg counts for the team of whoever checks out, and the first team to {count} leg wins the match.",
        other: "Everyone keeps their own score. A leg counts for the team of whoever checks out, and the first team to {count} legs wins the match.",
      },
      target: "Everyone keeps their own score. A leg counts for the team of whoever checks out, and the first team to the lobby's target wins the match.",
    },
    /** The two formats, as tabs. noBotShared names `own` in the same words. */
    tabs: {
      shared: "Shared score",
      own: "Own scores",
    },
    /** Under the tabs once the lobby's first team has set its format. `team` is that team. */
    formatNote: {
      own: "{team} already plays on own scores, so this lobby's teams do too.",
      shared: "{team} already shares a score, so this lobby's teams do too.",
    },
    /** The drawer's headings. problems.playerInLobby names `inThisLobby` in the same words. */
    sections: {
      name: "Name",
      colour: "Colour",
      players: "Players",
      inThisLobby: "In this lobby",
      newPlayers: "New players",
      bots: "Bots",
    },
    /** The small lines beside the headings. */
    hints: {
      colourOwn: "their cards' gradient while one of them is up",
      colourShared: "the card's gradient while this team is up",
      dragToReorder: "drag to change the order",
      tapToAdd: "tap to add",
      joinAsGuests: "join as guests on your board",
      joinAtLevel: "join at the level you pick",
    },
    keepsName: "A team keeps its name: autodarts can't rename a player. To rename it, remove the team from the lobby and add it again.",
    /** The colour picker's spoken name. */
    colour: "Team colour",
    emptyShared: "Nobody yet: type a name, or tap one below.",
    emptyOwn: "Nobody yet: tap someone in this lobby, or add a new player or a bot.",
    /** The search field's placeholder and spoken name. */
    searchOrAdd: "Search or add a player",
    /** Own scores is tabs.own, Add Bot the site's own button. */
    noBotShared: "A bot can't share a score: autodarts throws every visit of a bot's seat. Use Own scores to put one on a team, or Add Bot to play against one.",
    /** The bot level picker's spoken name, and each of its levels: `ppr` is the average the level plays at. */
    botLevel: "Bot level",
    levelOption: "Level {level} · {ppr}+",
    addBot: "Add bot",
    /** How each picked player joins, beside their name. */
    kinds: {
      newBot: "new bot · {ppr}+",
      newGuest: "new guest",
      bot: "bot",
      ownBoard: "on their own board",
      guest: "guest",
    },
  },
  /** A name offered in the drawer, and its ✕. */
  chip: {
    /** The red button the ✕ turns into for a moment, and the ✕'s spoken name. */
    delete: "Delete {name}",
    deleteTitle: "Delete this name",
    /** The tooltip of a name greyed out because it is on another team. */
    onTeam: "On {team}",
    add: "Add {name}",
  },
  /** Why a team can't be added, in the drawer. */
  problems: {
    noName: "Give the team a name.",
    nameTooLong: "A team name can be {max} characters at most.",
    playerExists: "There's already a player called {name} in this lobby.",
    teamExists: "There's already a team called {name} in this lobby.",
    /** "In this lobby" is drawer.sections.inThisLobby. */
    playerInLobby: "There's already a player called {name} in this lobby. Pick them under In this lobby.",
    duplicate: "Each player can only be in the team once.",
    noPlayers: "Add at least one player.",
    tooMany: { one: "A team can have {count} player at most.", other: "A team can have {count} players at most." },
    onAnotherTeam: "{name} is already on another team.",
    onTeam: "{name} is already on {team}.",
    roomFor: { one: "The lobby has room for {count} more player.", other: "The lobby has room for {count} more players." },
    legsOnly: "Own-score teams play legs. Set the lobby to legs to use them.",
    /** `variants` are the games autodarts has bots for, as it names them: "X01 and Cricket". */
    hasBot: "{name} has a bot, and bots only play {variants}.",
    botsOnly: "Bots only play {variants}.",
    lobbyFull: "The lobby is full.",
    colourTaken: "Another team in this lobby already has that colour.",
    /** "Saved teams" is savedTeams. */
    savedNotAdded: "The team is saved, but autodarts didn't add it to the lobby. Add it again from Saved teams.",
    teamNotAdded: "autodarts didn't add the team. Try again.",
    notLoaded: "The lobby isn't loaded yet. Try again in a moment.",
    playersNotAdded: "autodarts didn't add every new player. Try again.",
    namesNotAdded: "autodarts didn't add {names}. Try again.",
    /** After a saved team is added: its signed-in players who aren't in the lobby. `count` is how many names `names` has. */
    notInLobby: {
      one: "Added. {names} isn't in the lobby: signed-in players join from their own board.",
      other: "Added. {names} aren't in the lobby: signed-in players join from their own board.",
    },
  },
  /** On a shared-score team's card in the match: the tooltip of each player's chip. */
  match: {
    isThrowing: "{name} is throwing",
    throwsNext: "{name} throws next",
  },
  /** The pill under the match's turn bar, and the teams' legs beside it. */
  pill: {
    /** Killer's own words on the site (game.killer.toThrow). */
    toThrow: "{name} to throw",
    legWon: "{name} wins the leg",
    matchWon: "{name} wins the match",
    /** Beside the legs: the lobby's "First to N". */
    firstTo: { one: "first to {count}", other: "first to {count}" },
    /** A team's legs, spoken. */
    legs: { one: "{name}, {count} leg", other: "{name}, {count} legs" },
    /** The partner rule's line while it stops the player up from checking out. `opponents` are joined as a list. */
    noCheckout: "No checkout this visit",
    ruleWarning: "{teammate} has {left} left, more than {opponents} together ({opponentsLeft})",
    /** After a checkout the rule turned into a bust, and the reason beside it. */
    notCounted: "{name}'s checkout didn't count",
    partnerRule: "partner rule",
    /** When autodarts took the darts back but wouldn't pass the turn on. Next is the site's button. */
    pressNext: "press Next to pass the turn",
    /** When autodarts refused to take the checkout back. Undo is the site's button. */
    undoYourself: "Undo {name}'s checkout yourself",
    refused: "it breaks the partner rule, and autodarts didn't take it back",
  },
  online: {
    status: {
      connecting: "Connecting to Online Teams…",
      ready: "Online Teams ready",
      synced: "In sync with {names}",
      missing: { one: "{names} isn't connected", other: "{names} aren't connected" },
      offline: "Online Teams offline",
      outdated: "Update Tools for Online Teams",
    },
    card: {
      title: "Online Teams",
      server: "Server",
      online: "online · {ms} ms",
      onlineNoRtt: "online",
      connecting: "connecting…",
      offline: "offline",
      outdated: "needs a newer Tools",
      you: "{name} (you)",
      connected: "connected",
      notConnected: "not connected",
      shared: "Shared",
      sharedValue: "team names, players, colours, order",
      retry: "Retry",
      close: "Close",
    },
    invite: {
      button: "Invite a team",
      copied: "Link copied",
      copyFailed: "Couldn't copy the link",
    },
    invitation: {
      title: { one: "{teams} invites you to a team match", other: "{teams} invite you to a team match" },
      lobby: "{host}'s lobby · {details}",
      legs: { one: "{game} · First to {count} Leg", other: "{game} · First to {count} Legs" },
      sets: { one: "{game} · First to {count} Set", other: "{game} · First to {count} Sets" },
      join: "Join with {team}",
      newTeam: "New team",
      otherFormat: "This lobby plays {format}",
      formats: {
        shared: "shared score",
        own: "own scores",
      },
      dismiss: "Dismiss",
      busy: "Joining…",
    },
    offline: {
      badge: "Teams offline",
      hint: "Online Teams is offline: the other team's players may be out of date.",
    },
  },
};
