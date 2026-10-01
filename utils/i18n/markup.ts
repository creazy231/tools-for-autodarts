/**
 * The markup a catalog message may hold, parsed into a tree for <AppTrans>.
 *
 * A translator rewords a whole sentence, so its bold words and links have to
 * sit inside the message rather than be glued on around it. Three inline tags
 * are recognised, plus a line break and `{name}` markers, which <AppTrans>
 * fills from the slot of that name or from its params. Nothing else is markup:
 * an unknown tag, a closing tag nothing opened, or a player called "<b>" put in
 * through a param all stay text. No message ever goes through innerHTML.
 */

export type MarkupTag = "b" | "i" | "code";

export type MarkupNode =
  | { kind: "text"; text: string }
  | { kind: "tag"; tag: MarkupTag; children: MarkupNode[] }
  | { kind: "break" }
  | { kind: "slot"; name: string };

type TagNode = Extract<MarkupNode, { kind: "tag" }>;

const TOKEN = /<(\/?)(b|i|code)>|<br\s*\/?>|\{(\w+)\}/g;

export function parseMarkup(source: string): MarkupNode[] {
  const root: MarkupNode[] = [];
  const open: TagNode[] = [];
  const into = (): MarkupNode[] => open.at(-1)?.children ?? root;
  const text = (value: string) => {
    if (value) into().push({ kind: "text", text: value });
  };

  let from = 0;
  for (const match of source.matchAll(TOKEN)) {
    const [ token, closing, tag, slot ] = match;
    text(source.slice(from, match.index));
    from = match.index + token.length;

    if (slot) {
      into().push({ kind: "slot", name: slot });
    } else if (!tag) {
      into().push({ kind: "break" });
    } else if (!closing) {
      const node: TagNode = { kind: "tag", tag: tag as MarkupTag, children: [] };
      into().push(node);
      open.push(node);
    } else if (open.at(-1)?.tag === tag) {
      open.pop();
    } else {
      text(token);
    }
  }
  text(source.slice(from));

  // A tag left open simply ends with the message.
  return root;
}
