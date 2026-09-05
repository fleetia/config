# @fleetia/config

Shared Oxlint, Oxfmt, and TypeScript presets for Fleetia projects. Install the
package, select a preset, and keep project-specific settings in the consumer.
The package provides lint and format commands; each project retains its own
build, typecheck, and test commands.

Version 2 is being prepared for GitHub Packages. Installation instructions below
apply after release; `1.0.0` remains on npmjs.

## Install

Use Node.js `^22.18.0 || >=24.0.0`. TypeScript config files such as
`oxlint.config.ts` and `oxfmt.config.ts` rely on this supported Node runtime.

GitHub Packages requires authentication even for public npm packages. Use a
personal access token (classic) with `read:packages`, for example through
`npm login --scope=@fleetia --auth-type=legacy --registry=https://npm.pkg.github.com`.
Keep credentials in user configuration or a secret store, outside the repo.

Add the scope mapping to the consuming project's `.npmrc`:

```ini
@fleetia:registry=https://npm.pkg.github.com
```

This affects **all** `@fleetia/*` packages. Projects consuming npmjs packages such
as `@fleetia/components` or `@fleetia/test-utils` must resolve that registry
migration before switching the scope. npm does not fall back to npmjs for
packages missing from GitHub Packages.

```bash
pnpm add -D @fleetia/config@^2.0.0
```

Oxlint and Oxfmt are bundled at the versions in [package.json](package.json).
Install `typescript` separately for `tsc`, along with required type packages such
as `@types/node` or `@types/react`.

## Lint and format

Create `oxlint.config.ts` in the project root:

```ts
import config from "@fleetia/config/oxlint/react";

export default {
  extends: [config],
  ignorePatterns: ["dist/**", "coverage/**"]
};
```

Use `@fleetia/config/oxlint` for the JavaScript/TypeScript base without React rules.
The React preset includes Hooks checks and a bundled JavaScript plugin for Hooks
rules not provided natively by Oxlint. Review framework-specific rules such as
React Refresh separately during migration.

Create `oxfmt.config.ts`:

```ts
import config from "@fleetia/config/oxfmt";

export default {
  ...config,
  ignorePatterns: ["dist/**", "coverage/**"]
};
```

Add project scripts:

```json
{
  "scripts": {
    "lint": "fleetia-config lint .",
    "format": "fleetia-config format .",
    "format:check": "fleetia-config format --check ."
  }
}
```

The CLI runs the bundled tool in the current working directory and forwards
arguments and exit status. It reads the project's config; installation alone
does not activate presets. Config exports are compiled ESM with declaration files.

Editors may not discover transitive tools under pnpm's isolated dependency layout.
Configure the extension's tool path using package dependency resolution; do not
assume `node_modules/oxlint` exists. From the consumer, this prints the bundled
Oxlint launcher path (replace `oxlint` with `oxfmt` as needed):

```bash
node --input-type=module -e 'import { createRequire } from "node:module"; import { dirname, join } from "node:path"; const require = createRequire(import.meta.resolve("@fleetia/config/package.json")); console.log(join(dirname(require.resolve("oxlint/package.json")), "bin", "oxlint"));'
```

Use the path format required by the editor extension. The printed file is a Node
launcher, not a platform-native executable.

## TypeScript

| Export                                        | Purpose                                                                     |
| --------------------------------------------- | --------------------------------------------------------------------------- |
| `@fleetia/config/tsconfig/base.json`          | Shared strictness without choosing a runtime or emit mode.                  |
| `@fleetia/config/tsconfig/react-bundler.json` | React browser projects using a bundler; DOM libraries and no emit.          |
| `@fleetia/config/tsconfig/node.json`          | Node projects using NodeNext resolution; emit paths stay local.             |
| `@fleetia/config/tsconfig/library.json`       | Declaration-only output for libraries whose JavaScript is built separately. |

For a React app:

```json
{
  "extends": "@fleetia/config/tsconfig/react-bundler.json",
  "compilerOptions": {
    "types": ["vite/client"]
  },
  "include": ["src"]
}
```

Keep `include`, `exclude`, `types`, `paths`, output directories, and project
references in the consumer. NodeNext projects also choose the appropriate package
`type` and import extensions. The library preset emits declarations only: set
`rootDir` and `outDir` locally. For browser React libraries, override `lib` with
`["ES2022", "DOM", "DOM.Iterable"]` and `jsx` with `"react-jsx"`. Projects needing
JavaScript from `tsc` should select the Node preset or configure emit explicitly.

## Legacy consumers

Existing `@fleetia/config/eslint`, `@fleetia/config/prettier`, and
`@fleetia/config/tsconfig.base.json` exports remain available. The legacy root
TypeScript preset retains its browser/React behavior. New presets are opt-in and
may produce different diagnostics.

Install ESLint and Prettier explicitly to keep running those tools. Legacy plugin
dependencies remain; making the ESLint peer optional does not guarantee that a
package manager omits every transitive ESLint dependency.

The legacy ESLint export is verified with TypeScript 5.9; `typescript-eslint`
cannot load the TypeScript 7 native API. Use the Oxc exports with TypeScript 7.
CI verifies the legacy ESLint export with TypeScript 5.9 and the new presets
with both compiler versions.

## CI and release

Consumer GitHub Actions workflows need `permissions: packages: read`, registry
configuration for `https://npm.pkg.github.com`, and `NODE_AUTH_TOKEN` set from
`secrets.GITHUB_TOKEN` during installation. Grant the consumer repository access
under the package's **Manage Actions access** settings. A token alone does not
grant another repository access to the package.

For development, use the pnpm version pinned in `package.json`:

```bash
pnpm install --frozen-lockfile
pnpm check
```

`pnpm test` packs the package, installs it into an isolated pnpm consumer, and
checks CLI behavior, TypeScript presets, and legacy exports. Set
`TYPESCRIPT_VERSION` to select the consumer compiler; the default is `5.9.3`.
CI covers Node 22.18.0 with TypeScript 5.9.3 and Node 24 with TypeScript 7.0.2.

The [release workflow](.github/workflows/release.yml) runs on `v*` tags, rejects
version mismatches with `package.json`, checks the package, and publishes a packed
tarball to GitHub Packages. Pushing a release tag is a publication action; these
repository changes alone do not publish version 2. After the first publication,
verify visibility and consumer access in GitHub. `publishConfig.access` does not
replace checking those settings.
