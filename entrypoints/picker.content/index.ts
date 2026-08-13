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
 * The entire body is behind `import.meta.env.DEV`, so Vite dead-code-eliminates
 * it from production builds — this never ships to users.
 */

import { serializeCapture } from "./serialize";
import { PickerUi } from "./ui";

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
  matches: [ "*://play.autodarts.com/*", "*://play-v2.autodarts.com/*" ],
  runAt: "document_idle",

  main() {
    if (!import.meta.env.DEV) return;

    let ui: PickerUi | null = null;
    let armed = false;

    /**
     * `current` is what gets serialized; `original` is where the click landed.
     * Arrow keys walk `current` up and down that lineage, so you can click
     * roughly and then widen to the container you actually meant.
     */
    interface Capture { current: Element; original: Element }
    const captured: Capture[] = [];

    const badgeHtml = () =>
      `<b>DOM PICKER</b> · ${captured.length} captured`
      + `<span class="keys">click · ↑↓ widen/narrow · C copy · R reset · Esc off</span>`;

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

    /** Widen the most recent capture to its parent. */
    function widen() {
      const last = captured.at(-1);
      if (last?.current.parentElement) last.current = last.current.parentElement;
    }

    /** Narrow back down one step toward where the click actually landed. */
    function narrow() {
      const last = captured.at(-1);
      if (!last || last.current === last.original) return;
      // The child of `current` that still contains the original pick.
      let child: Element = last.original;
      while (child.parentElement && child.parentElement !== last.current) child = child.parentElement;
      if (child.parentElement === last.current) last.current = child;
    }

    function onMove(e: MouseEvent) {
      if (!armed || !ui) return;
      const el = targetOf(e);
      if (!el) { ui.hideHighlight(); return; }
      const cls = Array.from(el.classList).slice(0, 2).join(".");
      ui.showHighlight(el, `<${el.tagName.toLowerCase()}>${el.id ? `#${el.id}` : ""}${cls ? `.${cls}` : ""}`);
    }

    function onClick(e: MouseEvent) {
      if (!armed || !ui) return;
      if (ui.ownsEvent(e)) return;
      const el = targetOf(e);
      if (!el) return;

      // Stop the site from acting on this click — we are inspecting, not using.
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      if (!captured.some(c => c.current === el)) captured.push({ current: el, original: el });
      ui.setBadge(badgeHtml());
      ui.showHighlight(el, `captured <${el.tagName.toLowerCase()}>`);
    }

    /** Re-highlight the most recent capture, after ↑/↓ changed it. */
    function reflectLatest() {
      const last = captured.at(-1);
      if (!last || !ui) return;
      ui.showHighlight(last.current, `captured <${last.current.tagName.toLowerCase()}>`);
      ui.setBadge(badgeHtml());
    }

    async function copyCapture() {
      if (!ui) return;
      if (!captured.length) {
        ui.flash("<b>NOTHING CAPTURED</b><span class=\"keys\">click an element first</span>", badgeHtml());
        return;
      }
      const md = serializeCapture(captured.map(c => c.current));
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

      if (e.code === "Escape") { e.preventDefault(); disarm(); }
      else if (e.code === "KeyC") { e.preventDefault(); void copyCapture(); }
      else if (e.code === "ArrowUp") { e.preventDefault(); widen(); reflectLatest(); }
      else if (e.code === "ArrowDown") { e.preventDefault(); narrow(); reflectLatest(); }
      else if (e.code === "KeyR") {
        e.preventDefault();
        captured.length = 0;
        ui?.hideHighlight();
        ui?.setBadge(badgeHtml());
      }
    }, true);

    console.log("Autodarts Tools picker: ready — Alt+Shift+P to arm");
  },
});
