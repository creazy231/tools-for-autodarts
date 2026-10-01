#!/usr/bin/env node
/**
 * yarn i18n:site <search>
 *
 * Prints autodarts' own English, German and Dutch for every text whose
 * English or key contains <search>, so a new Tools text can use the site's
 * word for a button, a setting or a darts term (locales/GLOSSARY.md).
 *
 *   yarn i18n:site "next leg"
 *   yarn i18n:site lobby.gameSettings.
 *
 * Reads the live site: the i18n chunk that play.autodarts.com's index.html
 * loads. The chunk is parsed with TypeScript's parser, never run, so nothing
 * the site serves executes here. English is the site's `en` over its fuller
 * `en-dev`, as the site itself falls back.
 */

import ts from "typescript";

const SITE = "https://play.autodarts.com";
const search = process.argv.slice(2).join(" ").trim().toLowerCase();
if (!search) {
  console.error("Usage: yarn i18n:site <search>   e.g. yarn i18n:site \"next leg\"");
  process.exit(2);
}

const html = await (await fetch(`${SITE}/`)).text();
const chunkPath = html.match(/\/assets\/i18n-[\w-]+\.js/)?.[0];
if (!chunkPath) throw new Error("No i18n chunk in the site's index.html: the site has changed how it loads its languages.");
const code = await (await fetch(SITE + chunkPath)).text();
const tree = ts.createSourceFile("i18n.js", code, ts.ScriptTarget.Latest, false, ts.ScriptKind.JS);

/** The variable each language's table is bound to: `Object.assign({"./locales/de/translation.json": c, …})`. */
const tableNames = new Map();
/** Every top-level `var x = {…}`. */
const objects = new Map();

function visit(node) {
  if (ts.isCallExpression(node) && node.expression.getText(tree) === "Object.assign") {
    const [ first ] = node.arguments;
    if (first && ts.isObjectLiteralExpression(first)) {
      for (const property of first.properties) {
        const match = ts.isPropertyAssignment(property) && ts.isStringLiteral(property.name)
          && property.name.text.match(/^\.\/locales\/([\w-]+)\/translation\.json$/);
        if (match && ts.isIdentifier(property.initializer)) tableNames.set(match[1], property.initializer.text);
      }
    }
  }
  ts.forEachChild(node, visit);
}
visit(tree);

for (const statement of tree.statements) {
  if (!ts.isVariableStatement(statement)) continue;
  for (const declaration of statement.declarationList.declarations) {
    if (ts.isIdentifier(declaration.name) && declaration.initializer && ts.isObjectLiteralExpression(declaration.initializer)) {
      objects.set(declaration.name.text, declaration.initializer);
    }
  }
}

/** An object literal of strings and objects, as data. Anything else in it is skipped. */
function toData(node) {
  const out = {};
  for (const property of node.properties) {
    if (!ts.isPropertyAssignment(property)) continue;
    const key = ts.isIdentifier(property.name) || ts.isStringLiteral(property.name) ? property.name.text : undefined;
    const value = property.initializer;
    if (key === undefined) continue;
    if (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value)) {
      out[key] = value.text;
    } else if (ts.isObjectLiteralExpression(value)) {
      out[key] = toData(value);
    } else if (ts.isCallExpression(value) && value.expression.getText(tree) === "JSON.parse" && value.arguments[0]
      && (ts.isStringLiteral(value.arguments[0]) || ts.isNoSubstitutionTemplateLiteral(value.arguments[0]))) {
      // Vite writes big sub-tables as JSON.parse(`{…}`). JSON.parse runs nothing either.
      const parsed = JSON.parse(value.arguments[0].text);
      if (parsed && typeof parsed === "object") out[key] = parsed;
    }
  }
  return out;
}

function flatten(node, prefix = "", out = {}) {
  for (const [ key, value ] of Object.entries(node)) {
    const at = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") out[at] = value;
    else flatten(value, at, out);
  }
  return out;
}

function table(language) {
  const node = objects.get(tableNames.get(language));
  return node ? flatten(toData(node)) : {};
}
const english = { ...table("en-dev"), ...table("en") };
const german = table("de");
const dutch = table("nl");
if (!Object.keys(english).length) throw new Error("Found no English table in the i18n chunk: the site has changed its bundling.");
if (!Object.keys(german).length) throw new Error("Found no German table in the i18n chunk: the site has changed its bundling.");
if (!Object.keys(dutch).length) throw new Error("Found no Dutch table in the i18n chunk: the site has changed its bundling.");

const rows = Object.entries(english)
  .filter(([ key, text ]) => key.toLowerCase().includes(search) || text.toLowerCase().includes(search))
  .sort(([ a ], [ b ]) => a.localeCompare(b));

for (const [ key, text ] of rows) {
  console.log(`${key}\n  en  ${text}\n  de  ${german[key] ?? "—"}\n  nl  ${dutch[key] ?? "—"}`);
}
console.log(rows.length ? `\n${rows.length} found (${chunkPath}).` : `Nothing has "${search}" in its English or its key.`);
