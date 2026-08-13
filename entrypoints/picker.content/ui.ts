/**
 * Picker chrome: the highlight box and the status badge.
 *
 * Everything lives in one closed-ish shadow root attached to a single host
 * element, for two reasons: the host page's CSS cannot reach in and restyle it,
 * and the picker can reliably exclude its own DOM from being picked by checking
 * whether an event's composed path contains the host.
 *
 * All of it is pointer-events:none except nothing — the badge is informational
 * and the overlay must never intercept clicks, or picking would select the
 * overlay instead of the page.
 */

const HOST_ID = "adt-dom-picker-host";

const STYLES = `
  :host { all: initial; }
  .highlight {
    position: fixed;
    pointer-events: none;
    z-index: 2147483646;
    border: 2px solid #38bdf8;
    background: rgba(56, 189, 248, 0.12);
    border-radius: 2px;
    transition: all 60ms linear;
    display: none;
  }
  .tag {
    position: fixed;
    pointer-events: none;
    z-index: 2147483647;
    font: 500 11px/1.4 ui-monospace, SFMono-Regular, Menlo, monospace;
    background: #0369a1;
    color: #fff;
    padding: 2px 6px;
    border-radius: 3px;
    white-space: nowrap;
    max-width: 90vw;
    overflow: hidden;
    text-overflow: ellipsis;
    display: none;
  }
  .badge {
    position: fixed;
    pointer-events: none;
    z-index: 2147483647;
    bottom: 16px;
    left: 16px;
    font: 500 12px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace;
    background: #0f172a;
    color: #e2e8f0;
    border: 1px solid #334155;
    border-radius: 6px;
    padding: 8px 12px;
    box-shadow: 0 6px 24px rgba(0,0,0,.45);
    display: none;
    max-width: 60vw;
  }
  .badge b { color: #38bdf8; }
  .badge .keys { color: #94a3b8; display: block; margin-top: 4px; font-size: 11px; }
  .badge.flash { background: #14532d; border-color: #16a34a; }
`;

export class PickerUi {
  private host: HTMLElement;
  private root: ShadowRoot;
  private highlight: HTMLElement;
  private tag: HTMLElement;
  private badge: HTMLElement;

  constructor() {
    this.host = document.createElement("div");
    this.host.id = HOST_ID;
    // The host itself must not participate in layout or hit-testing.
    this.host.style.cssText = "all:initial;position:fixed;top:0;left:0;width:0;height:0;pointer-events:none;";
    this.root = this.host.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = STYLES;

    this.highlight = document.createElement("div");
    this.highlight.className = "highlight";
    this.tag = document.createElement("div");
    this.tag.className = "tag";
    this.badge = document.createElement("div");
    this.badge.className = "badge";

    this.root.append(style, this.highlight, this.tag, this.badge);
    document.documentElement.appendChild(this.host);
  }

  /** True when the event originated inside the picker's own UI. */
  ownsEvent(e: Event): boolean {
    return e.composedPath().includes(this.host);
  }

  /** True for the picker host itself, so element resolution can skip it. */
  isOwnNode(node: Node | null): boolean {
    return !!node && (node === this.host || this.host.contains(node as Node));
  }

  showHighlight(el: Element, label: string) {
    const r = el.getBoundingClientRect();
    Object.assign(this.highlight.style, {
      display: "block",
      top: `${r.top}px`,
      left: `${r.left}px`,
      width: `${r.width}px`,
      height: `${r.height}px`,
    });

    // Place the label above the box, or below it when there is no room.
    const above = r.top > 22;
    Object.assign(this.tag.style, {
      display: "block",
      top: `${above ? r.top - 20 : r.bottom + 4}px`,
      left: `${Math.max(2, r.left)}px`,
    });
    this.tag.textContent = label;
  }

  hideHighlight() {
    this.highlight.style.display = "none";
    this.tag.style.display = "none";
  }

  setBadge(html: string, visible = true) {
    this.badge.innerHTML = html;
    this.badge.style.display = visible ? "block" : "none";
  }

  /** Brief green flash to confirm a copy landed. */
  flash(html: string, revertTo: string) {
    this.badge.classList.add("flash");
    this.setBadge(html);
    setTimeout(() => {
      this.badge.classList.remove("flash");
      this.setBadge(revertTo);
    }, 1400);
  }

  destroy() {
    this.host.remove();
  }
}
