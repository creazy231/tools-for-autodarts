/**
 * Main-world script that drops autodarts' own dart-landed sound for the darts
 * you are standing next to.
 *
 * The rebuilt site plays its effects through howler, out of one sprite sheet:
 * `assets/sound-*.js` maps its `dart_landed` effect to the sprite names
 * `thud-1` … `thud-6`, picks one and hands it to `Howl.play()`. Nothing about
 * that call says whose dart it was, so the decision is made in the content
 * script, which has the match data, and arrives here as a flag.
 *
 * The flag is an attribute on `<html>`, raised and lowered by
 * entrypoints/match.content/quiet-own-darts.ts and read here each time a thud
 * is asked for. It used to arrive as a CustomEvent carrying `{ quiet }` in its
 * `detail`, which works in Chrome and never worked in Firefox: there the page
 * is kept away from a content script's objects, `detail` included, and reading
 * `detail.quiet` threw "Permission denied to access property" — so the flag
 * never left false and not one thud was dropped. The DOM is the one thing the
 * two worlds actually share, and an attribute is there to be read whether or
 * not this script was listening when it was set.
 *
 * This has to run in the page's world — `Howl` lives there and a content
 * script cannot reach it — so it is injected the same way the WebSocket
 * capture is.
 */

/** Present on <html> while the sound is to be dropped. */
const FLAG_ATTR = "data-adt-quiet-dart-landed";

/** The sprite names autodarts gives its dart-landed effect. */
const DART_LANDED = /^thud-\d+$/;

/** Marks a prototype we have already wrapped, so a second inject is a no-op. */
const PATCHED = "__adtQuietOwnDarts";

export default defineUnlistedScript(() => {
  function patch(Howl: any): void {
    if (typeof Howl !== "function" || !Howl.prototype || Howl.prototype[PATCHED]) return;

    const play = Howl.prototype.play;
    Howl.prototype.play = function (this: unknown, sprite: unknown) {
      if (typeof sprite === "string" && DART_LANDED.test(sprite) && document.documentElement.hasAttribute(FLAG_ATTR)) {
        // play() hands back the id of the sound it started. The site keeps that
        // id only for the effects it loops — the timer warning — and throws it
        // away for a dart landing, so there is nothing here to stand in for.
        return -1;
      }
      // eslint-disable-next-line prefer-rest-params
      return play.apply(this, arguments as any);
    };
    Howl.prototype[PATCHED] = true;
    console.log("[Quiet Own Darts] howler patched");
  }

  if ((window as any).Howl) return patch((window as any).Howl);

  // howler arrives in a chunk of its own, well after this runs, and assigns
  // itself to `window` on the way in. Catching that assignment is exact where
  // polling for it is a guess at how long to keep looking.
  let pending: any;
  try {
    Object.defineProperty(window, "Howl", {
      configurable: true,
      get: () => pending,
      set: (value) => {
        pending = value;
        patch(value);
      },
    });
  } catch (error) {
    console.warn("[Quiet Own Darts] could not watch for howler, polling instead", error);
    const started = Date.now();
    const timer = setInterval(() => {
      if ((window as any).Howl) patch((window as any).Howl);
      if ((window as any).Howl?.prototype?.[PATCHED] || Date.now() - started > 60_000) clearInterval(timer);
    }, 500);
  }
});
