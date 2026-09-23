/**
 * Keys typed into one of our text fields stay in that field.
 *
 * Everything the extension draws lives in a shadow root, and a keystroke that
 * leaves one is retargeted to the shadow host. Shortcut handlers on the page
 * leave keys alone when they land in an input, but from outside the shadow
 * root there is no input to see, only our host element, so a letter typed
 * into one of our fields reads to them as a shortcut. FankiDarts is the case
 * that was measured: it opens its settings on "s" from a capture listener on
 * `document`, which swallowed every "s" typed into Tools — no https:// webhook
 * URL could be entered — and opened its own window over ours instead. Its
 * chat-button shortcuts make the same mistake during a match, and those send
 * a message.
 *
 * WXT's `isolateEvents` cannot help: it stops the event on its way back up,
 * and a capture listener on `document` has run long before then. The one
 * place ahead of `document` is `window` in the capture phase, so this listens
 * there and goes no further for typing. The character still arrives: putting
 * it in the field is the key's default action, which stopping propagation
 * leaves alone, and `input`, the event v-model listens to, is a separate one
 * this never touches.
 *
 * Only typing is held back — a printable key without Ctrl or Cmd, in a field.
 * Enter, Escape, Tab, arrows and shortcuts carry on to the page as before,
 * because some of ours are handled out there too: Radix closes its dialogs on
 * an Escape heard on `window`, which stopping it here would silence as well.
 */

const KEY_EVENTS = [ "keydown", "keypress", "keyup" ] as const;

/** Every host createShadowRootUi makes for us is named with this prefix. */
const HOST_PREFIX = "autodarts-tools";

/** What a shortcut handler would leave alone, if it could see it. */
const FIELD = "input, textarea, select";

function isOurField(node: EventTarget | undefined): boolean {
  if (!(node instanceof HTMLElement)) return false;
  if (!node.matches(FIELD) && !node.isContentEditable) return false;

  const root = node.getRootNode();
  return root instanceof ShadowRoot && root.host.localName.startsWith(HOST_PREFIX);
}

function isTyping(event: KeyboardEvent): boolean {
  return event.key.length === 1 && !event.ctrlKey && !event.metaKey;
}

function holdTyping(event: KeyboardEvent): void {
  if (isTyping(event) && isOurField(event.composedPath()[0])) event.stopPropagation();
}

/**
 * Install once per page; the one listener covers every UI of ours on it.
 * Returns the teardown.
 */
export function keepKeystrokesInFields(): () => void {
  for (const type of KEY_EVENTS) window.addEventListener(type, holdTyping, true);
  return () => {
    for (const type of KEY_EVENTS) window.removeEventListener(type, holdTyping, true);
  };
}
