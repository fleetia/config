import base from "./src/oxlint/base.ts";

export default {
  extends: [base],
  env: { node: true },
  ignorePatterns: ["dist/**", "eslint.base.js", "prettier.config.js"]
};
