/**
 * yarn i18n:check [file …]
 *
 * Fails when Tools' text is not ready in all three languages. Two halves:
 *
 * The catalogs (always, all of locales/):
 * - a German or Dutch key English doesn't have, or an English key one lacks;
 * - a `{placeholder}` or inline tag (`<b>`, `<i>`, `<code>`, `<br>`) that
 *   differs from the English, form by form for a plural (`{count}` aside);
 * - an empty message, or a plural that is not exactly `{ one, other }`;
 * - a German or Dutch sentence of three words or more still word for word the
 *   English;
 * - an English tag that is never closed.
 *
 * The source (every .vue and .ts file the extension ships, or only the files
 * named on the command line):
 * - text with letters in a template, or in an attribute people read;
 * - a literal with letters handed to textContent, innerHTML, title, an
 *   aria-label, the message of a notification (not its "error" type), the
 *   title and message of a confirm dialog, `append()`, or a `label`,
 *   `title`, `description`, … property;
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
 * else may.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as sfc from "vue/compiler-sfc";
import ts from "typescript";

import { CATALOGS } from "../locales";
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

/** What must match across languages: the placeholders and tags, in any order. */
function signature(text: string, plural: boolean): string {
  const placeholders = [ ...text.matchAll(PLACEHOLDER) ].map(m => `{${m[1]}}`).filter(p => !(plural && p === "{count}"));
  const tags = (text.match(TAG) ?? []).map(tag => (tag.startsWith("<br") ? "<br>" : tag));
  return [ ...placeholders, ...tags ].sort().join(" ");
}

function words(text: string): number {
  return text.replace(TAG, " ").replace(PLACEHOLDER, " ").split(/\s+/).filter(word => /\p{L}/u.test(word)).length;
}

function unclosedTag(text: string): string | undefined {
  const open: string[] = [];
  for (const [ tag ] of text.matchAll(/<(\/?)(b|i|code)>/g)) {
    if (!tag.startsWith("</")) open.push(tag);
    else if (open.at(-1) === tag.replace("/", "")) open.pop();
    else return tag;
  }
  return open[0];
}

