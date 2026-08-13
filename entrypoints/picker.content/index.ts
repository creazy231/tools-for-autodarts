/**
 * Dev-only DOM element picker.
 *
 * Arm it with Alt+Shift+P, click elements on the page, press C to copy a
 * Markdown report of everything you picked, then paste that into a Claude Code
 * session. Built for driving v1 -> v2 feature ports: pick the element a feature
 * touches on the old site, pick its counterpart on the new one, and the report
 * carries the selectors, ancestor anchors, and the extension code that already
 * targets them.
 *
 * The body is gated so it never reaches store users. It is included in
 * `yarn dev`, and in `yarn build:devtools` — a production build meant for
 * installing locally in a real browser, since capturing the in-match DOM needs
 * a real board and a real match. Plain `yarn build`, which CI publishes, strips
 * it entirely (see the hooks in wxt.config.ts).
 */

import { serializeCapture } from "./serialize";
import { PickerUi } from "./ui";
import { AUTODARTS_MATCHES } from "@/utils/content-script-matches";

/** Injected by Vite's `define`; true only in devtools builds. */
declare const __ADT_PICKER__: boolean;

/**
 * Write to the clipboard from a content script.
 *
 * navigator.clipboard is preferred but can be refused depending on the host
 * page's permissions policy and focus state. execCommand("copy") is deprecated
 * but still works everywhere and has no such constraints, so it is the fallback.
 */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch { /* fall through */ }

  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    // Off-screen but focusable; readOnly avoids a mobile keyboard popping up.
    ta.style.cssText = "position:fixed;top:-1000px;left:-1000px;opacity:0;";
    ta.setAttribute("readonly", "");
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

