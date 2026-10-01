/** The dialog that offers to carry a v1 install's settings over — components/Migration.vue. */
export default {
  title: "Update Available",
  intro: "A new version of <b>Tools for Autodarts</b> is available. You can migrate your settings now or continue with default settings.",
  note: "<b>Note:</b> Sound, caller, and animation features have been reworked, and their settings cannot be migrated automatically. You can download your old settings for reference.",
  download: "Download Settings",
  /** The typo is the English text as it is today; a fix belongs in a change of its own. */
  resetWarning: "Continueing without migration will reset your settings to default.",
  continueWithout: "Continue without",
  migrateNow: "Migrate now",
  /** The "are you sure" dialog behind Continue without. */
  confirm: {
    title: "Continue without migration?",
    message: "This will reset all your settings to default. Any custom configurations will be lost.",
    confirmText: "Continue",
    cancelText: "Go back",
  },
  migrated: "Settings migrated successfully. Page is reloading...",
};
