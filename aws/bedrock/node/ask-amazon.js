import { converse } from "./bedrock-common.js";

const modelId = process.env.AMAZON_BEDROCK_MODEL_ID || "us.amazon.nova-lite-v1:0";

console.log(`Model: ${modelId}\n`);
console.log(await converse(modelId));

