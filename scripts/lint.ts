/**
 * yarn lint [--base <rev>] [file …]
 *
 * Lints what a change touched, in one ESLint run, and prints only the problems
 * the change adds. Most files already carry warnings (import/order, Tailwind's
 * class order), so ESLint's own exit code says little about a change. This
 * lints each file as it is and as it was at <rev> (HEAD unless given; `main`
 * for a branch), and lists a problem only when the old version did not have
 * it. A problem is the same one when its rule, its message and the text of its
 * line match, so lines that only moved don't count. In a file that is new
 * since <rev>, every problem is new.
 *
 * Without files it takes every file that differs from <rev>, staged or not,
 * and the untracked ones.
 *
 * Why one run: loading this config takes ESLint 1.5 to 2 seconds, so linting a
 * file at a time, once as it is and once from `git show`, made a check of ten
 * files take over half a minute.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { ESLint } from "eslint";

type Message = ESLint.LintResult["messages"][number];

/** What ESLint has rules for here. The rest (.json, .md, .yml) it ignores or can't lint. */
const LINTED = /\.(?:vue|ts|tsx|mts|cts|js|mjs|cjs)$/;

function git(...args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: [ "ignore", "pipe", "pipe" ] });
}

/** Every file that differs from `base`, staged or not, and the untracked ones. */
function changedFiles(base: string): string[] {
  const listed = git("diff", "--name-only", "-z", "--diff-filter=d", base) + git("ls-files", "-z", "--others", "--exclude-standard");
  return [ ...new Set(listed.split("\0")) ].filter(file => file && LINTED.test(file));
}

/** The file as it was at `base`, or nothing when it is new since. */
function contentAt(base: string, file: string): string | undefined {
  try {
    return git("show", `${base}:${file}`);
  } catch {
    return undefined;
  }
}

/** What makes a problem the same one in both versions: not its line number, which moves. */
function key(message: Message, lines: string[]): string {
  return [ message.ruleId ?? "parse", message.message, lines[message.line - 1]?.trim() ?? "" ].join("\n");
}

function format(file: string, message: Message): string {
  const severity = message.severity === 2 ? "Error" : "Warning";
  return `${file}:${message.line}:${message.column}: ${message.message} [${severity}${message.ruleId ? `/${message.ruleId}` : ""}]`;
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

async function main(): Promise<void> {
  const root = process.cwd();
  let base = "HEAD";
  const named: string[] = [];
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--base") base = args[++i];
    else named.push(path.relative(root, path.resolve(args[i])));
  }
  try {
    git("rev-parse", "--verify", "--quiet", `${base}^{commit}`);
  } catch {
    console.error(`lint: "${base}" is not a commit. Usage: yarn lint [--base <rev>] [file …]`);
    process.exitCode = 2;
    return;
  }

  const eslint = new ESLint({ cwd: root });
  const targets: string[] = [];
  for (const file of named.length ? named : changedFiles(base)) {
    if (!existsSync(path.join(root, file))) console.log(`· ${file}: not found`);
    else if (!LINTED.test(file) || await eslint.isPathIgnored(file)) console.log(`· ${file}: not linted (.eslintignore, or not code)`);
    else targets.push(file);
  }
  if (!targets.length) {
    console.log(named.length ? "lint: nothing to lint." : `lint: no code changed since ${base}.`);
    return;
  }

  let added = 0;
  let before = 0;
  let after = 0;
  const results = (await eslint.lintFiles(targets)).sort((a, b) => a.filePath.localeCompare(b.filePath));
  for (const result of results) {
    const file = path.relative(root, result.filePath);
    const known = new Map<string, number>();
    const old = contentAt(base, file);
    if (old !== undefined) {
      const [ was ] = await eslint.lintText(old, { filePath: result.filePath });
      const lines = old.split("\n");
      for (const message of was.messages) known.set(key(message, lines), (known.get(key(message, lines)) ?? 0) + 1);
      before += was.messages.length;
    }

    after += result.messages.length;
    const lines = readFileSync(result.filePath, "utf8").split("\n");
    for (const message of result.messages) {
      const seen = known.get(key(message, lines)) ?? 0;
      if (seen) {
        known.set(key(message, lines), seen - 1);
        continue;
      }
      console.log(format(file, message));
      added++;
    }
  }

  const checked = `${plural(targets.length, "file")} against ${base}`;
  console.log(added
    ? `\n${plural(added, "new problem")} in ${checked}.`
    : `lint: nothing new in ${checked} (${plural(after, "problem")} there, ${before} before).`);
  process.exitCode = added ? 1 : 0;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 2;
});
