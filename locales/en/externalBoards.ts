/**
 * External Boards — the card, components/Settings/ExternalBoards.vue, and the section it adds to the boards
 * page, entrypoints/boards.content/ExternalBoards.vue, which is a bundle of its own.
 * Its name is features.externalBoards. The card's title and picture and the section's heading say it, so
 * they have no key here. The feature has no settings panel.
 */
export default {
  card: "Allows you to save external Boards to easily follow them.",
  /** The title of a saved board that was saved without a name: shown in its place, never stored. */
  unnamedBoard: "Unnamed board",
  /** The tooltip of the trash button on a saved board. */
  forget: "Forget this board",
  /** A saved board's button. */
  follow: "Follow",
  placeholders: {
    name: "Board name",
    id: "Board ID or link",
  },
  /** Why a board can't be added, beside the Add button. */
  errors: {
    missingId: "Paste a board link or its ID",
    alreadyListed: "That board is already in the list",
  },
};
