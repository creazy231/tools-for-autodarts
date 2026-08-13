/**
 * Turns a picked DOM element into Markdown aimed at a Claude Code session.
 *
 * The goal is not to dump the DOM - it is to answer the three questions that
 * actually block a v1 -> v2 port:
 *   1. What is a ROBUST selector for this element? (ranked, with live match
 *      counts, so a non-unique candidate is visibly non-unique)
 *   2. What stable anchors exist on its ancestors? (so a selector can be
 *      scoped rather than global)
 *   3. Which extension code already targets it? (so "where do I look" is
 *      answered without grepping)
 */

import { SELECTORS } from "@/utils/selectors";
import { SELECTOR_USAGES } from "@/utils/selector-index.generated";

// ------------------------------------------------------------- token heuristics

/**
 * Ids/classes that a framework generated and that change between renders or
 * builds. Anchoring on these produces selectors that break immediately.
 *   React useId  : ":r0:", "field-:r0:"
 *   Base UI      : "_r_h_", "base-ui-_r_6_"
 *   Emotion      : "css-1oha1tj"
 *   SVG defs     : "paint0_linear_645_2086"
 */
export function isGeneratedToken(token: string): boolean {
  return !token
    || /:[a-z0-9]+:/i.test(token)
    || /^_r_.*_$/.test(token)
    || /^base-ui-/.test(token)
    || /^css-[a-z0-9]+$/i.test(token)
    || /^paint\d+_/.test(token)
    || /^\d/.test(token);
}

/**
 * Tailwind utility classes. Useful as visual context but far too generic to
 * anchor a selector on - `.flex` matches hundreds of nodes.
 */
const UTILITY_PREFIX = /^(p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|w|h|min|max|gap|text|bg|border|rounded|shadow|z|top|left|right|bottom|space|items|justify|self|order|col|row|opacity|transition|duration|ease|scale|rotate|translate|overflow|whitespace|font|leading|tracking|cursor|select|pointer|ring|outline|backdrop|from|via|to|grid|flex|inset|size|aspect|basis|grow|shrink|place|content|divide|animate|delay|origin|fill|stroke|sr)-/;
const UTILITY_EXACT = /^(flex|grid|block|inline|inline-flex|inline-block|hidden|absolute|relative|fixed|sticky|static|truncate|container|group|peer|italic|underline|uppercase|lowercase|capitalize|antialiased)$/;

/**
 * Tailwind variant prefixes (`hover:`, `md:`, `dark:`, `group-hover:`, `[&>*]:`).
 * These must be stripped before the utility test, or `hover:text-mono-white`
 * reads as a semantic class and gets recommended as an anchor — it is not one.
 */
const VARIANT_PREFIX = /^(?:[a-z0-9-]+|\[[^\]]*\]|(?:group|peer)(?:-[a-z0-9-]+)?)\s*:/;

export function isUtilityClass(cls: string): boolean {
  let base = cls;
  // Strip any number of stacked variants: `dark:md:hover:bg-red-500`.
  while (VARIANT_PREFIX.test(base)) {
    const stripped = base.replace(VARIANT_PREFIX, "");
    if (stripped === base) break;
    base = stripped;
  }
  // A class that carried a variant prefix at all is Tailwind by construction.
  if (base !== cls) return true;
  return UTILITY_EXACT.test(base) || UTILITY_PREFIX.test(base);
}

/** Classes worth building a selector from. */
function semanticClasses(el: Element): string[] {
  return Array.from(el.classList).filter(c => !isGeneratedToken(c) && !isUtilityClass(c));
}

// ------------------------------------------------------------------- selectors

const cssEscape = (v: string) => CSS.escape(v);
const attrSel = (name: string, value: string) => `[${name}="${value.replace(/["\\]/g, "\\$&")}"]`;

/** The single best one-token selector for an element, or null. */
function anchorFor(el: Element): string | null {
  const id = el.getAttribute("id");
  if (id && !isGeneratedToken(id)) return `#${cssEscape(id)}`;

  const testid = el.getAttribute("data-testid");
  if (testid) return attrSel("data-testid", testid);

  const aria = el.getAttribute("aria-label");
  if (aria) return attrSel("aria-label", aria);

  const href = el.getAttribute("href");
  if (href) return `${el.tagName.toLowerCase()}${attrSel("href", href)}`;

  const slot = el.getAttribute("data-slot");
  if (slot) return `${el.tagName.toLowerCase()}${attrSel("data-slot", slot)}`;

  const cls = semanticClasses(el)[0];
  if (cls) return `.${cssEscape(cls)}`;

  return null;
}

