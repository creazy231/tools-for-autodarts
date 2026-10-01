/**
 * A parsed message as Vue children, for <AppTrans> (components/AppTrans.vue).
 */

import { h } from "vue";

import type { Slots, VNodeChild } from "vue";
import type { MarkupNode } from "./markup";
import type { Params } from "./types";

/**
 * Tags become their elements and `<br>` a line break. A `{name}` marker
 * becomes the slot of that name, or the param of that name as text, or stays
 * as written. Params are text children, which Vue escapes, so a name can hold
 * anything.
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
        return h(node.tag, renderMarkup(node.children, slots, params));
      case "slot": {
        const slot = slots[node.name];
        if (slot) return slot();
        const value = params?.[node.name];
        return value === undefined ? `{${node.name}}` : String(value);
      }
    }
  });
}
