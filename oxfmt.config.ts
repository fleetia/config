import config from "./src/oxfmt.ts";

export default {
  ...config,
  ignorePatterns: [
    "dist/**",
    "pnpm-lock.yaml",
    "eslint.base.js",
    "prettier.config.js",
    "tsconfig.base.json"
  ]
};
