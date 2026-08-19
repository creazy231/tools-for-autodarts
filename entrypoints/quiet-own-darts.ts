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
 * This has to run in the page's world — `Howl` lives there and a content
 * script cannot reach it — so it is injected the same way the WebSocket
 * capture is.
 */

/** What the content script sends when the flag changes. */
const FLAG_EVENT = "adt-quiet-own-darts";

/** The sprite names autodarts gives its dart-landed effect. */
const DART_LANDED = /^thud-\d+$/;

/** Marks a prototype we have already wrapped, so a second inject is a no-op. */
const PATCHED = "__adtQuietOwnDarts";

export default defineUnlistedScript(() => {
  let quiet = false;

  window.addEventListener(FLAG_EVENT, (event) => {
    quiet = Boolean((event as CustomEvent).detail?.quiet);
  });

  function patch(Howl: any): void {
    if (typeof Howl !== "function" || !Howl.prototype || Howl.prototype[PATCHED]) return;

    const play = Howl.prototype.play;
    Howl.prototype.play = function (this: unknown, sprite: unknown) {
      if (quiet && typeof sprite === "string" && DART_LANDED.test(sprite)) {
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
