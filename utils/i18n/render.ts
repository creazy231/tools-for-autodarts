/**
 * A parsed message as Vue children, for <AppTrans> (components/AppTrans.vue).
 */

import { h } from "vue";

import type { Slots, VNodeChild } from "vue";
import type { MarkupNode } from "./markup";
import type { Params } from "./types";

/**
 * Tags become their elements and `<br>` a line break. A `<code>` is a token the
 * person types, such as a trigger, and it carries `.adt-code`, the component
 * class of assets/tailwind.css. Every entrypoint that mounts Vue in a shadow
 * root (content, lobby, match and boards) imports that stylesheet, so no panel
 * needs a rule of its own for it; lobbynew.content mounts none, renders no
 * <AppTrans>, and doesn't import it. A `{name}` marker becomes the slot of that
 * name, or the param of that name as text, or stays as written. Params are
 * text children, which Vue escapes, so a name can hold anything.
 *
 * Only own slots and params count, and a slot only if it is a function: a
 * marker such as `{constructor}` must not find what every object inherits,
 * nor `{_}` the flag Vue keeps on compiled slots.
 */
export function renderMarkup(nodes: MarkupNode[], slots: Slots, params?: Params): VNodeChild[] {
  // The switch names every kind of node, so none falls through. The linter has
  // no types to know that.
  // eslint-disable-next-line array-callback-return
  return nodes.map((node): VNodeChild => {
    switch (node.kind) {
      case "text":
        return node.text;
      case "break":
        return h("br");
      case "tag":
        return h(node.tag, node.tag === "code" ? { class: "adt-code" } : null, renderMarkup(node.children, slots, params));
      case "slot": {
        const slot = own(slots, node.name) ? slots[node.name] : undefined;
        if (typeof slot === "function") return slot();
        const value = params && own(params, node.name) ? params[node.name] : undefined;
        return value === undefined ? `{${node.name}}` : String(value);
      }
    }
  });
}

function own(object: object, name: string): boolean {
  return Object.prototype.hasOwnProperty.call(object, name);
}
