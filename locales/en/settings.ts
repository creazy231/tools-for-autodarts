/** The settings page around the features: components/PageConfig.vue. */
export default {
  /** The fallback dialog heading, for a feature that is not in the registry. */
  title: "Settings",
  /** A feature's settings dialog: "Settings - Darts Zoom". */
  dialogTitle: "Settings - {feature}",
  tabs: {
    lobbies: "Lobbies",
    matches: "Matches",
    boards: "Boards",
    soundsAnimations: "Sounds & Animations",
  },
  header: {
    export: "Export",
    import: "Import",
    /** The header button's title, and the label of the Ko-fi button in the advanced panel. */
    kofi: "Support on Ko-fi",
    advanced: "Advanced settings",
  },
  exportMenu: {
    download: "Download file",
    downloadHint: "To keep as a backup or import elsewhere",
    copy: "Copy to clipboard",
    copyHint: "To share or paste into Import elsewhere",
  },
  importMenu: {
    upload: "Upload file",
    uploadHint: "Replaces your settings with an exported file",
    paste: "Paste from clipboard",
    pasteHint: "Replaces your settings with copied ones",
  },
  support: {
    title: "Support the Project",
    body: "Autodarts Tools is free and open source. If you enjoy using it, consider supporting the development to keep it going!",
  },
  releaseNotes: {
    title: "Release Notes",
    body: "What changed in this release — shown once after an update, and here whenever you want it again.",
    button: "What's New",
  },
  danger: {
    title: "Danger Zone",
    body: "These actions are destructive and cannot be undone. Please proceed with caution and may export your settings before proceeding.",
    resetTitle: "Reset All Settings",
    resetBody: "This will reset all settings to their default values. All your customizations will be lost.",
    /** The confirm dialog: the alert's body plus the question, written as one message. */
    resetConfirm: "This will reset all settings to their default values. All your customizations will be lost. Are you sure you want to continue?",
  },
  performance: {
    title: "Performance Warning",
    body: "Enabling the <b>{animations}</b>, <b>{caller}</b>, or <b>{soundFx}</b> features may cause performance issues and may require decent hardware. If you experience any lags or errors, try disabling these features.",
  },
  notifications: {
    exportSoundsFailed: "Error exporting sound files",
    invalidFile: "Invalid settings file",
    importSoundsFailed: "Settings imported, but error importing sounds",
    imported: "Settings imported successfully. Page will reload to apply changes...",
    importFailed: "Failed to import settings",
    resetDone: "All settings have been reset to default. Page will reload to apply changes...",
    copySoundsFailed: "Settings copied, but error including sounds",
    copied: "Settings copied to clipboard",
    copyFailed: "Failed to copy settings to clipboard",
    invalidData: "Invalid settings data",
    pasteImportFailed: "Failed to import settings from clipboard",
    pasteReadFailed: "Failed to read from clipboard",
  },
};
