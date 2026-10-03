/**
 * yarn i18n:check [file …]
 *
 * Fails when Tools' text is not ready in all three languages. Two halves:
 *
 * The catalogs (always, all of locales/):
 * - a German or Dutch key English doesn't have, or an English key one lacks;
 * - a string where English has a plural, or a plural where it has a string;
 * - a `{placeholder}` or inline tag (`<b>`, `<i>`, `<code>`, `<br>`) that
 *   differs from the English, form by form for a plural, where only the `one`
 *   form may leave out `{count}`;
 * - an empty message, or a plural that is not exactly `{ one, other }`;
 * - a German or Dutch text still word for word the English: a sentence of
 *   three words or more unless locales/untranslated.json allows it, and a word
 *   or two with letters unless locales/same-as-english.json lists its key — a
 *   name or the site's own word ("Board") that is right as it is;
 * - a key on that list that is no longer such a text;
 * - in any language, a tag that is never closed, closes nothing, or crosses
 *   another (`<b>a <i>b</b></i>`).
 *
 * The source (every .vue and .ts file the extension ships, or only the files
 * named on the command line):
 * - text with letters in a template, or in an attribute people read;
 * - a literal with letters that a template expression shows: in `{{ }}`, or
 *   bound to such an attribute (`:title="editing ? 'Edit sound' : …"`);
 * - a literal with letters handed to textContent, innerHTML, title, an
 *   aria-label, a `data-adt-…-label` or `data-adt-…-message` attribute that
 *   CSS draws, the message of a notification (not its "error" type), the title
 *   and message of a confirm dialog, `append()`, `replaceChildren()`,
 *   `insertAdjacentText()`, `prompt()`, or a `label`, `title`, `description`,
 *   … property;
 * - prose that a function returns, that an arrow function gives, that a
 *   `ref()` or `computed()` starts with, or that a ref's value is assigned
 *   (`error.value = "…"`, `||=`, `??=`; not a form control's): two words or
 *   more, and nothing only code writes, so that keys, classes, selectors,
 *   URLs and tokens pass;
 * - in all of these, every literal that can be shown: each branch of `?:`,
 *   both sides of `||`, `??` and `+`, the right side of `&&`, through `as`,
 *   `satisfies` and `!`, a template literal's own text — never the key handed
 *   to `t()`, a comparison, or an option such as `:variant="'error'"`;
 * - a `t("key", …)` call or `<AppTrans path="key">` whose key English doesn't
 *   have, or whose params leave out a `{placeholder}` of its message — or the
 *   `count` of a plural — which would show the raw `{name}`;
 * - `v-html`, or a translated text handed to innerHTML: a param in it could
 *   become markup;
 * - a .vue file that does not parse or compile, which stops the dev build
 *   without a word.
 *
 * The source half catches the usual shapes, not every one; the site's debug
 * switch (CLAUDE.md, "Translations") finds the rest on screen. What may stay
 * literal — names, units — is listed in locales/untranslated.json, and nothing
 * else may. Which German or Dutch words are rightly the English is listed by
 * key in locales/same-as-english.json.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as sfc from "vue/compiler-sfc";
import ts from "typescript";

import { CATALOGS } from "../locales";
import SAME_AS_ENGLISH from "../locales/same-as-english.json";
import UNTRANSLATED from "../locales/untranslated.json";

export interface Problem {
  where: string;
  what: string;
}

type Untranslated = readonly string[];

// ------------------------------------------------------------------ catalogs

const TAG = /<\/?(?:b|i|code)>|<br\s*\/?>/g;
const PLACEHOLDER = /\{(\w+)\}/g;

function isPluralLike(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && ("one" in value || "other" in value);
}

/** Every leaf of a catalog by its key path. A leaf is a string, a plural, or something wrong. */
export function flatten(node: unknown, prefix = "", out = new Map<string, unknown>()): Map<string, unknown> {
  for (const [ key, value ] of Object.entries(node as Record<string, unknown>)) {
    const at = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "object" && value !== null && !isPluralLike(value)) flatten(value, at, out);
    else out.set(at, value);
  }
  return out;
}

/** A leaf's forms: one for a string, `.one` and `.other` for a plural. */
function forms(value: unknown): [ string, string ][] {
  if (typeof value === "string") return [ [ "", value ] ];
  if (isPluralLike(value)) return [ [ ".one", String(value.one ?? "") ], [ ".other", String(value.other ?? "") ] ];
  return [];
}

/**
 * What must match across languages: the placeholders and tags, in any order.
 * Only a plural's `one` form may leave out `{count}` ("Eine Datei"): `other`
 * also covers 0, 2 and up, and decimals, and without it the number is gone.
 */
