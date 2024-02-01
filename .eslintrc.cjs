module.exports = {
  env: {
    webextensions: true,
    browser: true,
    es2021: true,
  },
  overrides: [],
  extends: [ "@creazy231", "plugin:tailwindcss/recommended" ],
  rules: {
    "no-restricted-globals": "off",
    "antfu/if-newline": "off",
    "n/prefer-global/process": "off",
  },
}
