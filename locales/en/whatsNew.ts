/**
 * What's New — components/WhatsNew.vue. The notes of one release: each release
 * writes its own, in all three languages. The bodies quote labels from other
 * panels (Start delay, On Board, …); the German and Dutch of those are in
 * locales/GLOSSARY.md, "Labels quoted in What's New".
 */
export default {
  /** The dialog's heading: "What's new in 3.0". */
  title: "What's new in {release}",
  intro: "Autodarts rebuilt their site, so this release is a rebuild of the extension to match: every feature has been ported to the new design, and a few of them work rather differently now.",
  beforeYouPlay: "Before you play",
  newInThisRelease: "New in this release",
  /** What changed under someone who already had the extension set up. */
  headsUp: {
    featuresGone: {
      title: "Two features are gone",
      body: "Shuffle Players — the lobby has its own Shuffle button now — and Hide Menu In Match, since the rebuilt match screen ships no menu to hide.",
    },
    settingsFresh: {
      title: "A few settings start fresh",
      body: "Instant Replay's Delay is now Start delay and means something else, so it begins at 3 seconds; Darts Zoom's Center position is gone and its hold time is in milliseconds. Worth a look before your next match.",
    },
  },
  /** Worth going and switching on. */
  highlights: {
    boardView: {
      title: "Board View",
      body: "Start every game — bull-off included — on the camera or the drawn board you want to be looking at.",
    },
    zoom: {
      title: "Darts Zoom, reworked",
      body: "A new On Board mode zooms Autodarts' own board on each dart and adds nothing to the screen. Bottom and Top draw close-ups instead, and Bottom is the new default.",
    },
    quietOwnDarts: {
      title: "Quiet Own Darts",
      body: "Silences the thud for darts you can already hear land, and keeps it for everyone else. Its switch is in Autodarts' own sound settings, under Dart landed.",
    },
    streamingMode: {
      title: "Streaming Mode",
      body: "Works on the rebuilt site, and no longer needs a board camera. There is a second scoreboard to choose from — Autodarts, drawn from the site's own design — beside the classic broadcast one.",
    },
    caller: {
      title: "Caller",
      body: "Prefer combined throws stops a visit being called twice when it has a combination sound of its own, and there is a bulloff trigger to go with WLED's.",
    },
    gotcha: {
      title: "Gotcha",
      body: "Checkout routes worked out here — Autodarts provides none for Gotcha — announced by the Caller, plus a helper marking every player you could knock back.",
    },
  },
  changelog: "Full changelog",
  reportIssue: "Report an issue",
  gotIt: "Got it",
};