function signature(text: string, countOptional: boolean): string {
  const placeholders = [ ...text.matchAll(PLACEHOLDER) ].map(m => `{${m[1]}}`).filter(p => !(countOptional && p === "{count}"));
  const tags = (text.match(TAG) ?? []).map(tag => (tag.startsWith("<br") ? "<br>" : tag));
  return [ ...placeholders, ...tags ].sort().join(" ");
}

function words(text: string): number {
  return text.replace(TAG, " ").replace(PLACEHOLDER, " ").split(/\s+/).filter(word => /\p{L}/u.test(word)).length;
}

/**
 * What is wrong with a message's tags, if anything. <AppTrans> shows a closing
 * tag it cannot pair as characters — one that closes nothing, or one that
 * crosses another (`<b>a <i>b</b></i>`) — and a tag left open runs to the end
 * of the message.
 */
function tagProblem(text: string): string | undefined {
  const open: string[] = [];
  for (const [ tag, name ] of text.matchAll(/<\/?(b|i|code)>/g)) {
    if (!tag.startsWith("</")) open.push(name);
    else if (open.at(-1) === name) open.pop();
    else return open.includes(name) ? `${tag} comes before </${open.at(-1)}>: tags must nest` : `${tag} closes no <${name}>`;
  }
  return open.length ? `<${open[0]}> is not closed` : undefined;
}

/**
 * The keys whose German or Dutch is rightly the English, by language: texts of
 * one or two words such as a name, the site's own word ("Board", "Leg")
 * or a number with its unit. A plural's form is listed as `key.one` or
 * `key.other`. Phrases that stay go in untranslated.json instead.
 */
type SameAsEnglish = Readonly<Record<string, readonly string[]>>;

export function checkCatalogs(catalogs: Record<string, unknown>, untranslated: Untranslated, sameAsEnglish: SameAsEnglish = {}): Problem[] {
  const problems: Problem[] = [];
  const english = flatten(catalogs.en);

  for (const [ language, catalog ] of Object.entries(catalogs)) {
    const leaves = flatten(catalog);

    for (const [ key, value ] of leaves) {
      const where = `locales/${language}: ${key}`;
      if (typeof value !== "string" && !isPluralLike(value)) {
        problems.push({ where, what: "is neither a string nor { one, other }" });
        continue;
      }
      if (isPluralLike(value) && (Object.keys(value).sort().join() !== "one,other" || typeof value.one !== "string" || typeof value.other !== "string")) {
        problems.push({ where, what: "a plural needs exactly two strings, one and other" });
        continue;
      }
      for (const [ form, text ] of forms(value)) {
        if (!text.trim()) problems.push({ where: where + form, what: "is empty" });
        const tag = tagProblem(text);
        if (tag) problems.push({ where: where + form, what: tag });
      }
    }

    if (language === "en") continue;

    const listed = new Set(sameAsEnglish[language] ?? []);
    // The listed keys that are still a short text identical to the English: the rest are stale.
    const stillSame = new Set<string>();

    for (const key of english.keys()) {
      if (!leaves.has(key)) problems.push({ where: `locales/${language}: ${key}`, what: "is missing" });
    }
    for (const [ key, value ] of leaves) {
      const source = english.get(key);
      if (source === undefined) {
        problems.push({ where: `locales/${language}: ${key}`, what: "is not in English" });
        continue;
      }
      // t() picks a plural's form by `count`, and shows a string as it is: the shapes must match.
      if (isPluralLike(source) !== isPluralLike(value)) {
        problems.push({ where: `locales/${language}: ${key}`, what: isPluralLike(source) ? "is a plural in English: it needs { one, other }" : "is a string in English, not a plural" });
        continue;
      }
      const theirs = new Map(forms(value));
      for (const [ form, text ] of forms(source)) {
        const translated = theirs.get(form) ?? "";
        const where = `locales/${language}: ${key}${form}`;
        const countOptional = form === ".one";
        if (signature(text, countOptional) !== signature(translated, countOptional)) {
          problems.push({ where, what: `placeholders or tags differ: en "${signature(text, countOptional)}", ${language} "${signature(translated, countOptional)}"` });
        }
        // Still the English: a sentence only if untranslated.json allows it, a word or two (one
        // with letters) also if same-as-english.json lists its key.
        if (translated === text && !untranslated.includes(text)) {
          const count = words(text);
          if (count >= 3) {
            problems.push({ where, what: `is still the English: "${text}"` });
          } else if (count > 0 && listed.has(key + form)) {
            stillSame.add(key + form);
          } else if (count > 0) {
            problems.push({ where, what: `is the English, "${text}": translate it, or add "${key}${form}" to "${language}" in locales/same-as-english.json if it is right as it is` });
          }
        }
      }
    }
    for (const key of listed) {
      if (!stillSame.has(key)) {
        problems.push({ where: `locales/same-as-english.json: ${language} "${key}"`, what: "is not a word or two that is still the English: take it off the list" });
      }
    }
  }
  return problems;
}

