import { addStyles, removeStyles } from "@/utils";
import { SELECTORS, qs } from "@/utils/selectors";

/**
 * A countdown drawn on one of the site's own buttons, which clicks it at zero.
 *
 * Both auto-advance features work this way: something happens on the board, a
 * button gets " (5) (4) (3)…" after its label, and unless the countdown is
 * called off first the button is pressed.
 *
 * v1 appended a `<span>` inside the button. The rebuilt turn bar is React and
 * is rebuilt on every dart, so the span is discarded — and, worse, v1 held on
 * to the element it found at the start and clicked *that* a few seconds later,
 * by which time it is a detached node and the click goes nowhere. So the count
 * is an attribute the stylesheet draws as generated content, and the button is
 * resolved again on every tick: if it moves we follow it, and if it goes away
 * the countdown stops rather than firing into nothing — unless the caller says
 * it is still to come, as Next Leg is while the site plays its GAME SHOT.
 */
export interface ButtonCountdown {
  /** Install the stylesheet. Call once, when the feature starts. */
  install: () => void;
  /**
   * Begin counting down on whatever `find` resolves to.
   *
   * `find` is the whole condition: returning null at any point — the button is
   * gone, or the state that justified the countdown has passed — stops it.
   *
   * Unless `pending` says that state still holds: then the button is one the
   * site has yet to draw, and the time runs on without it. The count goes on
   * the button once it is there, and a button drawn after the time is up is
   * pressed as soon as it is.
   */
  start: (find: () => HTMLElement | null, seconds: number, pending?: () => boolean) => void;
  /** Call the countdown off and take the number back off the button. */
  stop: () => void;
  /** Stop and remove the stylesheet. */
  destroy: () => void;
}

export function createButtonCountdown(attribute: string, styleId: string): ButtonCountdown {
  let timer: ReturnType<typeof setInterval> | undefined;
  let observer: MutationObserver | null = null;
  let finder: (() => HTMLElement | null) | null = null;
  let stillPending: (() => boolean) | null = null;
  let remaining = 0;
  let frame = 0;

  // The button is inline-flex with a gap, so an extra child lands after the
  // label spaced like any other, in the button's own type and colour — which is
  // the whole reason for putting it there rather than beside it. Tabular
  // figures keep the button from twitching as the digit changes.
  //
  // It has to be `::before`: every button on the rebuilt site carries
  // `ellipse-overlay`, whose decoration IS its `::after`, and writing content
  // there replaces the overlay with a stray number floating in its box. Flex
  // `order` puts the pseudo-element last anyway, so nothing is lost.
  const styles = `
    [${attribute}]::before {
      content: "(" attr(${attribute}) ")";
      order: 1;
      font-variant-numeric: tabular-nums;
      opacity: 0.75;
    }
  `;

  function clearAttribute(): void {
    for (const el of document.querySelectorAll(`[${attribute}]`)) el.removeAttribute(attribute);
  }

  /**
   * Look again, on every tick and whenever the page changes: put what is left
   * on the button, or press it once nothing is.
   */
  function update(): void {
    const button = finder?.() as HTMLButtonElement | null;
    if (!button) {
      if (!stillPending?.()) stop();
      return;
    }

    if (remaining > 0) {
      if (button.getAttribute(attribute) !== String(remaining)) {
        clearAttribute();
        button.setAttribute(attribute, String(remaining));
      }
      return;
    }

    stop();

    // The site disables the button when there is nothing to advance to.
    // Clicking anyway is silent, so say so instead.
    if (button.disabled) return console.log(`Autodarts Tools: ${styleId} - the button is disabled, leaving it alone`);

    console.log(`Autodarts Tools: ${styleId} - pressing "${button.textContent?.trim()}"`);
    button.click();
  }

  /**
   * Put the count back when React rebuilds the bar mid-countdown, and find a
   * button that is drawn late. Writing an attribute is not a childList
   * mutation, so this cannot retrigger itself.
   */
  function watchDom(): void {
    if (observer) return;

    const host = qs(SELECTORS.app.contentRoot);
    if (!host) return;

    observer = new MutationObserver(() => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (timer) update();
      });
    });
    observer.observe(host, { childList: true, subtree: true });
  }

  function start(find: () => HTMLElement | null, seconds: number, pending?: () => boolean): void {
    stop();
    if (seconds <= 0) return;

    finder = find;
    stillPending = pending ?? null;
    remaining = seconds;
    if (!finder() && !stillPending?.()) return;

    update();
    watchDom();

    timer = setInterval(() => {
      if (remaining > 0) remaining--;
      update();
    }, 1000);
  }

  function stop(): void {
    if (timer) {
      clearInterval(timer);
      timer = undefined;
    }
    if (frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
    observer?.disconnect();
    observer = null;
    finder = null;
    stillPending = null;
    clearAttribute();
  }

  return {
    install: () => addStyles(styles, styleId),
    start,
    stop,
    destroy: () => {
      stop();
      removeStyles(styleId);
    },
  };
}
