import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { injectProviderApiKeys } from "../scripts/lib.mjs";

const configPath = resolve(dirname(fileURLToPath(import.meta.url)), "../config/opencode.json");

test("configures the built-in Amazon Bedrock provider", () => {
  const config = JSON.parse(readFileSync(configPath, "utf8"));
  const bedrock = config.provider["amazon-bedrock"];

  assert.equal(config.enabled_providers.includes("amazon-bedrock"), true);
  assert.equal(bedrock.options.region, "ap-northeast-2");
  assert.equal(config.model, "amazon-bedrock/amazon.nova-lite-v1:0");
  assert.ok(bedrock.models["amazon.nova-lite-v1:0"]);
});

test("does not persist AWS credentials through API-key injection", () => {
  const config = {
    provider: {
      "amazon-bedrock": { options: { region: "ap-northeast-2" } }
    }
  };
  const result = injectProviderApiKeys(config, { providerApiKeys: {} }, {
    AWS_ACCESS_KEY_ID: "access-key",
    AWS_SECRET_ACCESS_KEY: "secret-key"
  });

  assert.deepEqual(result.missing, []);
  assert.deepEqual(result.config, config);
});