// -------------------------------------------------------------------- source

/** The English catalog by key path, for checking what each `t()` call hands its message. */
type English = ReadonlyMap<string, unknown>;

/** The placeholders a message needs filled: every `{name}` in any of its forms, and `count` for a plural. */
function needs(message: unknown): Set<string> {
  const names = new Set<string>();
  for (const [ , text ] of forms(message)) for (const match of text.matchAll(PLACEHOLDER)) names.add(match[1]);
  if (isPluralLike(message)) names.add("count");
  return names;
}

/**
 * The names an object literal gives, or undefined when it can't be told
 * (a spread, a variable): then the call is not checked.
 */
function givenNames(node: ts.Expression | undefined): Set<string> | undefined {
  if (!node) return new Set();
  if (!ts.isObjectLiteralExpression(node)) return undefined;
  const names = new Set<string>();
  for (const property of node.properties) {
    if (ts.isSpreadAssignment(property)) return undefined;
    if ((ts.isPropertyAssignment(property) || ts.isShorthandPropertyAssignment(property) || ts.isMethodDeclaration(property))
      && (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name))) {
      names.add(property.name.text);
    }
  }
  return names;
}

/** `t("key", { … })` calls in a piece of code whose params miss what the English message needs. */
function checkCalls(file: string, line: (node: ts.Node) => number, tree: ts.SourceFile, english: English | undefined, problems: Problem[]): void {
  if (!english) return;
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "t" && node.arguments[0]) {
      const key = literalText(node.arguments[0]);
      if (key !== undefined && !ts.isTemplateExpression(node.arguments[0])) {
        const message = english.get(key);
        const given = givenNames(node.arguments[1]);
        if (message === undefined) {
          problems.push({ where: `${file}:${line(node)}`, what: `t("${key}"): no such key in English` });
        } else if (given) {
          const missing = [ ...needs(message) ].filter(name => !given.has(name));
          if (missing.length) problems.push({ where: `${file}:${line(node)}`, what: `t("${key}") is missing ${missing.map(name => `{${name}}`).join(", ")}` });
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(tree);
}

/**
 * A template expression — what `{{ }}` or a directive such as `:title` holds —
 * parsed as script code: the whole tree, and the expression itself.
 */
function parseExpression(file: string, code: string): { tree: ts.SourceFile; expression: ts.Expression | undefined } {
  const tree = ts.createSourceFile(file, `(${code});`, ts.ScriptTarget.Latest, true);
  const statement = tree.statements[0];
  const wrapped = statement && ts.isExpressionStatement(statement) ? statement.expression : undefined;
  return { tree, expression: wrapped && ts.isParenthesizedExpression(wrapped) ? wrapped.expression : wrapped };
}

/** A finding's text on one line, cut to what a terminal shows. */
function excerpt(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, 90);
}

const phrasePatterns = new WeakMap<Untranslated, RegExp[]>();

/** The allowed names and units as whole-word patterns, longest first ("Autodarts Tools" before "Autodarts"). */
function allowedPhrases(untranslated: Untranslated): RegExp[] {
  let patterns = phrasePatterns.get(untranslated);
  if (!patterns) {
    patterns = [ ...untranslated ]
      .sort((a, b) => b.length - a.length)
      .map(phrase => new RegExp(`(?<![\\p{L}\\p{N}])${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{N}])`, "gu"));
    phrasePatterns.set(untranslated, patterns);
  }
  return patterns;
}

/** A CSS colour such as `#ffffff` has letters in it, but nobody reads it. */
const CSS_COLOUR = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/** Has letters a person reads, once the names and units allowed to stay are taken out: "· WLED" has none. */
function readable(text: string, untranslated: Untranslated): boolean {
  let rest = text.replace(/\s+/g, " ");
  if (CSS_COLOUR.test(rest.trim())) return false;
  for (const pattern of allowedPhrases(untranslated)) rest = rest.replace(pattern, " ");
  return /\p{L}/u.test(rest);
}

/** HTML attributes a person reads. */
const TEXT_ATTRIBUTES = new Set([ "title", "placeholder", "alt", "aria-label", "aria-description", "aria-roledescription", "aria-valuetext", "aria-placeholder" ]);

/**
 * An attribute whose value CSS draws with `content: attr(…)`, which is how
 * Tools shows text in a stylesheet: `data-adt-replay-label`,
 * `data-adt-winner-message`. A person reads it as they read a title.
 */
const DRAWN_TEXT_ATTRIBUTE = /^data-adt-(?:[\w-]+-)?(?:label|message)$/;

/** The same attribute written through `dataset`: `el.dataset.adtReplayLabel`. */
const DRAWN_TEXT_DATASET = /^adt\w*(?:Label|Message)$/;

/** Component props that are never text. Every other static prop of a component is checked. */
const NON_TEXT_PROPS = new Set([
  "class", "class-name", "id", "key", "ref", "type", "size", "button-size", "variant", "icon", "name", "value",
  "align", "side", "position", "mode", "tag", "path", "unit", "accept", "autocomplete", "inputmode", "href", "src",
  "to", "target", "rel", "for", "role", "width", "layout", "color", "as", "style", "slot",
]);

/** A single token starting lower-case, like size="sm", variant="error" or feature="soundFx", is an option, not text. */
const OPTION_TOKEN = /^[a-z][a-zA-Z0-9-]*$/;

/**
 * A prop named for the key it holds (`add-key`, `name-key`): `add-key="library.upload.addSounds"` points at a
 * message, it is not text. A key prop whose value is no key of the English catalog is still reported.
 */
const KEY_PROP = /-key$/;

/**
 * Whether a prop holds text a person reads: on an element, an attribute such
 * as `title` or `aria-label`; on a component, any prop but the ones that never
 * do (`size`, `icon`, `*-class`, `data-*`, …). On either, an attribute CSS
 * draws. Written out or bound alike.
 */
function textProp(name: string, isComponent: boolean): boolean {
  if (DRAWN_TEXT_ATTRIBUTE.test(name)) return true;
  return isComponent
    ? !NON_TEXT_PROPS.has(name) && !/(class|icon)$/.test(name) && !name.startsWith("data-")
    : TEXT_ATTRIBUTES.has(name);
}

export function scanVue(file: string, source: string, untranslated: Untranslated, english?: English): Problem[] {
  const problems: Problem[] = [];
  const { descriptor, errors } = sfc.parse(source, { filename: file });
  const at = (line: number) => `${file}:${line}`;

  /**
   * A template expression, read as script code: its `t()` calls must give the
   * values their messages need. Where the expression is itself shown —
   * `shownAs` names the `{{ }}` or the bound text prop — every literal it
   * yields is text too, as in a script. On a component, a literal that is one
   * lower-case token is an option, as written out: `:variant="'error'"`.
   */
  const checkExpression = (line: number, code: string, shownAs?: string, isComponent = false) => {
    if (!shownAs && !code.includes("t(")) return;
    const { tree, expression } = parseExpression(file, code);
    checkCalls(file, () => line, tree, english, problems);
    if (!shownAs || !expression) return;
    const texts = shownText(expression, false).filter(text => readable(text, untranslated) && !(isComponent && OPTION_TOKEN.test(text)));
    if (texts.length) problems.push({ where: at(line), what: `${shownAs}: "${excerpt(texts.join(" / "))}"` });
  };

  const walk = (node: any) => {
    if (node.type === 2 && readable(node.content, untranslated)) {
      problems.push({ where: at(node.loc.start.line), what: `text in the template: "${node.content.trim()}"` });
    }
    // {{ editing ? "Edit sound" : t("…") }}
    if (node.type === 5 && node.content?.content) checkExpression(node.loc.start.line, node.content.content, "{{ }}");
    if (node.type === 1) {
      const isComponent = node.tagType === 1;
      for (const prop of node.props ?? []) {
        if (prop.type === 7 && prop.name === "html") {
          problems.push({ where: at(prop.loc.start.line), what: "v-html renders markup: show text, or a message through <AppTrans>" });
        }
        // :title="playing ? 'Pause' : t('…')", @click="…", v-if="…": only a bound text prop is shown.
        if (prop.type === 7 && prop.exp?.content) {
          const bound: string | undefined = prop.name === "bind" && prop.arg?.isStatic ? prop.arg.content : undefined;
          const shown = bound !== undefined && textProp(bound, isComponent);
          checkExpression(prop.loc.start.line, prop.exp.content, shown ? `:${bound}` : undefined, isComponent);
        }
        // title="A title", <OptionRow description="…">
        if (prop.type === 6 && prop.value) {
          const name: string = prop.name;
          const value: string = prop.value.content;
          const isKey = isComponent && KEY_PROP.test(name) && english?.has(value);
          if (textProp(name, isComponent) && !isKey && !(isComponent && OPTION_TOKEN.test(value)) && readable(value, untranslated)) {
            problems.push({ where: at(prop.loc.start.line), what: `${name}="${value}"` });
          }
        }
      }
      // <AppTrans path="key" :params="{ … }">, whose markers may also be filled by named slots
      if (node.tag === "AppTrans" && english) {
        const path = node.props.find((prop: any) => prop.type === 6 && prop.name === "path")?.value?.content;
        const params = node.props.find((prop: any) => prop.type === 7 && prop.arg?.content === "params")?.exp?.content;
        const slots = new Set<string>((node.children ?? [])
          .flatMap((child: any) => (child.props ?? []).filter((prop: any) => prop.type === 7 && prop.name === "slot").map((prop: any) => prop.arg?.content)));
        const message = path ? english.get(path) : undefined;
        if (path && message === undefined) {
          problems.push({ where: at(node.loc.start.line), what: `<AppTrans path="${path}">: no such key in English` });
        } else if (path) {
          const given = params ? givenNames(parseExpression(file, params).expression) : new Set<string>();
          if (given) {
            const missing = [ ...needs(message) ].filter(name => !given.has(name) && !slots.has(name));
            if (missing.length) problems.push({ where: at(node.loc.start.line), what: `<AppTrans path="${path}"> is missing ${missing.map(name => `{${name}}`).join(", ")}` });
          }
        }
      }
    }
    for (const child of node.children ?? []) walk(child);
    for (const branch of node.branches ?? []) walk(branch);
  };
  if (descriptor.template?.ast) walk(descriptor.template.ast);

  for (const block of [ descriptor.script, descriptor.scriptSetup ]) {
    if (!block) continue;
    const offset = source.slice(0, block.loc.start.offset).split("\n").length - 1;
    problems.push(...scanScript(file, block.content, untranslated, offset, english));
  }
  // Last: compiling with inlineTemplate transforms the template's AST in place.
  try {
    if (errors.length) throw errors[0];
    if (descriptor.script || descriptor.scriptSetup) {
      sfc.compileScript(descriptor, {
        id: file,
        inlineTemplate: true,
        fs: { fileExists: existsSync, readFile: name => readFileSync(name, "utf8") },
      });
    } else if (descriptor.template) {
      const { errors: templateErrors } = sfc.compileTemplate({ source: descriptor.template.content, filename: file, id: file });
      if (templateErrors.length) throw templateErrors[0];
    }
  } catch (error) {
    problems.push({ where: file, what: `does not compile: ${String((error as Error).message ?? error).split("\n")[0]}` });
  }

  return problems;
}

/** DOM properties that put text on screen. */
const TEXT_DOM_PROPERTIES = new Set([ "textContent", "innerText", "innerHTML", "outerHTML", "title", "placeholder", "alt", "ariaLabel" ]);

/**
 * Calls whose arguments are shown, and which of them, by position. A
 * notification's message is the first; its second is the type ("error") and its
 * third a duration. A confirm dialog shows a title and a message, then takes a
 * callback and options, whose `confirmText` and `cancelText` the
 * TEXT_PROPERTIES rule below already reads. Insertions into the DOM show every
 * argument, but `insertAdjacentText` only its second: the first is where
 * ("beforeend"). `prompt` shows its first, the question.
 */
const TEXT_CALLS = new Map<string, readonly number[] | "every">([
  [ "showNotification", [ 0 ] ],
  [ "showConfirmDialog", [ 0, 1 ] ],
  [ "alert", [ 0 ] ],
  [ "confirm", [ 0 ] ],
  [ "prompt", [ 0 ] ],
  [ "createTextNode", [ 0 ] ],
  [ "insertAdjacentText", [ 1 ] ],
  [ "append", "every" ],
  [ "prepend", "every" ],
  [ "before", "every" ],
  [ "after", "every" ],
  [ "replaceChildren", "every" ],
]);

/**
 * Vue's holders of a value, whose first argument a component starts with and
 * often shows: `ref("Saving the team")`. A `computed()` getter is an arrow
 * function or a function, whose prose the same rule reads where it returns.
 */
const PROSE_HOLDERS = new Set([ "ref", "shallowRef", "computed" ]);

/**
 * The assignments that leave their right side in a ref: `error.value = "…"`,
 * `error.value ||= "…"` and `error.value ??= "…"`. A component shows what its
 * refs hold, so a message assigned to one — `cameraError.value = "Camera
 * access was denied."` — is the commonest shape of shown English in this
 * codebase's scripts.
 */
const VALUE_ASSIGNMENTS = new Set([
  ts.SyntaxKind.EqualsToken, ts.SyntaxKind.BarBarEqualsToken, ts.SyntaxKind.QuestionQuestionEqualsToken,
]);

/** A name that says it is a DOM element, not a ref: `el`, `input`, `selectEl`, `audioElement`. */
const ELEMENT_NAME = /^(?:el|elem|element|input|select|textarea|field|node|target)$|(?:El|Element)$/;

/**
 * Whether `.value` on `receiver` is a ref's, whose text a component shows, and
 * not a form control's: `input.value = "flex grow"` sets what a field holds.
 * A ref is a plain name or a chain of them (`error`, `state.error`). A control
 * is named for what it is (see ELEMENT_NAME), is reached through a template ref
 * (`fileInput.value.value`), a cast, a call or a query, or is not a name at all.
 */
function isRefReceiver(receiver: ts.Expression): boolean {
  const plain = (node: ts.Expression): boolean => ts.isIdentifier(node) || node.kind === ts.SyntaxKind.ThisKeyword
    || (ts.isPropertyAccessExpression(node) && plain(node.expression));
  const name = ts.isIdentifier(receiver) ? receiver.text : ts.isPropertyAccessExpression(receiver) ? receiver.name.text : "";
  return plain(receiver) && name !== "" && name !== "value" && !ELEMENT_NAME.test(name);
}

/** Object properties that hold shown text by this codebase's conventions. */
const TEXT_PROPERTIES = new Set([
  "label", "title", "description", "hint", "message", "placeholder", "text", "body", "heading", "confirmText",
  "cancelText", "tooltip", "ariaLabel", "emptyText", "emptyTitle", "noMatchText", "searchPlaceholder", "summary",
  "intro", "subtitle", "caption", "onLabel", "offLabel",
]);

/** The text of a string or template literal, a template's `${…}` parts left out. */
function literalText(node: ts.Node): string | undefined {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isTemplateExpression(node)) return [ node.head.text, ...node.templateSpans.map(span => span.literal.text) ].join(" ");
  return undefined;
}

