import path from "node:path";
import { fileURLToPath } from "node:url";

import { BedrockClient } from "@aws-sdk/client-bedrock";
import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import { CloudWatchClient } from "@aws-sdk/client-cloudwatch";
import dotenv from "dotenv";

export const DEFAULT_PROMPT = "Write hello world in Rust lang. Return only the code block.";

const nodeDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(nodeDir, "..");

dotenv.config({ path: path.join(projectRoot, ".env") });
dotenv.config({ path: path.join(nodeDir, ".env"), override: true });

export function awsRegion() {
  return process.env.AWS_REGION || "us-east-1";
}

export function bedrockClient() {
  return new BedrockClient({ region: awsRegion() });
}

export function bedrockRuntimeClient() {
  return new BedrockRuntimeClient({ region: awsRegion() });
}

export function cloudwatchClient() {
  return new CloudWatchClient({ region: awsRegion() });
}

export function validateModelId(modelId) {
  if (modelId.startsWith("amazon.nova-")) {
    throw new Error(
      "Amazon Nova on-demand invocation requires an inference profile in many regions. " +
        `Use a profile ID such as 'us.${modelId}', 'eu.${modelId}', or 'apac.${modelId}' ` +
        "instead of the regional model ID.",
    );
  }
}

export async function converse(modelId, prompt = process.env.PROMPT || DEFAULT_PROMPT) {
  validateModelId(modelId);
  const response = await bedrockRuntimeClient().send(
    new ConverseCommand({
      modelId,
      messages: [
        {
          role: "user",
          content: [{ text: prompt }],
        },
      ],
      inferenceConfig: {
        maxTokens: 512,
        temperature: 0.2,
        topP: 0.9,
      },
    }),
  );

  return (response.output?.message?.content || [])
    .filter((block) => block.text)
    .map((block) => block.text)
    .join("\n");
}