/** Index among same-tag siblings, 1-based, for :nth-of-type(). */
function nthOfType(el: Element): number {
  let n = 1;
  let sib = el.previousElementSibling;
  while (sib) {
    if (sib.tagName === el.tagName) n++;
    sib = sib.previousElementSibling;
  }
  return n;
}

/** Structural path from a scoping ancestor down to the element. Last resort. */
function structuralPath(el: Element, stopAt: Element | null): string {
  const parts: string[] = [];
  let cur: Element | null = el;
  while (cur && cur !== stopAt && cur !== document.documentElement && parts.length < 6) {
    parts.unshift(`${cur.tagName.toLowerCase()}:nth-of-type(${nthOfType(cur)})`);
    cur = cur.parentElement;
  }
  return parts.join(" > ");
}

export interface Candidate {
  selector: string;
  /** How many nodes this matches document-wide. 1 == unique. */
  matches: number;
  /** Whether it actually resolves to the picked element. */
  valid: boolean;
  strategy: string;
}

function evaluate(selector: string, target: Element, strategy: string): Candidate | null {
  try {
    const all = document.querySelectorAll(selector);
    if (!Array.from(all).includes(target)) return null;
    return { selector, matches: all.length, valid: true, strategy };
  } catch {
    return null; // invalid selector
  }
}

/**
 * Ranked selector candidates for an element.
 *
 * Each raw strategy is tried unscoped first; if it is not unique, it is retried
 * scoped under each ancestor anchor, cheapest scope first. Results are sorted
 * unique-first, then by strategy priority.
 */
export function candidateSelectors(el: Element): Candidate[] {
  const out: Candidate[] = [];
  const push = (c: Candidate | null) => { if (c) out.push(c); };

  const tag = el.tagName.toLowerCase();
  const raw: Array<[string, string]> = []; // [selector, strategy]

  const id = el.getAttribute("id");
  if (id && !isGeneratedToken(id)) raw.push([ `#${cssEscape(id)}`, "id" ]);

  const testid = el.getAttribute("data-testid");
  if (testid) raw.push([ attrSel("data-testid", testid), "data-testid" ]);

  const aria = el.getAttribute("aria-label");
  if (aria) raw.push([ attrSel("aria-label", aria), "aria-label" ]);

  const slot = el.getAttribute("data-slot");
  if (slot) {
    raw.push([ attrSel("data-slot", slot), "data-slot" ]);
    raw.push([ `${tag}${attrSel("data-slot", slot)}`, "data-slot+tag" ]);
  }

  // href/placeholder/title are often the most stable thing on an element —
  // a nav link's href survives redesigns that rename every class around it.
  for (const attr of [ "href", "placeholder", "title", "alt", "data-id", "name", "type", "role" ]) {
    const v = el.getAttribute(attr);
    if (v) raw.push([ `${tag}${attrSel(attr, v)}`, attr ]);
  }

  for (const cls of semanticClasses(el).slice(0, 3)) {
    raw.push([ `.${cssEscape(cls)}`, "class" ]);
    raw.push([ `${tag}.${cssEscape(cls)}`, "class+tag" ]);
  }

  // Unscoped attempts.
  for (const [ sel, strategy ] of raw) push(evaluate(sel, el, strategy));

  // Ancestor anchors, nearest first — used both for scoping and for reporting.
  const anchors: Array<{ el: Element; sel: string }> = [];
  for (let a = el.parentElement; a && anchors.length < 5; a = a.parentElement) {
    const anchor = anchorFor(a);
    if (anchor) anchors.push({ el: a, sel: anchor });
  }

  // Scope any non-unique candidate under each ancestor anchor.
  if (!out.some(c => c.matches === 1)) {
    for (const { sel: anchorSel } of anchors) {
      for (const [ sel, strategy ] of raw) {
        push(evaluate(`${anchorSel} ${sel}`, el, `scoped:${strategy}`));
      }
      if (out.some(c => c.matches === 1)) break;
    }
  }

  // Structural fallback, scoped to the nearest anchor if there is one.
  if (!out.some(c => c.matches === 1)) {
    const nearest = anchors[0];
    const path = structuralPath(el, nearest?.el ?? null);
    if (path) push(evaluate(nearest ? `${nearest.sel} > ${path}` : path, el, "structural"));
  }

  // Deduplicate, then rank.
  const seen = new Set<string>();
  return out
    .filter(c => (seen.has(c.selector) ? false : (seen.add(c.selector), true)))
    .sort((a, b) =>
      // 1. Durability of the underlying strategy.
      tierOf(a.strategy) - tierOf(b.strategy)
      // 2. Within a tier, a selector that actually identifies one node wins.
      || (a.matches === 1 ? 0 : 1) - (b.matches === 1 ? 0 : 1)
      || a.matches - b.matches
      // 3. Only as a tiebreaker: prefer the simpler unscoped form.
      || Number(a.strategy.startsWith("scoped:")) - Number(b.strategy.startsWith("scoped:"))
      || a.selector.length - b.selector.length);
}