/** Operators whose both sides can end up on screen: `name || "Unnamed board"`, `"Delete " + name`. */
const SHOWN_OPERATORS = new Set([ ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken, ts.SyntaxKind.PlusToken ]);

/**
 * The literals an expression can put on screen: a string or template literal,
 * every branch of `?:`, both sides of `||`, `??` and `+`, and the right side
 * of `&&`, through brackets, `as`, `satisfies` and `!`. A call — `t("key")`
 * among them — a comparison or a variable yields none. In an HTML string, the
 * markup and comments are taken out.
 */
function shownText(node: ts.Node, html: boolean): string[] {
  // `("…")`, `"…" as const`, `"…" satisfies Label`, `label!`: the value is shown as it is.
  if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isSatisfiesExpression(node)
    || ts.isNonNullExpression(node) || ts.isTypeAssertionExpression(node)) {
    return shownText(node.expression, html);
  }
  // `on ? "Leave Streaming Mode" : "Streaming Mode"`: every branch is shown.
  if (ts.isConditionalExpression(node)) return [ ...shownText(node.whenTrue, html), ...shownText(node.whenFalse, html) ];
  if (ts.isBinaryExpression(node) && SHOWN_OPERATORS.has(node.operatorToken.kind)) {
    return [ ...shownText(node.left, html), ...shownText(node.right, html) ];
  }
  // `busy && "Saving the team"`: the left side is a condition, the right side is shown.
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) return shownText(node.right, html);
  const text = literalText(node);
  if (text === undefined) return [];
  return [ html ? text.replace(/<!--[\s\S]*?-->/g, " ").replace(/<[^>]*>/g, " ") : text ];
}

