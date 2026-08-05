import os
from pathlib import Path

import boto3
from dotenv import load_dotenv


DEFAULT_PROMPT = "Write hello world in Rust lang. Return only the code block."
PROJECT_ROOT = Path(__file__).resolve().parents[1]
PYTHON_DIR = Path(__file__).resolve().parent


load_dotenv(PROJECT_ROOT / ".env")
load_dotenv(PYTHON_DIR / ".env", override=True)


def aws_region() -> str:
    return os.getenv("AWS_REGION", "us-east-1")


def bedrock_client():
    return boto3.client("bedrock", region_name=aws_region())


def bedrock_runtime_client():
    return boto3.client("bedrock-runtime", region_name=aws_region())


def cloudwatch_client():
    return boto3.client("cloudwatch", region_name=aws_region())


def validate_model_id(model_id: str) -> None:
    if model_id.startswith("amazon.nova-"):
        raise ValueError(
            "Amazon Nova on-demand invocation requires an inference profile in many regions. "
            f"Use a profile ID such as 'us.{model_id}', 'eu.{model_id}', or 'apac.{model_id}' "
            "instead of the regional model ID."
        )


def converse(model_id: str, prompt: str | None = None) -> str:
    validate_model_id(model_id)
    response = bedrock_runtime_client().converse(
        modelId=model_id,
        messages=[
            {
                "role": "user",
                "content": [{"text": prompt or os.getenv("PROMPT", DEFAULT_PROMPT)}],
            }
        ],
        inferenceConfig={
            "maxTokens": 512,
            "temperature": 0.2,
            "topP": 0.9,
        },
    )

    content = response["output"]["message"]["content"]
    return "\n".join(block["text"] for block in content if "text" in block)
