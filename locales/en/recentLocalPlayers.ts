/**
 * Recent Local Players — components/Settings/RecentLocalPlayers.vue and the strip under the
 * lobby's player list, entrypoints/lobby.content/RecentLocalPlayers.vue.
 * Its name is features.recentLocalPlayers.
 */
export default {
  card: "Autodarts remembers your last 6 local players and drops the rest for good. This keeps them all and puts them one click away in the lobby.",
  intro: "Keeps the local players you enter, not only the six autodarts remembers, and puts them one click away in a strip under the lobby's player list.",
  /** The strip's heading in the lobby, set in capitals there. */
  stripTitle: "Saved players",
  sections: {
    options: "Options",
  },
  playersToKeep: {
    title: "Players to keep",
    description: "Once the list is full, the oldest name makes room for a new one.",
  },
  /** The list of saved names the panel keeps. */
  list: {
    title: "Saved players",
    emptyTitle: "No saved players yet",
    emptyText: "Every local player you add to a lobby is saved here, and offered in a strip under the lobby's player list.",
    noMatch: "No saved player has that in their name.",
    searchPlaceholder: "Search players",
  },
  /**
   * The list's menu and its delete-all dialog. The menu's button and its item, and the dialog's confirm button, are
   * library.moreActions, library.more, library.deleteAllMenu and library.deleteAll, as in the four library panels.
   */
  deleteAll: {
    /** The dialog's heading. */
    title: { one: "Delete the {count} saved player?", other: "Delete all {count} saved players?" },
    /** "Add Player" is the site's own button, in the lobby's dialog that lists the players autodarts remembers. */
    body: "They go from the lobby's strip and from autodarts' own Add Player list. This can't be undone.",
  },
};
