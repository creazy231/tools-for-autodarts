module.exports = {
  env: {
    webextensions: true,
    browser: true,
    es2021: true,
  },
  overrides: [],
  extends: [ "@creazy231/eslint-config" ],
  rules: {
    // Enforce component order matching vue-file-structure.mdc guidelines
    "vue/component-tags-order": [ "error", {
      order: [ "template", "script", "style" ],
    } ],
    "vue/order-in-components": [ "error", {
      order: [
        "definePageMeta",
        "name",
        "components",
        "props",
        "data",
        "computed",
        "watch",
        "beforeCreate",
        "created",
        "beforeMount",
        "mounted",
        "beforeUpdate",
        "updated",
        "activated",
        "deactivated",
        "beforeDestroy",
        "beforeUnmount",
        "destroyed",
        "unmounted",
        "methods",
        "render",
      ],
    } ],
    // Custom script setup ordering
    "vue/script-setup-uses-vars": "error",
    // Setup custom rules for enforcing function order
    "vue/define-macros-order": [ "error", {
      order: [ "defineProps", "defineEmits", "definePageMeta" ],
    } ],
    // Recommend correct import order
    "import/order": [ "warn", {
      "groups": [ "builtin", "external", "internal", "parent", "sibling", "index", "object", "type" ],
      "newlines-between": "always",
    } ],
    // Every text a person reads comes from t() (CLAUDE.md, "Translations"). Names and
    // units that stay the same in every language are in locales/untranslated.json.
    "vue/no-bare-strings-in-template": [ "error", {
      allowlist: [ ...require("./locales/untranslated.json"), "(", ")", ",", ".", "&", "+", "-", "=", "*", "/", "#", "%", "!", "?", ":", "[", "]", "{", "}", "<", ">", "·", "•", "–", "—", "−", "|", "✕", "▸", "…", "∅" ],
      attributes: {
        "/.+/": [ "title", "aria-label", "aria-placeholder", "aria-roledescription", "aria-valuetext", "aria-description" ],
        "input": [ "placeholder" ],
        "img": [ "alt" ],
        "OptionRow": [ "title", "description" ],
        "AppAlert": [ "title" ],
        "AppNumberInput": [ "label" ],
        "LibrarySection": [ "title", "empty-title", "empty-text", "search-placeholder", "no-match-text" ],
      },
      directives: [ "v-text" ],
    } ],
  },
};
