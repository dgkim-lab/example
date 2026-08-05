# Agent Conversation

Date: 2026-08-05

## User Request

The user wanted a hello-world level Amazon Bedrock test project with example code using boto3 or Node.js libraries. The requested examples were:

- Ask an AI model to `write hello world in rust lang`.
- List available Bedrock models.
- Demonstrate usage with both an Amazon model and an Anthropic model.

The user then requested this conversation summary file.

The user later requested:

- A `.gitignore` for both Node.js and Python, with a Python virtual environment under `python/venv`.
- A script to print Bedrock usage.
- `.env` style configuration and a `.env.example` file.

## Work Completed

Created a small self-contained Bedrock example set:

- `README.md`: setup, prerequisites, required permissions, and run commands.
- `python/requirements.txt`: boto3 dependency.
- `python/bedrock_common.py`: shared Python Bedrock clients and Converse helper.
- `python/list_models.py`: lists available foundation models.
- `python/ask_amazon.py`: asks an Amazon Nova model for Rust hello world.
- `python/ask_anthropic.py`: asks an Anthropic Claude model for Rust hello world.
- `node/package.json`: Node.js SDK v3 dependencies and scripts.
- `node/bedrock-common.js`: shared Node.js Bedrock clients and Converse helper.
- `node/list-models.js`: lists available foundation models.
- `node/ask-amazon.js`: asks an Amazon Nova model for Rust hello world.
- `node/ask-anthropic.js`: asks an Anthropic Claude model for Rust hello world.
- `AGENT-CONVERSATION.md`: this session summary.

Additional files and changes:

- `.gitignore`: ignores Python caches, `python/venv`, Node `node_modules`, env files, and common editor/OS files.
- `.env.example`: documents environment variables used by both Python and Node.js examples.
- `python/print_usage.py`: prints recent Bedrock runtime usage from CloudWatch metrics.
- `node/print-usage.js`: prints recent Bedrock runtime usage from CloudWatch metrics.
- `python/bedrock_common.py` and `node/bedrock-common.js`: load `.env` from the repo root, and also from the language subdirectory when present.

## Implementation Notes

The examples use Amazon Bedrock's `Converse` API for inference so Amazon and Anthropic text models can be called with the same message format.

Default configuration:

- Region: `us-east-1`
- Amazon model: `us.amazon.nova-lite-v1:0`
- Anthropic model: `us.anthropic.claude-sonnet-4-20250514-v1:0`
- Prompt: `Write hello world in Rust lang. Return only the code block.`

Environment variables can override these:

- `AWS_REGION`
- `AMAZON_BEDROCK_MODEL_ID`
- `ANTHROPIC_BEDROCK_MODEL_ID`
- `PROMPT`
- `USAGE_LOOKBACK_HOURS`
- `USAGE_PERIOD_SECONDS`

## Usage Reporting

The usage scripts query CloudWatch namespace `AWS/Bedrock` and group runtime metrics by `ModelId`. They report invocation count, client/server errors, throttles, input tokens, output tokens, and prompt cache token metrics.

Required CloudWatch actions:

- `cloudwatch:ListMetrics`
- `cloudwatch:GetMetricStatistics`

## Referenced Documentation

AWS documentation was checked for current Bedrock examples and API usage:

- `ListFoundationModels` for listing available models.
- `Converse` for cross-provider text generation.
- AWS SDK for JavaScript v3 Bedrock examples.
- Amazon Nova and Anthropic model documentation.
- Bedrock inference profile documentation for models that don't support direct on-demand invocation with the regional model ID.
- Anthropic access troubleshooting was corrected to reflect current AWS documentation: model access is mostly automatic with Marketplace permissions, while Anthropic requires a First Time Use form submitted through the model catalog or `PutUseCaseForModelAccess`.
