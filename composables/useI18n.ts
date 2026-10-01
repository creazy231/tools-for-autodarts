import { language, t } from "@/utils/i18n";

/**
 * Tools' text in the site's language, for a component:
 * `const { t } = useI18n();` then `{{ t("zoom.position.title") }}`.
 *
 * A template or `computed` that calls `t` re-renders by itself when the
 * language changes; `language` is there for code that has to react to the
 * switch itself. Auto-imported, like useConfig. See utils/i18n/index.ts.
 */
export function useI18n() {
  return { t, language };
}
