#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";

const [command, ...args] = process.argv.slice(2);

if (!command || command === "--help" || command === "-h") {
  process.stdout.write(
    "Usage: fleetia-config <lint|format> [options] [paths...]\n\n" +
      "lint    Run the bundled Oxlint with the project's config.\n" +
      "format  Run the bundled Oxfmt with the project's config.\n\n" +
      "Options and paths are passed through to the selected tool.\n"
  );
} else if (command === "lint" || command === "format") {
  const tool = command === "lint" ? "oxlint" : "oxfmt";
  const require = createRequire(import.meta.url);
  const manifest = require.resolve(`${tool}/package.json`);
  const executable = resolve(dirname(manifest), "bin", tool);
  const result = spawnSync(process.execPath, [executable, ...args], {
    stdio: "inherit"
  });

  if (result.error) {
    process.stderr.write(`${result.error.message}\n`);
  }
  if (result.signal) {
    process.kill(process.pid, result.signal);
  }
  process.exitCode = result.status ?? 1;
} else {
  process.stderr.write(`Unknown command: ${command}. Use lint or format.\n`);
  process.exitCode = 2;
}