/**
 * How durable a strategy is across a redesign — lower is better.
 *
 * Deliberately ranked ABOVE uniqueness: a two-match `a[href="/statistics"]`
 * survives a rebuild that renames every class, while a unique
 * `.chakra-stack > a:nth-of-type(6)` breaks the moment a sibling moves. Pick
 * the durable one and scope it, rather than the unique but brittle one.
 */
function tierOf(strategy: string): number {
  // Scoping is judged by uniqueness in the sort, not penalised here — a scoped
  // selector anchored on a stable ancestor is often the best answer available.
  const base = strategy.replace(/^scoped:/, "");
  const TIERS: Record<string, number> = {
    "id": 0,
    "data-testid": 0,
    "aria-label": 1,
    "href": 1,
    "data-slot": 1,
    "data-slot+tag": 1,
    "placeholder": 2,
    "title": 2,
    "alt": 2,
    "data-id": 2,
    "name": 3,
    "class+tag": 4,
    "class": 5,
    "type": 6,
    "role": 6,
    "structural": 10,
  };
  return TIERS[base] ?? 7;
}

// ------------------------------------------------------------- code references

export interface CodeRef {
  file: string;
  line: number;
  selector: string;
  fn: string;
  on: "element" | "ancestor";
  /** How many nodes the selector matches document-wide. Lower == more specific. */
  breadth: number;
}

/**
 * Which extension code targets this element (or an ancestor of it)?
 *
 * Ancestor matches matter: features routinely select a container and then walk
 * down to the node you actually clicked, so the code that "owns" your element
 * often names an ancestor.
 */
export function findCodeReferences(el: Element): CodeRef[] {
  const refs: CodeRef[] = [];
  const seen = new Set<string>();

  for (const usage of SELECTOR_USAGES) {
    let on: "element" | "ancestor" | null = null;
    let breadth = 0;
    try {
      if (el.matches(usage.selector)) on = "element";
      else if (el.closest(usage.selector)) on = "ancestor";
      if (!on) continue;
      breadth = document.querySelectorAll(usage.selector).length;
    } catch {
      continue; // not a valid standalone selector
    }

    // A selector matching half the page ("button", "[class*='chakra-']") is
    // technically a hit but says nothing about which code owns this element.
    const isBareTag = /^[a-z][a-z0-9]*$/i.test(usage.selector);
    if (isBareTag && breadth > 5) continue;
    if (breadth > 50) continue;

    const key = `${usage.file}:${usage.line}:${usage.selector}`;
    if (seen.has(key)) continue;
    seen.add(key);
    refs.push({ ...usage, on, breadth });
  }

  // Element matches before ancestor matches, then most specific first.
  return refs.sort((a, b) =>
    (a.on === "element" ? 0 : 1) - (b.on === "element" ? 0 : 1)
    || a.breadth - b.breadth);
}

/** Which entries of the utils/selectors.ts registry match. */
export function findRegistryMatches(el: Element): string[] {
  const hits: string[] = [];
  for (const [ group, entries ] of Object.entries(SELECTORS)) {
    for (const [ key, set ] of Object.entries(entries as Record<string, readonly string[]>)) {
      for (const sel of set) {
        try {
          if (el.matches(sel)) { hits.push(`SELECTORS.${group}.${key}`); break; }
        } catch { /* invalid selector */ }
      }
    }
  }
  return hits;
}

// ----------------------------------------------------------------- serialising

function siteVersion(): string {
  if (document.querySelector("[data-slot]")) return "v2 (Tailwind + shadcn/ui)";
  if (document.querySelector("[class*='chakra-']")) return "v1 (Chakra UI)";
  return "unknown";
}

function attrsOf(el: Element): string {
  const skip = new Set([ "class", "style" ]);
  const parts = Array.from(el.attributes)
    .filter(a => !skip.has(a.name))
    .map(a => `${a.name}="${a.value.length > 60 ? `${a.value.slice(0, 60)}…` : a.value}"`);
  return parts.join(" ") || "(none)";
}

function classInfo(el: Element): string {
  const all = Array.from(el.classList);
  if (!all.length) return "(none)";
  const semantic = all.filter(c => !isGeneratedToken(c) && !isUtilityClass(c));
  const generated = all.filter(isGeneratedToken);
  const utility = all.filter(c => isUtilityClass(c) && !isGeneratedToken(c));
  const bits: string[] = [];
  if (semantic.length) bits.push(`semantic: ${semantic.join(" ")}`);
  if (utility.length) bits.push(`utility(${utility.length}): ${utility.slice(0, 12).join(" ")}${utility.length > 12 ? " …" : ""}`);
  if (generated.length) bits.push(`generated (DO NOT USE): ${generated.join(" ")}`);
  return bits.join("\n  ");
}

