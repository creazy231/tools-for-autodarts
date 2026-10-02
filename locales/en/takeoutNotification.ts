/**
 * Takeout Notification — components/Settings/TakeoutNotification.vue, and the notice the match
 * page puts up while the darts come out, entrypoints/match.content/takeout.ts.
 * Its name is features.takeoutNotification.
 * The panel has no settings, so it only says what the feature does.
 */
export default {
  card: "Displays a notification whenever takeout of darts is in progress.",
  noSettings: "This feature doesn't have any additional settings.",
  intro: "When enabled, a notification will be displayed whenever takeout of darts is in progress.",
  /** The notice across the match page. CSS sets it in capitals and adds the animated dots, so it carries no ellipsis. */
  panel: "Removing Darts",
};
