#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const directory = dirname(fileURLToPath(import.meta.url));
const generator = resolve(directory, "generate-codex-detailed-usage-report.mjs");
if (process.argv.includes("--help") || process.argv.includes("-h")) {
  process.stdout.write(`Usage: node generate-codex-sensitive-usage-report.mjs [options]\n\nGenerates a report containing sensitive project paths and thread titles.\n\nOptions:\n  --start YYYY-MM-DD   Include activity on or after this local date\n  --end YYYY-MM-DD     Include activity on or before this local date\n  --db PATH            Database (default: ~/.codex/state_5.sqlite)\n  --output PATH        Output (default: ./codex-sensitive-usage-report.md)\n  --top NUMBER         Top projects and threads to show (default: 20)\n  --help               Show help\n`);
  process.exit(0);
}
const result = spawnSync(process.execPath, [generator, "--sensitive-only", ...process.argv.slice(2)], {
  stdio: "inherit",
});

if (result.error) {
  process.stderr.write(`Error: ${result.error.message}\n`);
  process.exit(1);
}
process.exit(result.status ?? 1);
