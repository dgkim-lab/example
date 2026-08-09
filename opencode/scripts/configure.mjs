import { checkbox, confirm, input, select } from "@inquirer/prompts";
import { desiredConfigPath, readJson, secretRefsPath, writeJson } from "./lib.mjs";

const config = readJson(desiredConfigPath);
const secretRefs = readJson(secretRefsPath);
config.provider ??= {};
secretRefs.providerApiKeys ??= {};

if (process.argv.includes("--providers")) {
  printProviders();
  process.exit(0);
}

const action = await select({
  message: "Configure OpenCode",
  choices: [
    { name: "Enable providers", value: "enable" },
    { name: "Add or update provider", value: "upsert" },
    { name: "Set default model", value: "model" },
    { name: "List providers", value: "list" }
  ]
});

if (action === "enable") await configureEnabledProviders();
if (action === "upsert") await upsertProvider();
if (action === "model") await setDefaultModel();
if (action === "list") printProviders();

writeJson(desiredConfigPath, config);
writeJson(secretRefsPath, secretRefs);
console.log(`updated: ${desiredConfigPath}`);
console.log("run: npm run validate && npm run apply");

async function configureEnabledProviders() {
  const providerIds = Object.keys(config.provider);
  if (providerIds.length === 0) {
    console.log("no providers configured");
    return;
  }

  config.enabled_providers = await checkbox({
    message: "Enabled providers",
    choices: providerIds.map((id) => ({
      name: id,
      value: id,
      checked: config.enabled_providers?.includes(id) ?? true
    }))
  });
}

async function upsertProvider() {
  const type = await select({
    message: "Provider type",
    choices: [
      { name: "OpenAI", value: "openai" },
      { name: "Gemini / Google", value: "gemini" },
      { name: "Amazon Bedrock", value: "bedrock" },
      { name: "Ollama", value: "ollama" },
      { name: "OpenAI-compatible / other", value: "custom" }
    ]
  });

  if (type === "openai") {
    config.provider.openai = {
      options: {}
    };
    secretRefs.providerApiKeys.openai = "OPENAI_API_KEY";
    addEnabled("openai");
    return;
  }

  if (type === "gemini") {
    config.provider.google = {
      options: {}
    };
    secretRefs.providerApiKeys.google = "GEMINI_API_KEY";
    addEnabled("google");
    return;
  }

  if (type === "bedrock") {
    const region = await input({
      message: "AWS region",
      default: config.provider["amazon-bedrock"]?.options?.region ?? "ap-northeast-2"
    });
    const profile = await input({
      message: "AWS profile (optional; leave blank for the default credential chain)",
      default: config.provider["amazon-bedrock"]?.options?.profile ?? ""
    });
    const model = await input({
      message: "Bedrock model ID",
      default: Object.keys(config.provider["amazon-bedrock"]?.models ?? {})[0] ?? "amazon.nova-lite-v1:0"
    });

    const options = { region };
    if (profile) options.profile = profile;
    config.provider["amazon-bedrock"] = {
      options,
      models: {
        ...(config.provider["amazon-bedrock"]?.models ?? {}),
        [model]: { name: `${model} (Bedrock)` }
      }
    };
    addEnabled("amazon-bedrock");
    return;
  }

  if (type === "ollama") {
    const baseURL = await input({
      message: "Ollama OpenAI-compatible base URL",
      default: config.provider.ollama?.options?.baseURL ?? "http://localhost:11434/v1"
    });
    const model = await input({
      message: "Ollama model",
      default: Object.keys(config.provider.ollama?.models ?? {})[0] ?? "llama3.2"
    });

    config.provider.ollama = {
      npm: "@ai-sdk/openai-compatible",
      name: "Ollama",
      options: { baseURL },
      models: {
        ...(config.provider.ollama?.models ?? {}),
        [model]: { name: model }
      }
    };
    addEnabled("ollama");
    return;
  }

  const id = await input({
    message: "Provider ID",
    validate: (value) => /^[a-zA-Z0-9._-]+$/.test(value) || "Use letters, numbers, dot, underscore, or dash."
  });
  const name = await input({ message: "Display name", default: id });
  const baseURL = await input({ message: "Base URL", default: "https://api.example.com/v1" });
  const envName = await input({
    message: "API key env var",
    default: `${id.toUpperCase().replaceAll(/[^A-Z0-9]/g, "_")}_API_KEY`
  });
  const model = await input({ message: "Model ID", default: "my-model" });
  const displayModel = await input({ message: "Model display name", default: model });
  const useResponses = await confirm({
    message: "Use @ai-sdk/openai instead of @ai-sdk/openai-compatible?",
    default: false
  });

  config.provider[id] = {
    npm: useResponses ? "@ai-sdk/openai" : "@ai-sdk/openai-compatible",
    name,
    options: {
      baseURL
    },
    models: {
      [model]: {
        name: displayModel
      }
    }
  };
  secretRefs.providerApiKeys[id] = envName;
  addEnabled(id);
}

async function setDefaultModel() {
  const choices = [];
  for (const [providerId, provider] of Object.entries(config.provider)) {
    for (const [modelId, model] of Object.entries(provider.models ?? {})) {
      choices.push({
        name: `${providerId}/${modelId}${model.name ? `  ${model.name}` : ""}`,
        value: `${providerId}/${modelId}`
      });
    }
  }

  if (choices.length === 0) {
    console.log("no configured models");
    return;
  }

  config.model = await select({
    message: "Default model",
    choices,
    default: config.model
  });
}

function addEnabled(id) {
  config.enabled_providers ??= [];
  if (!config.enabled_providers.includes(id)) config.enabled_providers.push(id);
}

function printProviders() {
  for (const [id, provider] of Object.entries(config.provider)) {
    const enabled = config.enabled_providers?.includes(id) ? "enabled" : "disabled";
    const models = Object.keys(provider.models ?? {});
    console.log(`${id}: ${enabled}${models.length ? ` (${models.join(", ")})` : ""}`);
  }
}
