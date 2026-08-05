# Amazon Bedrock Hello World Examples

Small examples for testing Amazon Bedrock with Python/boto3 and Node.js.

The examples do three things:

- List available foundation models in your AWS Region.
- Ask an Amazon model to write Hello World in Rust.
- Ask an Anthropic model to write Hello World in Rust.
- Print recent Bedrock runtime usage from CloudWatch metrics.

They use the Bedrock `Converse` API for text generation because it works across supported model providers with a consistent request shape.

## Prerequisites

1. AWS credentials configured locally, for example with `aws configure`, SSO, or environment variables.
2. Bedrock model access enabled in the AWS console for the models you want to call.
3. A region where the selected models are available. The examples default to `us-east-1`.

Useful IAM permissions for this hello-world test:

```json
{
  "Effect": "Allow",
  "Action": [
    "bedrock:ListFoundationModels",
    "bedrock:GetFoundationModel",
    "bedrock:InvokeModel",
    "bedrock:InvokeModelWithResponseStream"
  ],
  "Resource": "*"
}
```

## Python

Install:

```bash
cp .env.example .env
cd python
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

List models:

```bash
python list_models.py
```

Ask Amazon Nova:

```bash
python ask_amazon.py
```

Ask Anthropic Claude:

```bash
python ask_anthropic.py
```

Print recent Bedrock usage from CloudWatch:

```bash
python print_usage.py
```

## Node.js

Install:

```bash
cp .env.example .env
cd node
npm install
```

List models:

```bash
npm run list-models
```

Ask Amazon Nova:

```bash
npm run ask-amazon
```

Ask Anthropic Claude:

```bash
npm run ask-anthropic
```

Print recent Bedrock usage from CloudWatch:

```bash
npm run usage
```

## Configuration

Copy `.env.example` to `.env`, then edit values as needed:

```bash
cp .env.example .env
```

The examples load `.env` from the repo root. They also load `python/.env` or `node/.env` when present, which is useful when running from inside those directories.

All examples read these environment variables:

- `AWS_REGION`: AWS Region, default `us-east-1`.
- `AMAZON_BEDROCK_MODEL_ID`: Amazon model ID, default `us.amazon.nova-lite-v1:0`.
- `ANTHROPIC_BEDROCK_MODEL_ID`: Anthropic model ID, default `us.anthropic.claude-sonnet-4-20250514-v1:0`.
- `PROMPT`: prompt text, default `Write hello world in Rust lang. Return only the code block.`
- `USAGE_LOOKBACK_HOURS`: CloudWatch usage lookback window, default `24`.
- `USAGE_PERIOD_SECONDS`: CloudWatch metric period, default `3600`.

Examples:

```bash
AWS_REGION=us-west-2 python list_models.py
AMAZON_BEDROCK_MODEL_ID=us.amazon.nova-micro-v1:0 python ask_amazon.py
ANTHROPIC_BEDROCK_MODEL_ID=us.anthropic.claude-3-haiku-20240307-v1:0 npm run ask-anthropic
```

If a model call fails with an access or validation error, run the list-models example in the same region and choose a text-capable model that your account can access.

For Amazon Nova, prefer inference profile IDs such as `us.amazon.nova-lite-v1:0`, `eu.amazon.nova-lite-v1:0`, or `apac.amazon.nova-lite-v1:0`. Using `amazon.nova-lite-v1:0` directly can fail with:

```text
Invocation of model ID amazon.nova-lite-v1:0 with on-demand throughput isn't supported.
```

For newer Anthropic Claude models, inference profile IDs such as `us.anthropic.claude-sonnet-4-20250514-v1:0` are often the right default for on-demand calls.

Anthropic models also require a one-time Bedrock model access/use-case submission for the AWS account. If you see this error:

```text
Model use case details have not been submitted for this account.
```

Current AWS Bedrock access behavior is mostly automatic for foundation models when the caller has the required AWS Marketplace permissions. Anthropic is a special case: first-time users must submit First Time Use use-case details once per AWS account, or once in the AWS Organizations management account.

To submit the Anthropic details, open the Amazon Bedrock console, select an Anthropic model from the model catalog, and complete the use-case form shown there. You can also submit it programmatically with the `PutUseCaseForModelAccess` API. AWS says access is granted immediately after successful submission, though subscription setup and permission propagation can still take a few minutes.

For programmatic third-party model access, the IAM role may also need:

```json
{
  "Effect": "Allow",
  "Action": [
    "aws-marketplace:Subscribe",
    "aws-marketplace:Unsubscribe",
    "aws-marketplace:ViewSubscriptions"
  ],
  "Resource": "*"
}
```

While Anthropic access is pending, run the Amazon Nova example:

```bash
python ask_amazon.py
```

or:

```bash
npm run ask-amazon
```

## Usage Report

The usage scripts read Amazon Bedrock runtime metrics from CloudWatch namespace `AWS/Bedrock`. They print per-model sums for invocations, errors, throttles, input tokens, output tokens, and prompt cache tokens.

The usage report requires CloudWatch read permission, for example:

```json
{
  "Effect": "Allow",
  "Action": [
    "cloudwatch:ListMetrics",
    "cloudwatch:GetMetricStatistics"
  ],
  "Resource": "*"
}
```

CloudWatch metrics can take a few minutes to appear after a model call.