function ancestorChain(el: Element): string {
  const rows: string[] = [];
  let cur = el.parentElement;
  let depth = 1;
  while (cur && depth <= 8 && cur !== document.documentElement) {
    const bits: string[] = [];
    const id = cur.getAttribute("id");
    if (id) bits.push(isGeneratedToken(id) ? `id=${id} (generated)` : `#${id}`);
    const slot = cur.getAttribute("data-slot");
    if (slot) bits.push(`[data-slot="${slot}"]`);
    const aria = cur.getAttribute("aria-label");
    if (aria) bits.push(`[aria-label="${aria}"]`);
    const role = cur.getAttribute("role");
    if (role) bits.push(`[role="${role}"]`);
    const sem = semanticClasses(cur).slice(0, 3);
    if (sem.length) bits.push(`.${sem.join(".")}`);
    rows.push(`  ${"^".repeat(1)}${depth} ${cur.tagName.toLowerCase()}  ${bits.join("  ") || "(no stable anchor)"}`);
    cur = cur.parentElement;
    depth++;
  }
  return rows.join("\n") || "  (none)";
}

function textOf(el: Element): string {
  const t = (el.textContent ?? "").replace(/\s+/g, " ").trim();
  if (!t) return "(empty)";
  return t.length > 120 ? `${t.slice(0, 120)}…` : t;
}

function outerHtml(el: Element, limit = 700): string {
  const html = el.outerHTML;
  return html.length > limit ? `${html.slice(0, limit)}\n… (${html.length - limit} more chars)` : html;
}

/** One picked element as a Markdown section. */
export function serializeElement(el: Element, index: number): string {
  const rect = el.getBoundingClientRect();
  const cands = candidateSelectors(el);
  const refs = findCodeReferences(el);
  const registry = findRegistryMatches(el);

  const candLines = cands.length
    ? cands.slice(0, 8).map((c, i) => {
        const mark = c.matches === 1 ? "UNIQUE" : `${c.matches} matches`;
        return `  ${i + 1}. ${c.selector}\n       ${mark}  ·  via ${c.strategy}`;
      }).join("\n")
    : "  (none found — element has no usable anchor; see ancestors)";

  const refLines = refs.length
    ? refs.slice(0, 12).map(r =>
        `  · ${r.file}:${r.line}  ${r.fn}(${JSON.stringify(r.selector)})`
        + `  [${r.breadth} node${r.breadth === 1 ? "" : "s"}${r.on === "ancestor" ? ", matches an ANCESTOR" : ""}]`,
      ).join("\n")
    : "  (no extension code currently targets this element)";

  return `
### [${index}] \`<${el.tagName.toLowerCase()}>\` — ${textOf(el).slice(0, 60)}

**Selector candidates** (ranked, live match counts):
${candLines}

**Attributes**: ${attrsOf(el)}

**Classes**:
  ${classInfo(el)}

**Text**: ${textOf(el)}

**Box**: ${Math.round(rect.width)}×${Math.round(rect.height)} at (${Math.round(rect.x)}, ${Math.round(rect.y)})

**Ancestors** (nearest first, with their stable anchors):
${ancestorChain(el)}

**Extension code targeting this**:
${refLines}
${registry.length ? `\n**Registry entries matching**: ${registry.join(", ")}` : ""}

**outerHTML**:
\`\`\`html
${outerHtml(el)}
\`\`\`
`.trim();
}

/** The whole capture session as one pasteable Markdown document. */
export function serializeCapture(elements: Element[]): string {
  const header = `# DOM capture — ${siteVersion()}

- **URL**: ${location.href}
- **Captured**: ${elements.length} element${elements.length === 1 ? "" : "s"}
- **Viewport**: ${window.innerWidth}×${window.innerHeight}

> Selector candidates are ranked by DURABILITY first, not uniqueness: a
> semantic selector matching 2 nodes beats a unique \`:nth-of-type()\` chain,
> because the chain breaks the moment a sibling moves. Scope a durable
> candidate rather than reaching for a brittle unique one.
> "UNIQUE" means it matched exactly one node at capture time.
> Classes marked *generated* (Emotion \`css-*\`, React \`:r0:\`, Base UI \`_r_*_\`)
> change between builds — never anchor on them.
`;

  return [ header, ...elements.map((el, i) => serializeElement(el, i + 1)) ].join("\n\n---\n\n");
}
