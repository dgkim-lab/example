import {
  desiredConfigPath,
  commandExists,
  dependencyAvailable,
  loadDotEnv,
  localEnvPath,
  readJson,
  run
} from "./lib.mjs";

const config = readJson(desiredConfigPath);
const localEnv = loadDotEnv(localEnvPath);

function printCommandVersion(command, args = ["--version"]) {
  if (!commandExists(command)) {
    console.log(`${command}: missing`);
    return;
  }
  const result = run(command, args);
  const output = `${result.stdout}${result.stderr}`.trim().split("\n")[0] || "installed";
  console.log(`${command}: ${output}`);
}

console.log(`config: ${desiredConfigPath}`);
console.log(`default model: ${config.model ?? "(not set)"}`);
console.log(`providers: ${Object.keys(config.provider ?? {}).join(", ")}`);
console.log(`OPENAI_API_KEY: ${localEnv.OPENAI_API_KEY || process.env.OPENAI_API_KEY ? "set" : "missing"}`);
console.log(`GEMINI_API_KEY: ${localEnv.GEMINI_API_KEY || process.env.GEMINI_API_KEY ? "set" : "missing"}`);

printCommandVersion("node");
printCommandVersion("npm", ["--version"]);
printCommandVersion("opencode", ["--version"]);
console.log(`@inquirer/prompts: ${dependencyAvailable("@inquirer/prompts") ? "installed" : "missing; run npm install"}`);

if (commandExists("ollama")) {
  const list = run("ollama", ["list"]);
  console.log(`ollama: ${list.status === 0 ? "available" : "installed, list failed"}`);
  if (list.status === 0) {
    const lines = list.stdout.trim().split("\n").slice(1, 6);
    for (const line of lines) console.log(`  ${line}`);
  }
} else {
  console.log("ollama: missing");
}
