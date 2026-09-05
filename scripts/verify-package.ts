import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const temporary = mkdtempSync(join(tmpdir(), "fleetia config-"));
const consumer = join(temporary, "consumer");
const pnpm = process.env.npm_execpath;
const typescriptVersion = process.env.TYPESCRIPT_VERSION ?? "5.9.3";

assert(pnpm, "Run this check through pnpm test.");

function write(path: string, content: string): void {
  const destination = join(consumer, path);
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, content);
}

function run(
  args: string[],
  cwd: string = consumer,
  expectedStatus: number | "failure" = 0
): string {
  const result = spawnSync(process.execPath, args, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" }
  });
  if (result.error) {
    throw result.error;
  }
  const output = result.stdout + result.stderr;
  if (expectedStatus === "failure") {
    assert.notEqual(result.status, null, output);
    assert.notEqual(result.status, 0, output);
  } else {
    assert.equal(result.status, expectedStatus, output);
  }
  return output;
}

function configure(
  preset: string,
  options: Record<string, unknown> = {}
): void {
  write(
    "tsconfig.json",
    JSON.stringify({
      extends: `@fleetia/config/${preset}`,
      compilerOptions: { types: [], ...options },
      include: ["source.ts"]
    })
  );
}

try {
  run([pnpm, "pack", "--pack-destination", temporary], root);
  const archive = readdirSync(temporary).find(name => name.endsWith(".tgz"));
  assert(archive, "pnpm pack must create a tarball.");
  write(
    "package.json",
    JSON.stringify({
      private: true,
      type: "module",
      devDependencies: { "@fleetia/config": `file:${join(temporary, archive)}` }
    })
  );
  write(".npmrc", "auto-install-peers=false\n");
  write(".gitignore", "node_modules\nnode-output\ntypes-output\n");
  run([pnpm, "install", "--ignore-scripts"]);

  const installed = join(consumer, "node_modules/@fleetia/config");
  const cli = join(installed, "dist/cli.js");
  for (const legacy of [
    "eslint.base.js",
    "prettier.config.js",
    "tsconfig.base.json"
  ]) {
    assert.equal(
      readFileSync(join(installed, legacy), "utf8"),
      readFileSync(join(root, legacy), "utf8")
    );
  }

  assert(existsSync(join(consumer, "node_modules/.bin/fleetia-config")));
  assert(!existsSync(join(consumer, "node_modules/.bin/oxlint")));
  assert(!existsSync(join(consumer, "node_modules/.bin/oxfmt")));
  assert.match(
    run([pnpm, "exec", "fleetia-config", "lint", "--version"]),
    /1\.81\.0/
  );
  assert.match(run([cli, "format", "--version"]), /0\.66\.0/);
  assert.match(run([cli, "unknown"], consumer, 2), /Unknown command/);

  write(
    "oxlint.config.ts",
    'import config from "@fleetia/config/oxlint";\n' +
      'export default { extends: [config], ignorePatterns: ["ignored/**"] };\n'
  );
  write("source.ts", "export function count(): number { return 1; }\n");
  write("ignored/broken.ts", "this is not TypeScript\n");
  run([cli, "lint", "."]);
  write("source.ts", "export const value: any = 1;\n");
  assert.match(run([cli, "lint", "source.ts"], consumer, 1), /no-explicit-any/);

  write(
    "oxlint.config.ts",
    'export { default } from "@fleetia/config/oxlint/react";\n'
  );
  write(
    "component.tsx",
    'import { useState } from "react";\n' +
      "export function Counter(): number {\n" +
      "  const [count] = useState(0);\n  return count;\n}\n"
  );
  run([cli, "lint", "component.tsx"]);
  write(
    "component.tsx",
    'import { useState } from "react";\n' +
      "export function Counter(enabled: boolean): number {\n" +
      "  if (enabled) { const [count] = useState(0); return count; }\n" +
      "  return 0;\n}\n"
  );
  assert.match(
    run([cli, "lint", "component.tsx"], consumer, 1),
    /rules-of-hooks/
  );
  write(
    "component.tsx",
    'import { useEffect, useState } from "react";\n' +
      "export function Counter(): number {\n" +
      "  const [count, setCount] = useState(0);\n" +
      "  useEffect(() => { setCount(1); }, []);\n  return count;\n}\n"
  );
  assert.match(
    run([cli, "lint", "component.tsx"], consumer, 1),
    /set-state-in-effect/
  );

  write(
    "oxfmt.config.ts",
    'import config from "@fleetia/config/oxfmt";\n' +
      'export default { ...config, ignorePatterns: ["ignored/**"] };\n'
  );
  write("formatted.ts", "export const label='fleetia'\n");
  run([cli, "format", "--check", "formatted.ts"], consumer, 1);
  run([cli, "format", "formatted.ts"]);
  assert.equal(
    readFileSync(join(consumer, "formatted.ts"), "utf8"),
    'export const label = "fleetia";\n'
  );
  run([cli, "format", "--check", "formatted.ts", "ignored"]);

  run([
    pnpm,
    "add",
    "-D",
    "--ignore-scripts",
    `typescript@${typescriptVersion}`,
    "@types/node@24.10.1",
    "eslint@9.39.4"
  ]);
  const tsc = join(consumer, "node_modules/typescript/bin/tsc");
  run([
    "--input-type=module",
    "-e",
    'import prettier from "@fleetia/config/prettier";' +
      'import formatter from "@fleetia/config/oxfmt";' +
      'import assert from "node:assert/strict";' +
      "for (const key of Object.keys(prettier)) assert.deepEqual(formatter[key], prettier[key]);"
  ]);
  if (Number(typescriptVersion.split(".")[0]) < 7) {
    run([
      "--input-type=module",
      "-e",
      'import { typescriptConfig, reactConfig } from "@fleetia/config/eslint";' +
        'import assert from "node:assert/strict";' +
        "assert(typescriptConfig.length && reactConfig.files.length);"
    ]);
  }
  assert.match(
    run([cli, "lint", "component.tsx"], consumer, 1),
    /set-state-in-effect/
  );

  configure("tsconfig/react-bundler.json");
  write(
    "source.ts",
    "export function createButton(): HTMLButtonElement {\n" +
      '  return document.createElement("button");\n}\n'
  );
  run([tsc, "-p", "tsconfig.json"]);
  assert(!existsSync(join(consumer, "source.js")));

  configure("tsconfig/node.json", {
    types: ["node"],
    rootDir: ".",
    outDir: "node-output"
  });
  write("source.ts", "export const runtime: string = process.version;\n");
  run([tsc, "-p", "tsconfig.json"]);
  assert(existsSync(join(consumer, "node-output/source.js")));
  run([join(consumer, "node-output/source.js")]);
  write("source.ts", "export const element = document.createElement('div');\n");
  assert.match(
    run([tsc, "--noEmit", "-p", "tsconfig.json"], consumer, "failure"),
    /document/
  );

  configure("tsconfig/library.json", { rootDir: ".", outDir: "types-output" });
  write(
    "source.ts",
    "export function first(items: string[]): string | undefined { return items[0]; }\n"
  );
  run([tsc, "-p", "tsconfig.json"]);
  assert(existsSync(join(consumer, "types-output/source.d.ts")));
  assert(existsSync(join(consumer, "types-output/source.d.ts.map")));
  assert(!existsSync(join(consumer, "types-output/source.js")));
  write(
    "source.ts",
    "export function first(items: string[]): string { return items[0]; }\n"
  );
  assert.match(
    run([tsc, "-p", "tsconfig.json"], consumer, "failure"),
    /undefined/
  );

  configure("tsconfig.base.json");
  write("source.ts", "export const title: string = document.title;\n");
  run([tsc, "-p", "tsconfig.json"]);

  configure("tsconfig/node.json", { types: ["node"] });
  write(
    "source.ts",
    'import base from "@fleetia/config/oxlint";\n' +
      'import react from "@fleetia/config/oxlint/react";\n' +
      'import formatter from "@fleetia/config/oxfmt";\n' +
      "export const presets = { base, react, formatter };\n"
  );
  run([tsc, "--noEmit", "-p", "tsconfig.json"]);
  process.stdout.write(
    `Packed consumer verification passed (TypeScript ${typescriptVersion}).\n`
  );
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
