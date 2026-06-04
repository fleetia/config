# @fleetia/config

Shared ESLint, Prettier, and TypeScript configuration for Fleetia packages.

## Install

```bash
pnpm add -D @fleetia/config eslint prettier typescript
```

## Usage

```js
// eslint.config.js
import { reactConfig, ignorePatterns } from "@fleetia/config/eslint";

export default [reactConfig, { ignores: ignorePatterns }];
```

```js
// prettier.config.js
export { default } from "@fleetia/config/prettier";
```

```json
{
  "extends": "@fleetia/config/tsconfig.base.json"
}
```
