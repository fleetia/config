import { createRequire } from "node:module";
import { defineConfig } from "oxlint";

import baseConfig from "./base.js";

const require = createRequire(import.meta.url);

export default defineConfig({
  extends: [baseConfig],
  overrides: [
    {
      files: ["**/*.{js,jsx,ts,tsx,mjs,mts,cjs,cts}"],
      plugins: ["typescript", "react"],
      jsPlugins: [
        {
          name: "react-hooks-js",
          specifier: require.resolve("eslint-plugin-react-hooks")
        }
      ],
      rules: {
        "no-duplicate-imports": ["error", { includeExports: true }],
        "object-shorthand": ["error", "always", { avoidQuotes: true }],
        "react/rules-of-hooks": "error",
        "react/exhaustive-deps": "warn",
        "react/static-components": "error",
        "react/use-memo": "error",
        "react/preserve-manual-memoization": "error",
        "react/incompatible-library": "warn",
        "react/immutability": "error",
        "react/globals": "error",
        "react/refs": "error",
        "react/set-state-in-effect": "error",
        "react/error-boundaries": "error",
        "react/purity": "error",
        "react/set-state-in-render": "error",
        "react/unsupported-syntax": "warn",
        "react-hooks-js/config": "error",
        "react-hooks-js/gating": "error"
      }
    },
    {
      files: ["**/*.{jsx,tsx}"],
      env: { browser: true }
    }
  ]
});
