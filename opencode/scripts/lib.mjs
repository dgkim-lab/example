import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const desiredConfigPath = resolve(repoRoot, "config/opencode.json");
export const secretRefsPath = resolve(repoRoot, "config/secrets.json");
export const localEnvPath = resolve(repoRoot, "env/opencode.env");
export const targetConfigPath = resolve(process.env.HOME, ".config/opencode/opencode.json");

export function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

export function commandExists(command) {
  return spawnSync("sh", ["-lc", `command -v ${quoteShell(command)}`], {
    encoding: "utf8"
  }).status === 0;
}

export function dependencyAvailable(name) {
  try {
    import.meta.resolve(name);
    return true;
  } catch {
    return false;
  }
}

export function run(command, args = [], options = {}) {
  return spawnSync(command, args, {
    encoding: "utf8",
    stdio: options.stdio ?? "pipe",
    input: options.input
  });
}

export function quoteShell(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

export function loadDotEnv(path) {
  if (!existsSync(path)) return {};

  const result = {};
  for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separator = line.indexOf("=");
    if (separator === -1) continue;

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (/^[A-Z_][A-Z0-9_]*$/.test(key)) result[key] = value;
  }

  return result;
}

export function injectProviderApiKeys(config, secretRefs, env) {
  const rendered = structuredClone(config);
  const missing = [];

  for (const [providerId, envName] of Object.entries(secretRefs.providerApiKeys ?? {})) {
    if (!rendered.provider?.[providerId]) continue;

    const value = env[envName] ?? process.env[envName];
    if (!value) {
      missing.push(envName);
      continue;
    }

    rendered.provider[providerId].options ??= {};
    rendered.provider[providerId].options.apiKey = value;
  }

  return {
    config: rendered,
    missing: [...new Set(missing)]
  };
}
