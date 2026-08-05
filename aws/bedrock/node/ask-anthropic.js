import { converse } from "./bedrock-common.js";

const modelId =
  process.env.ANTHROPIC_BEDROCK_MODEL_ID || "us.anthropic.claude-sonnet-4-20250514-v1:0";

console.log(`Model: ${modelId}\n`);
console.log(await converse(modelId));