/**
 * What only code writes: a bracket, a brace, `<`, `>`, `\`, `~`, `^`, a
 * backtick, and a `(` straight after a word, as `rgb(` and `linear-gradient(`
 * have. Selectors, CSS, markup and code hold these. English text does not, bar
 * the `{placeholders}` and inline tags of a catalog message, which no script
 * writes as a literal. Five more count as code by habit rather than by the
 * messages: `=`, `#`, `*`, `|` and `$`. A message could hold them, and three do
 * (the WLED hints write "/win/PL=1"), so the limits of prose() list them. A `;`
 * is code too, but not where it ends a clause of prose: CODE_SEMICOLON.
 */
const CODE_CHARACTER = /[[\]{}<>=#\\|*~^$`]|[\p{L}\p{N}]\(/u;

/**
 * A `;` that is code. Prose has one when a space and a letter follow it —
 * "Pick a colour first; it is saved with the team.", as three English messages
 * do — while code has `return x;`, `a;b` and `inset: 0;`.
 */
const CODE_SEMICOLON = /;(?! \p{L})/u;

/**
 * A CSS declaration list, `position: fixed; inset: 0`, has the "; " and the
 * letter that a clause of prose has, but a property and its colon on both sides
 * of the `;`, which prose rarely does.
 */
const CSS_DECLARATIONS = /[a-z-]+\s*:[^;]*;\s*[a-z-]+\s*:/;

/**
 * A word of prose: two letters or more, perhaps joined by an apostrophe or a
 * hyphen ("didn't", "Mother-of-pearl"), perhaps between quotes, brackets or
 * sentence marks ("(click,"). A key, a token, a URL or a path is no such word:
 * `zoom.position.title`, `t20`, `ambient_180`, `https://…`, `bg-black/50`.
 */
const PROSE_WORD = /^[("„“‘'«]*\p{L}{2,}(?:['’-]\p{L}+)*[)"”’'».,!?:…]*$/u;

/**
 * A token only a class list or a selector has: a hyphen or a digit after a
 * letter (`items-center`, `px-2`, `h2`), or a `.`, `:`, `/`, `_` or `[`.
 */
const CLASS_TOKEN = /[a-z][-\d]|[.:/_[]/;

/** HTML elements, which a selector may name bare: "main section", "ul li". */
const ELEMENTS = new Set([
  "html", "body", "head", "main", "header", "footer", "nav", "section", "article", "aside", "div", "span", "ul", "ol",
  "li", "table", "thead", "tbody", "tr", "td", "th", "button", "input", "select", "option", "textarea", "label",
  "form", "img", "svg", "path", "video", "audio", "canvas", "picture", "iframe", "dialog", "details", "summary",
  "strong", "em", "small", "code", "pre", "figure", "template", "slot",
]);

/**
 * Whether a literal reads as prose, for the places that are not text by
 * themselves: what a function returns, what an arrow function gives, what a
 * `ref()` or `computed()` starts with. Those hold keys, classes, selectors,
 * CSS and tokens as often as text, so it takes more than letters: two words of
 * prose, and nothing only code writes. A key, a token, a `data-*` name and a
 * URL are one word, a selector or CSS has a code character, and a class list
 * or a bare selector is all lower case with no sentence marks, with a class
 * (`flex items-center`) or elements only (`main section`) in it. A class list
 * of plain words alone ("flex grow") still reads as two words, and lower-case
 * prose with a hyphen ("is a close-up") as a class list.
 *
 * Its limits: a sentence with an `=`, `#`, `*`, `|` or `$` in it is read as
 * code, so one that a function returns passes unseen, and so does one with a
 * `;` that no space and a letter follow.
 */
export function prose(text: string, untranslated: Untranslated): boolean {
  if (CODE_CHARACTER.test(text) || CODE_SEMICOLON.test(text) || CSS_DECLARATIONS.test(text) || !readable(text, untranslated)) return false;
  const tokens = text.trim().split(/\s+/);
  const lowerCaseCode = tokens.every(token => /^[!.]?[a-z0-9][\w:/.%!-]*$/.test(token) && !/[A-Z]|[.,:!?]$/.test(token));
  if (lowerCaseCode && (tokens.some(token => CLASS_TOKEN.test(token)) || tokens.every(token => ELEMENTS.has(token)))) return false;
  return tokens.filter(token => PROSE_WORD.test(token)).length >= 2;
}

export function scanScript(file: string, source: string, untranslated: Untranslated, lineOffset = 0, english?: English): Problem[] {
  const problems: Problem[] = [];
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  checkCalls(file, node => tree.getLineAndCharacterOfPosition(node.getStart()).line + 1 + lineOffset, tree, english, problems);
  const report = (node: ts.Node, text: string, how: string) => {
    const line = tree.getLineAndCharacterOfPosition(node.getStart()).line + 1 + lineOffset;
    problems.push({ where: `${file}:${line}`, what: `${how}: "${excerpt(text)}"` });
  };
  /** The literals `node` shows that a person reads, as one finding. */
  const check = (node: ts.Node, html: boolean, how: string) => {
    const texts = shownText(node, html).filter(text => readable(text, untranslated));
    if (texts.length) report(node, texts.join(" / "), how);
  };
  const inConsole = (node: ts.Node): boolean => {
    for (let up = node.parent; up; up = up.parent) {
      if (ts.isCallExpression(up) && /^console\./.test(up.expression.getText(tree))) return true;
    }
    return false;
  };
  /** The prose `node` returns or starts with, as one finding: keys, classes, selectors and tokens are no prose. */
  const checkProse = (node: ts.Node, how: string) => {
    if (inConsole(node)) return;
    const texts = shownText(node, false).filter(text => prose(text, untranslated));
    if (texts.length) report(node, texts.join(" / "), how);
  };

  // The file's string constants by name, for an attribute named through one: setAttribute(MESSAGE_ATTR, …).
  const constants = new Map<string, string>();
  const collect = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer
      && ts.isVariableDeclarationList(node.parent) && (node.parent.flags & ts.NodeFlags.Const) !== 0) {
      const text = literalText(node.initializer);
      if (text !== undefined && !ts.isTemplateExpression(node.initializer)) constants.set(node.name.text, text);
    }
    ts.forEachChild(node, collect);
  };
  collect(tree);

  const visit = (node: ts.Node) => {
    // element.textContent = "…", element.title = "…"
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken
      && ts.isPropertyAccessExpression(node.left) && TEXT_DOM_PROPERTIES.has(node.left.name.text)
      && !/style/i.test(node.left.expression.getText(tree))) {
      const html = node.left.name.text.endsWith("HTML");
      check(node.right, html, `.${node.left.name.text} =`);
      // A translated text, or anything with a param in it, must not go through innerHTML.
      if (html && /\bt\(/.test(node.right.getText(tree))) report(node.right, node.right.getText(tree), `translated text through .${node.left.name.text}`);
    }
    // element.dataset.adtReplayLabel = "…", which CSS draws
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken
      && ts.isPropertyAccessExpression(node.left) && DRAWN_TEXT_DATASET.test(node.left.name.text)
      && ts.isPropertyAccessExpression(node.left.expression) && node.left.expression.name.text === "dataset") {
      check(node.right, false, `.dataset.${node.left.name.text} =`);
    }

    if (ts.isCallExpression(node) && !inConsole(node)) {
      const callee = node.expression;
      const name = ts.isPropertyAccessExpression(callee) ? callee.name.text : ts.isIdentifier(callee) ? callee.text : "";
      // element.setAttribute("aria-label", "…"), element.setAttribute(MESSAGE_ATTR, "…")
      if (name === "setAttribute" && node.arguments.length === 2) {
        const [ first, value ] = node.arguments;
        const attribute = ts.isIdentifier(first) ? constants.get(first.text) : literalText(first);
        if (attribute && (TEXT_ATTRIBUTES.has(attribute) || DRAWN_TEXT_ATTRIBUTE.test(attribute))) check(value, false, `setAttribute("${attribute}")`);
      }
      const shown = TEXT_CALLS.get(name);
      if (shown) {
        for (const [ position, argument ] of node.arguments.entries()) {
          if (shown === "every" || shown.includes(position)) check(argument, false, `${name}()`);
        }
      }
    }

    // return "Give the team a name.", () => editing ? "Edit team" : "New team", ref("Saving the team")
    if (ts.isReturnStatement(node) && node.expression) checkProse(node.expression, "return");
    if (ts.isArrowFunction(node) && !ts.isBlock(node.body)) checkProse(node.body, "=>");
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && PROSE_HOLDERS.has(node.expression.text) && node.arguments[0]) {
      checkProse(node.arguments[0], `${node.expression.text}()`);
    }
    // error.value = "Invalid URL format", error.value ||= "…", error.value = entry.name || "Untitled sound"
    if (ts.isBinaryExpression(node) && VALUE_ASSIGNMENTS.has(node.operatorToken.kind)
      && ts.isPropertyAccessExpression(node.left) && node.left.name.text === "value" && isRefReceiver(node.left.expression)) {
      checkProse(node.right, `.value ${node.operatorToken.getText(tree)}`);
    }

    // { label: "…" }
    if (ts.isPropertyAssignment(node) && !inConsole(node)) {
      const key = ts.isIdentifier(node.name) || ts.isStringLiteral(node.name) ? node.name.text : "";
      if (TEXT_PROPERTIES.has(key)) check(node.initializer, false, `${key}:`);
    }

    ts.forEachChild(node, visit);
  };
  visit(tree);
  return problems;
}

