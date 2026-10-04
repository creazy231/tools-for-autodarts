/**
 * Teams' switch cards in the lobby (entrypoints/lobby.content/teams.ts), Online
 * Teams' and the partner rule's, apart from the page so a test can run them.
 * Each is a copy of the site's Autoscoring card, and they go under it, in its
 * row, in the right-hand column.
 */

import { SELECTORS, qs, qsa } from "@/utils/selectors";

/** On each of Teams' switch cards: LOBBY_CSS styles their lines, and the fallback, by it. */
export const SWITCH_CARD_ATTR = "data-adt-switch-card";
/** On a card in Autoscoring's row: LOBBY_CSS makes that row two columns. */
export const BESIDE_ATTR = "data-adt-beside";
/** On a card built with no Autoscoring card to copy: LOBBY_CSS draws it in the site's measured styles. */
export const FALLBACK_ATTR = "data-adt-fallback";

/**
 * The site's last switch card, Autoscoring, which Teams' cards copy and follow.
 * Indexed, not .at(-1): Safari has Array.prototype.at from 15.4, and the app
 * supports iOS 15.0.
 */
export function siteSwitchCard(root: ParentNode = document): HTMLElement | undefined {
  const cards = qsa<HTMLElement>(SELECTORS.lobby.switchCard, root);
  return cards[cards.length - 1];
}

/** A shallow copy of one of the site's elements, so it keeps the site's styling; or a plain one when there's nothing to copy. */
function copyOf<K extends keyof HTMLElementTagNameMap>(source: Element | null | undefined, tag: K, doc: Document): HTMLElementTagNameMap[K] {
  const copy = (source ? source.cloneNode(false) : doc.createElement(tag)) as HTMLElementTagNameMap[K];
  copy.removeAttribute("id");
  return copy;
}

/**
 * A switch card, as a copy of the site's Autoscoring card: its card, header,
 * title and switch, which Base UI drives there and `onToggle` here, with the
 * opposite of what the switch shows. With no card to copy, the same thing in
 * the site's measured styles (LOBBY_CSS). It has an empty line for each name in
 * `lines`; the caller writes the title and the lines.
 */
export function buildSwitchCard(id: string, template: HTMLElement | null, lines: readonly string[], onToggle: (on: boolean) => void): HTMLElement {
  const doc = template?.ownerDocument ?? document;
  const header = template?.querySelector(":scope > [data-slot='card-header']");
  const siteSwitch = header?.querySelector("[data-slot='switch']");
  const content = template?.querySelector(":scope > [data-slot='card-content']");

  const card = copyOf(template, "div", doc);
  card.id = id;
  card.setAttribute(SWITCH_CARD_ATTR, "");
  if (!template) card.setAttribute(FALLBACK_ATTR, "");
  const head = copyOf(header, "div", doc);
  const title = copyOf(header?.querySelector("[data-slot='card-title']"), "div", doc);
  title.setAttribute("data-adt-title", "");
  const toggle = copyOf(siteSwitch, "span", doc);
  toggle.append(copyOf(siteSwitch?.querySelector("[data-slot='switch-thumb']"), "span", doc));
  toggle.setAttribute("role", "switch");
  toggle.setAttribute("tabindex", "0");
  toggle.addEventListener("click", () => onToggle(toggle.getAttribute("aria-checked") !== "true"));
  toggle.addEventListener("keydown", (event) => {
    if (event.key !== " " && event.key !== "Enter") return;
    event.preventDefault();
    onToggle(toggle.getAttribute("aria-checked") !== "true");
  });
  head.append(title, toggle);
  const body = copyOf(content, "div", doc);
  // The lines are our own, in the style of the site's card line ("You'll score
  // this match yourself", LOBBY_CSS). Copying Autoscoring's first line took the
  // board picker's text style whenever autoscoring was on.
  for (const name of lines) {
    const line = doc.createElement("span");
    line.setAttribute("data-adt-line", name);
    body.append(line);
  }
  card.append(head, body);
  return card;
}

/** The switch as the site draws its own: its data attributes pick the colours, and the thumb follows. */
export function renderSwitch(card: HTMLElement, on: boolean) {
  const toggle = card.querySelector<HTMLElement>("[role='switch']");
  if (!toggle) return;
  for (const part of [ toggle, toggle.firstElementChild ]) {
    part?.toggleAttribute("data-checked", on);
    part?.toggleAttribute("data-unchecked", !on);
  }
  if (toggle.getAttribute("aria-checked") !== String(on)) toggle.setAttribute("aria-checked", String(on));
}

/**
 * Teams' switch cards, in the order given, after the site's last switch card,
 * in its row, or failing that, under the game's own card, in its column; only
 * the first makes the row two columns (LOBBY_CSS). A card already in its place
 * is left where it is, so that running this on every frame changes nothing.
 */
export function placeSwitchCards(cards: readonly HTMLElement[], root: ParentNode = document) {
  const switchCard = siteSwitchCard(root);
  let anchor: HTMLElement | null = switchCard ?? qs<HTMLElement>(SELECTORS.lobby.gameCard, root);
  if (!anchor) return;
  for (const card of cards) {
    card.toggleAttribute(BESIDE_ATTR, Boolean(switchCard));
    if (anchor.nextElementSibling !== card) anchor.after(card);
    anchor = card;
  }
}
