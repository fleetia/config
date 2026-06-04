import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";

/** @type {import('eslint').Linter.Config[]} */
export const typescriptConfig = [
  js.configs.recommended,
  ...tseslint.configs.recommended
];

/** @type {import('eslint').Linter.Config} */
export const reactConfig = {
  files: ["**/*.{ts,tsx}"],
  extends: [
    js.configs.recommended,
    tseslint.configs.recommended,
    reactHooks.configs.flat.recommended,
    reactRefresh.configs.vite
  ],
  languageOptions: {
    ecmaVersion: 2020,
    globals: globals.browser
  },
  rules: {
    "no-duplicate-imports": ["error", { includeExports: true }],
    "object-shorthand": ["error", "always", { avoidQuotes: true }]
  }
};

export const ignorePatterns = ["dist", "build", "storybook-static", "public"];