export default defineContentScript({
  matches: AUTODARTS_MATCHES,
  runAt: "document_idle",

  main() {
    if (!import.meta.env.DEV && !__ADT_PICKER__) return;

    let ui: PickerUi | null = null;
    let armed = false;
    const captured: Element[] = [];

    /** Element currently under the cursor. */
    let hovered: Element | null = null;

    /**
     * Set as soon as ↑/↓ is pressed, which freezes the preview so moving the
     * mouse cannot steal it back. `origin` is the element the walk started
     * from; returning to it releases the lock and hover-following resumes.
     */
    let locked: { current: Element; origin: Element } | null = null;

    /** What ↑/↓ and a click act on. */
    const preview = () => locked?.current ?? hovered;

    const badgeHtml = () => {
      const depth = locked ? ` · locked ${locked.current.tagName.toLowerCase()}` : "";
      return `<b>DOM PICKER</b> · ${captured.length} captured${depth}`
        + `<span class="keys">hover · ↑↓ widen/narrow · E or click capture · C copy · R reset · Esc off</span>`;
    };

    /**
     * SVG internals are almost never what you want to target — clicking an icon
     * lands on a <path>, but the meaningful element is the <svg> or the button
     * around it. Climb out of the SVG's guts to the <svg> itself.
     */
    const SVG_INTERNALS = new Set([ "path", "g", "circle", "rect", "polygon", "polyline", "ellipse", "line", "use", "defs", "clippath", "mask", "stop", "lineargradient", "radialgradient", "tspan" ]);

    function meaningful(el: Element): Element {
      let cur = el;
      while (SVG_INTERNALS.has(cur.tagName.toLowerCase()) && cur.parentElement) cur = cur.parentElement;
      return cur;
    }

    /** Resolve the element under the cursor, ignoring the picker's own chrome. */
    function targetOf(e: MouseEvent): Element | null {
      const path = e.composedPath();
      for (const node of path) {
        if (!(node instanceof Element)) continue;
        if (ui?.isOwnNode(node)) return null;
        return meaningful(node);
      }
      return null;
    }

    /**
     * Widen to the parent. The first press locks onto whatever is hovered, so
     * you never have to click an element before adjusting the selection.
     */
    function widen() {
      const from = preview();
      if (!from) return;
      locked ??= { current: from, origin: from };
      if (locked.current.parentElement) locked.current = locked.current.parentElement;
    }

    /**
     * Narrow one step back toward where the walk started. Arriving back at the
     * origin releases the lock, so the preview follows the mouse again.
     */
    function narrow() {
      if (!locked) return;
      if (locked.current === locked.origin) { locked = null; return; }
      // The child of `current` that still contains the origin.
      let child: Element = locked.origin;
      while (child.parentElement && child.parentElement !== locked.current) child = child.parentElement;
      if (child.parentElement === locked.current) locked.current = child;
      if (locked.current === locked.origin) locked = null;
    }

    /** Redraw highlight + badge for whatever is currently previewed. */
    function reflect() {
      if (!ui) return;
      const el = preview();
      if (!el) { ui.hideHighlight(); ui.setBadge(badgeHtml()); return; }
      const cls = Array.from(el.classList).slice(0, 2).join(".");
      const label = `${locked ? "🔒 " : ""}<${el.tagName.toLowerCase()}>${el.id ? `#${el.id}` : ""}${cls ? `.${cls}` : ""}`;
      ui.showHighlight(el, label);
      ui.setBadge(badgeHtml());
    }

    function onMove(e: MouseEvent) {
      if (!armed || !ui) return;
      hovered = targetOf(e);
      // While locked the mouse is ignored, so a stray movement cannot discard a
      // selection you walked up to.
      if (locked) return;
      reflect();
    }

    /** Add an element to the capture set and end the current walk. */
    function capture(el: Element | null) {
      if (!el || !ui) return;
      const already = captured.includes(el);
      if (!already) captured.push(el);
      // A capture ends the walk; the next hover starts fresh.
      locked = null;
      ui.setBadge(badgeHtml());
      ui.showHighlight(el, `${already ? "already captured" : "captured"} <${el.tagName.toLowerCase()}>`);
    }

    function onClick(e: MouseEvent) {
      if (!armed || !ui) return;
      if (ui.ownsEvent(e)) return;

      // Capture whatever is previewed — the walked-up ancestor when locked,
      // otherwise the element under the cursor.
      const el = locked?.current ?? targetOf(e);
      if (!el) return;

      // Stop the site from acting on this click — we are inspecting, not using.
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      capture(el);
    }

    async function copyCapture() {
      if (!ui) return;
      if (!captured.length) {
        ui.flash("<b>NOTHING CAPTURED</b><span class=\"keys\">click an element first</span>", badgeHtml());
        return;
      }
      const md = serializeCapture(captured);
      const ok = await copyText(md);
      if (ok) {
        ui.flash(
          `<b>COPIED</b> · ${captured.length} element${captured.length === 1 ? "" : "s"}, ${md.length} chars`
          + `<span class="keys">paste into Claude Code</span>`,
          badgeHtml(),
        );
      } else {
        // Never lose the work: fall back to the console so it can be copied out.
        console.warn("Autodarts Tools picker: clipboard write failed, dumping below.");
        console.log(md);
        ui.flash("<b>CLIPBOARD BLOCKED</b><span class=\"keys\">report dumped to console</span>", badgeHtml());
      }
    }

    function arm() {
      armed = true;
      ui ??= new PickerUi();
      ui.setBadge(badgeHtml());
      // Capture phase, so the site's own handlers never see these events.
      document.addEventListener("mousemove", onMove, true);
      document.addEventListener("click", onClick, true);
      console.log("Autodarts Tools picker: armed (Alt+Shift+P to disarm)");
    }

    function disarm() {
      armed = false;
      locked = null;
      hovered = null;
      document.removeEventListener("mousemove", onMove, true);
      document.removeEventListener("click", onClick, true);
      ui?.hideHighlight();
      ui?.setBadge("", false);
      console.log("Autodarts Tools picker: disarmed");
    }

    document.addEventListener("keydown", (e) => {
      // Alt+Shift+P toggles. Alt+T is WXT's extension-reload command.
      if (e.altKey && e.shiftKey && e.code === "KeyP") {
        e.preventDefault();
        armed ? disarm() : arm();
        return;
      }
      if (!armed) return;

      if (e.code === "Escape") {
        e.preventDefault();
        // Escape releases a lock first; only a second press disarms, so you
        // can back out of a walk without losing the whole session.
        if (locked) { locked = null; reflect(); } else disarm();
      } else if (e.code === "KeyC") { e.preventDefault(); void copyCapture(); }
      // Capture without clicking — useful once you have walked up the tree and
      // the cursor is no longer over the element you actually want, and for
      // elements that would react badly to a click.
      else if (e.code === "KeyE") { e.preventDefault(); capture(preview()); }
      else if (e.code === "ArrowUp") { e.preventDefault(); widen(); reflect(); }
      else if (e.code === "ArrowDown") { e.preventDefault(); narrow(); reflect(); }
      else if (e.code === "KeyR") {
        e.preventDefault();
        captured.length = 0;
        locked = null;
        ui?.hideHighlight();
        ui?.setBadge(badgeHtml());
      }
    }, true);

    console.log("Autodarts Tools picker: ready — Alt+Shift+P to arm");
  },
});