export function checkCatalogs(catalogs: Record<string, unknown>, untranslated: Untranslated): Problem[] {
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
        if (language === "en") {
          const tag = unclosedTag(text);
          if (tag) problems.push({ where: where + form, what: `${tag} is not closed` });
        }
      }
    }

    if (language === "en") continue;

    for (const key of english.keys()) {
      if (!leaves.has(key)) problems.push({ where: `locales/${language}: ${key}`, what: "is missing" });
    }
    for (const [ key, value ] of leaves) {
      const source = english.get(key);
      if (source === undefined) {
        problems.push({ where: `locales/${language}: ${key}`, what: "is not in English" });
        continue;
      }
      const plural = isPluralLike(source);
      const theirs = new Map(forms(value));
      for (const [ form, text ] of forms(source)) {
        const translated = theirs.get(form) ?? "";
        const where = `locales/${language}: ${key}${form}`;
        if (signature(text, plural) !== signature(translated, plural)) {
          problems.push({ where, what: `placeholders or tags differ: en "${signature(text, plural)}", ${language} "${signature(translated, plural)}"` });
        }
        if (translated === text && words(text) >= 3 && !untranslated.includes(text)) {
          problems.push({ where, what: `is still the English: "${text}"` });
        }
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

/** A template expression, `t("key", { n })` in `{{ }}` or a `:prop`, checked like script code. */
function checkExpression(file: string, at: number, expression: string, english: English | undefined, problems: Problem[]): void {
  if (!english || !expression.includes("t(")) return;
  const tree = ts.createSourceFile(file, `(${expression});`, ts.ScriptTarget.Latest, true);
  checkCalls(file, () => at, tree, english, problems);
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

/** Has letters a person reads, once the names and units allowed to stay are taken out: "· WLED" has none. */
function readable(text: string, untranslated: Untranslated): boolean {
  let rest = text.replace(/\s+/g, " ");
  for (const pattern of allowedPhrases(untranslated)) rest = rest.replace(pattern, " ");
  return /\p{L}/u.test(rest);
}

/** HTML attributes a person reads. */
const TEXT_ATTRIBUTES = new Set([ "title", "placeholder", "alt", "aria-label", "aria-description", "aria-roledescription", "aria-valuetext", "aria-placeholder" ]);

/** Component props that are never text. Every other static prop of a component is checked. */
const NON_TEXT_PROPS = new Set([
  "class", "class-name", "id", "key", "ref", "type", "size", "button-size", "variant", "icon", "name", "value",
  "align", "side", "position", "mode", "tag", "path", "unit", "accept", "autocomplete", "inputmode", "href", "src",
  "to", "target", "rel", "for", "role", "width", "layout", "color", "as", "style", "slot",
]);

/** A single token starting lower-case, like size="sm", variant="error" or feature="soundFx", is an option, not text. */
const OPTION_TOKEN = /^[a-z][a-zA-Z0-9-]*$/;

export function scanVue(file: string, source: string, untranslated: Untranslated, english?: English): Problem[] {
  const problems: Problem[] = [];
  const { descriptor, errors } = sfc.parse(source, { filename: file });
  const at = (line: number) => `${file}:${line}`;

  const walk = (node: any) => {
    if (node.type === 2 && readable(node.content, untranslated)) {
      problems.push({ where: at(node.loc.start.line), what: `text in the template: "${node.content.trim()}"` });
    }
    // {{ t("key", { … }) }}
    if (node.type === 5 && node.content?.content) {
      checkExpression(file, node.loc.start.line, node.content.content, english, problems);
    }
    if (node.type === 1) {
      for (const prop of node.props ?? []) {
        // :title="t('key')"
        if (prop.type === 7 && prop.exp?.content) checkExpression(file, prop.loc.start.line, prop.exp.content, english, problems);
        if (prop.type === 7 && prop.name === "html") {
          problems.push({ where: at(prop.loc.start.line), what: "v-html renders markup: show text, or a message through <AppTrans>" });
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
          const tree = params ? ts.createSourceFile(file, `(${params});`, ts.ScriptTarget.Latest, true) : undefined;
          const statement = tree?.statements[0];
          const expression = statement && ts.isExpressionStatement(statement) ? statement.expression : undefined;
          const given = params ? givenNames(expression && ts.isParenthesizedExpression(expression) ? expression.expression : expression) : new Set<string>();
          if (given) {
            const missing = [ ...needs(message) ].filter(name => !given.has(name) && !slots.has(name));
            if (missing.length) problems.push({ where: at(node.loc.start.line), what: `<AppTrans path="${path}"> is missing ${missing.map(name => `{${name}}`).join(", ")}` });
          }
        }
      }
    }
    if (node.type === 1) {
      const isComponent = node.tagType === 1;
      for (const prop of node.props ?? []) {
        if (prop.type !== 6 || !prop.value) continue;
        const name: string = prop.name;
        const value: string = prop.value.content;
        const checked = isComponent
          ? !NON_TEXT_PROPS.has(name) && !/(class|icon)$/.test(name) && !name.startsWith("data-") && !OPTION_TOKEN.test(value)
          : TEXT_ATTRIBUTES.has(name);
        if (checked && readable(value, untranslated)) {
          problems.push({ where: at(prop.loc.start.line), what: `${name}="${value}"` });
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
 * argument.
 */
const TEXT_CALLS = new Map<string, readonly number[] | "every">([
  [ "showNotification", [ 0 ] ],
  [ "showConfirmDialog", [ 0, 1 ] ],
  [ "alert", [ 0 ] ],
  [ "confirm", [ 0 ] ],
  [ "createTextNode", [ 0 ] ],
  [ "append", "every" ],
  [ "prepend", "every" ],
  [ "before", "every" ],
  [ "after", "every" ],
]);

/** Object properties that hold shown text by this codebase's conventions. */
const TEXT_PROPERTIES = new Set([
  "label", "title", "description", "hint", "message", "placeholder", "text", "body", "heading", "confirmText",
  "cancelText", "tooltip", "ariaLabel", "emptyText", "emptyTitle", "noMatchText", "searchPlaceholder", "summary",
  "intro", "subtitle", "caption", "onLabel", "offLabel",
]);

/** The visible text of a literal: markup and comments taken out of an HTML string. */
function literalText(node: ts.Node): string | undefined {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isTemplateExpression(node)) return [ node.head.text, ...node.templateSpans.map(span => span.literal.text) ].join(" ");
  return undefined;
}

function shownText(node: ts.Node, html: boolean): string | undefined {
  // `on ? "Leave Streaming Mode" : "Streaming Mode"`, `name || "Unnamed board"`: every branch is shown.
  if (ts.isParenthesizedExpression(node)) return shownText(node.expression, html);
  if (ts.isConditionalExpression(node)) return joined([ shownText(node.whenTrue, html), shownText(node.whenFalse, html) ]);
  if (ts.isBinaryExpression(node) && [ ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken ].includes(node.operatorToken.kind)) {
    return joined([ shownText(node.left, html), shownText(node.right, html) ]);
  }
  const text = literalText(node);
  if (text === undefined) return undefined;
  return html ? text.replace(/<!--[\s\S]*?-->/g, " ").replace(/<[^>]*>/g, " ") : text;
}

function joined(texts: (string | undefined)[]): string | undefined {
  const found = texts.filter((text): text is string => text !== undefined);
  return found.length ? found.join(" / ") : undefined;
}

export function scanScript(file: string, source: string, untranslated: Untranslated, lineOffset = 0, english?: English): Problem[] {
  const problems: Problem[] = [];
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  checkCalls(file, node => tree.getLineAndCharacterOfPosition(node.getStart()).line + 1 + lineOffset, tree, english, problems);
  const report = (node: ts.Node, text: string, how: string) => {
    const line = tree.getLineAndCharacterOfPosition(node.getStart()).line + 1 + lineOffset;
    problems.push({ where: `${file}:${line}`, what: `${how}: "${text.replace(/\s+/g, " ").trim().slice(0, 90)}"` });
  };
  const inConsole = (node: ts.Node): boolean => {
    for (let up = node.parent; up; up = up.parent) {
      if (ts.isCallExpression(up) && /^console\./.test(up.expression.getText(tree))) return true;
    }
    return false;
  };

  const visit = (node: ts.Node) => {
    // element.textContent = "…", element.title = "…"
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken
      && ts.isPropertyAccessExpression(node.left) && TEXT_DOM_PROPERTIES.has(node.left.name.text)
      && !/style/i.test(node.left.expression.getText(tree))) {
      const html = node.left.name.text.endsWith("HTML");
      const text = shownText(node.right, html);
      if (text !== undefined && readable(text, untranslated)) report(node.right, text, `.${node.left.name.text} =`);
      // A translated text, or anything with a param in it, must not go through innerHTML.
      if (html && /\bt\(/.test(node.right.getText(tree))) report(node.right, node.right.getText(tree), `translated text through .${node.left.name.text}`);
    }

    if (ts.isCallExpression(node) && !inConsole(node)) {
      const callee = node.expression;
      const name = ts.isPropertyAccessExpression(callee) ? callee.name.text : ts.isIdentifier(callee) ? callee.text : "";
      // element.setAttribute("aria-label", "…")
      if (name === "setAttribute" && node.arguments.length === 2) {
        const attribute = literalText(node.arguments[0]);
        const text = shownText(node.arguments[1], false);
        if (attribute && TEXT_ATTRIBUTES.has(attribute) && text !== undefined && readable(text, untranslated)) {
          report(node.arguments[1], text, `setAttribute("${attribute}")`);
        }
      }
      const shown = TEXT_CALLS.get(name);
      if (shown) {
        for (const [ position, argument ] of node.arguments.entries()) {
          if (shown !== "every" && !shown.includes(position)) continue;
          const text = shownText(argument, false);
          if (text !== undefined && readable(text, untranslated)) report(argument, text, `${name}()`);
        }
      }
    }

    // { label: "…" }
    if (ts.isPropertyAssignment(node) && !inConsole(node)) {
      const key = ts.isIdentifier(node.name) || ts.isStringLiteral(node.name) ? node.name.text : "";
      const text = TEXT_PROPERTIES.has(key) ? shownText(node.initializer, false) : undefined;
      if (text !== undefined && readable(text, untranslated)) report(node.initializer, text, `${key}:`);
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

function sourceFiles(root: string, named: string[]): string[] {
  if (named.length) return named.map(file => path.relative(root, path.resolve(file)));
  const listed = execFileSync("git", [ "ls-files", "--cached", "--others", "--exclude-standard", "--", "*.vue", "*.ts" ], { cwd: root, encoding: "utf8" });
  return listed.split("\n").filter(file => file && !SKIPPED.some(skip => skip.test(file)) && existsSync(path.join(root, file)));
}

function main(): void {
  const root = process.cwd();
  sfc.registerTS(() => ts);

  const problems = checkCatalogs(CATALOGS, UNTRANSLATED);
  const english = flatten(CATALOGS.en);
  for (const file of sourceFiles(root, process.argv.slice(2))) {
    const source = readFileSync(path.join(root, file), "utf8");
    problems.push(...(file.endsWith(".vue") ? scanVue(file, source, UNTRANSLATED, english) : scanScript(file, source, UNTRANSLATED, 0, english)));
  }

  for (const problem of problems) console.log(`✗ ${problem.where}  ${problem.what}`);
  console.log(problems.length ? `\n${problems.length} problem(s). How to fix them: CLAUDE.md, "Translations".` : "i18n: all good.");
  process.exitCode = problems.length ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
