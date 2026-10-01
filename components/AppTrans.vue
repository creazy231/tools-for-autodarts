<script lang="ts">
/**
 * A catalog message that holds markup or a link: `<AppTrans path="…" />`.
 *
 * Renders the message's `<b>`, `<i>` and `<code>` as elements and `<br>` as a
 * line break. Each `{name}` marker becomes the slot of that name, or else the
 * param of that name as text, so a link or a button can sit inside a sentence
 * wherever the language puts it. Params are text, never markup.
 *
 * Plain text needs none of this: `{{ t("…") }}`. See utils/i18n/markup.ts.
 */
import { defineComponent, h } from "vue";

import type { PropType } from "vue";
import type { MessageKey, Params } from "@/utils/i18n";

import { rawText } from "@/utils/i18n";
import { parseMarkup } from "@/utils/i18n/markup";
import { renderMarkup } from "@/utils/i18n/render";

export default defineComponent({
  name: "AppTrans",
  props: {
    path: { type: String as PropType<MessageKey>, required: true },
    params: { type: Object as PropType<Params>, default: undefined },
    /** The element around the message. A span, so it fits inside a sentence, a label or AppAlert's body. */
    tag: { type: String, default: "span" },
  },
  setup(props, { slots }) {
    return () => h(props.tag, renderMarkup(parseMarkup(rawText(props.path, props.params)), slots, props.params));
  },
});
</script>