// ---------------------------------------------------------------------- run

/** Code that is not the extension's, or holds no text of its own. */
const SKIPPED = [
  /^locales\//, /^scripts\//, /^socket\//, /^proxy\//, /^dev\//, /^setup\//, /^marketing\//, /^git2md\//, /^snapshots\//,
  /^Tools for Autodarts\//, /^entrypoints\/picker\.content\//, /^entrypoints\/background\.ts$/, /\.d\.ts$/,
  /^utils\/selectors\.ts$/, /^utils\/selector-index\.generated\.ts$/, /^wxt\.config\.ts$/,
];

const skipped = (file: string) => SKIPPED.some(skip => skip.test(file));

function sourceFiles(root: string, named: string[]): string[] {
  if (named.length) return named.map(file => path.relative(root, path.resolve(file)));
  const listed = execFileSync("git", [ "ls-files", "--cached", "--others", "--exclude-standard", "--", "*.vue", "*.ts" ], { cwd: root, encoding: "utf8" });
  return listed.split("\n").filter(file => file && !skipped(file) && existsSync(path.join(root, file)));
}

function main(): void {
  const root = process.cwd();
  sfc.registerTS(() => ts);

  const problems = checkCatalogs(CATALOGS, UNTRANSLATED, SAME_AS_ENGLISH);
  const english = flatten(CATALOGS.en);
  for (const file of sourceFiles(root, process.argv.slice(2))) {
    // A named file the whole run skips is skipped too: a catalog's messages are not literal text in code.
    if (skipped(file)) {
      console.log(`· ${file}: not read as code${/^locales\//.test(file) ? "; the catalogs are checked as catalogs" : ""}`);
      continue;
    }
    const source = readFileSync(path.join(root, file), "utf8");
    problems.push(...(file.endsWith(".vue") ? scanVue(file, source, UNTRANSLATED, english) : scanScript(file, source, UNTRANSLATED, 0, english)));
  }

  for (const problem of problems) console.log(`✗ ${problem.where}  ${problem.what}`);
  console.log(problems.length ? `\n${problems.length} problem(s). How to fix them: CLAUDE.md, "Translations".` : "i18n: all good.");
  process.exitCode = problems.length ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
