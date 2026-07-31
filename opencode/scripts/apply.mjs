import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  desiredConfigPath,
  injectProviderApiKeys,
  loadDotEnv,
  localEnvPath,
  readJson,
  secretRefsPath,
  targetConfigPath
} from "./lib.mjs";

const env = loadDotEnv(localEnvPath);
const secretRefs = readJson(secretRefsPath);
const injected = injectProviderApiKeys(readJson(desiredConfigPath), secretRefs, env);
const desired = `${JSON.stringify(injected.config, null, 2)}\n`;
const current = existsSync(targetConfigPath) ? readFileSync(targetConfigPath, "utf8") : "";

if (injected.missing.length > 0) {
  console.error(`missing secrets: ${injected.missing.join(", ")}`);
  console.error(`create ${localEnvPath} or export the missing environment variables`);
  process.exit(1);
}

if (desired === current) {
  console.log(`ok: ${targetConfigPath} already matches rendered config`);
  process.exit(0);
}

mkdirSync(dirname(targetConfigPath), { recursive: true });

if (current) {
  const backup = `${targetConfigPath}.bak-${new Date().toISOString().replaceAll(":", "")}`;
  copyFileSync(targetConfigPath, backup);
  console.log(`backup: ${backup}`);
}

writeFileSync(targetConfigPath, desired);
console.log(`applied rendered config: ${desiredConfigPath} -> ${targetConfigPath}`);
