import {
  desiredConfigPath,
  loadDotEnv,
  localEnvPath,
  readJson,
  secretRefsPath
} from "./lib.mjs";

const requiredProviders = ["openai", "google", "ollama"];
const config = readJson(desiredConfigPath);
const failures = [];
const warnings = [];
const localEnv = loadDotEnv(localEnvPath);
const secretRefs = readJson(secretRefsPath);

if (!config.$schema) failures.push("Missing $schema.");
if (!config.provider || typeof config.provider !== "object") failures.push("Missing provider object.");

for (const provider of requiredProviders) {
  if (!config.provider?.[provider]) failures.push(`Missing provider.${provider}.`);
}

for (const name of ["OPENAI_API_KEY", "GEMINI_API_KEY"]) {
  if (!localEnv[name] && !process.env[name]) warnings.push(`${name} is not set in ${localEnvPath} or the current shell.`);
}

for (const [providerId, envName] of Object.entries(secretRefs.providerApiKeys ?? {})) {
  if (!config.provider?.[providerId]) {
    warnings.push(`Secret reference for provider.${providerId} exists but the provider is not configured.`);
    continue;
  }

  if (!localEnv[envName] && !process.env[envName]) {
    warnings.push(`${envName} for provider.${providerId} is not set in ${localEnvPath} or the current shell.`);
  }
}

if (config.provider?.["amazon-bedrock"]) {
  const hasBearerToken = localEnv.AWS_BEARER_TOKEN_BEDROCK || process.env.AWS_BEARER_TOKEN_BEDROCK;
  const hasStaticCredentials =
    (localEnv.AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID) &&
    (localEnv.AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY);
  const hasProfile = localEnv.AWS_PROFILE || process.env.AWS_PROFILE || config.provider["amazon-bedrock"].options?.profile;
  if (!hasBearerToken && !hasStaticCredentials && !hasProfile) {
    warnings.push("Amazon Bedrock has no explicit credentials; ensure the AWS credential chain is available when opencode starts.");
  }
  if (!config.provider["amazon-bedrock"].options?.region && !(localEnv.AWS_REGION || process.env.AWS_REGION)) {
    warnings.push("Amazon Bedrock has no region; set provider.amazon-bedrock.options.region or AWS_REGION.");
  }
}

if (config.enabled_providers) {
  for (const provider of Object.keys(config.provider ?? {})) {
    if (!config.enabled_providers.includes(provider)) {
      warnings.push(`provider.${provider} exists but is not listed in enabled_providers.`);
    }
  }
}

if (typeof config.model !== "string" || !config.model.includes("/")) {
  warnings.push("model should be in provider/model format.");
}

for (const warning of warnings) console.warn(`warn: ${warning}`);

if (failures.length > 0) {
  for (const failure of failures) console.error(`fail: ${failure}`);
  process.exit(1);
}

console.log(`ok: ${desiredConfigPath} is valid`);
