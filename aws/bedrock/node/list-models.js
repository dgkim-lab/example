import { ListFoundationModelsCommand } from "@aws-sdk/client-bedrock";

import { awsRegion, bedrockClient } from "./bedrock-common.js";

const response = await bedrockClient().send(new ListFoundationModelsCommand({}));
const models = response.modelSummaries || [];

console.log(`Available Bedrock foundation models in ${awsRegion()}: ${models.length}`);
for (const model of models) {
  const outputs = (model.outputModalities || []).join(", ");
  const lifecycle = model.modelLifecycle?.status || "";
  console.log(
    `${model.modelId}\t${model.providerName}\t${model.modelName}\toutputs=${outputs}\tstatus=${lifecycle}`,
  );
}

