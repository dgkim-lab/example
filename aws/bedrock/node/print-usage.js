import {
  GetMetricStatisticsCommand,
  ListMetricsCommand,
} from "@aws-sdk/client-cloudwatch";

import { awsRegion, cloudwatchClient } from "./bedrock-common.js";

const COUNT_METRICS = [
  "Invocations",
  "InvocationClientErrors",
  "InvocationServerErrors",
  "InvocationThrottles",
  "InputTokenCount",
  "OutputTokenCount",
  "CacheReadInputTokens",
  "CacheWriteInputTokens",
];

async function discoverModelIds(client) {
  const modelIds = new Set(
    [process.env.AMAZON_BEDROCK_MODEL_ID, process.env.ANTHROPIC_BEDROCK_MODEL_ID].filter(Boolean),
  );
  let nextToken;

  do {
    const response = await client.send(
      new ListMetricsCommand({
        Namespace: "AWS/Bedrock",
        MetricName: "Invocations",
        NextToken: nextToken,
      }),
    );

    for (const metric of response.Metrics || []) {
      for (const dimension of metric.Dimensions || []) {
        if (dimension.Name === "ModelId") {
          modelIds.add(dimension.Value);
        }
      }
    }

    nextToken = response.NextToken;
  } while (nextToken);

  return [...modelIds].sort();
}

async function metricSum(client, modelId, metricName, start, end, period) {
  const response = await client.send(
    new GetMetricStatisticsCommand({
      Namespace: "AWS/Bedrock",
      MetricName: metricName,
      Dimensions: [{ Name: "ModelId", Value: modelId }],
      StartTime: start,
      EndTime: end,
      Period: period,
      Statistics: ["Sum"],
    }),
  );

  return (response.Datapoints || []).reduce((total, point) => total + (point.Sum || 0), 0);
}

const hours = Number.parseInt(process.env.USAGE_LOOKBACK_HOURS || "24", 10);
const period = Number.parseInt(process.env.USAGE_PERIOD_SECONDS || "3600", 10);
const end = new Date();
const start = new Date(end.getTime() - hours * 60 * 60 * 1000);
const client = cloudwatchClient();
const modelIds = await discoverModelIds(client);

console.log(`Bedrock CloudWatch usage in ${awsRegion()} for the last ${hours} hour(s)`);
console.log("Source: AWS/Bedrock metrics, grouped by ModelId");

if (modelIds.length === 0) {
  console.log("No Bedrock invocation metrics found. Run a model call first, then wait a few minutes.");
  process.exit(0);
}

console.log(["model_id", ...COUNT_METRICS].join("\t"));

for (const modelId of modelIds) {
  const values = [];
  for (const metric of COUNT_METRICS) {
    values.push(Math.trunc(await metricSum(client, modelId, metric, start, end, period)).toString());
  }
  console.log([modelId, ...values].join("\t"));
}
