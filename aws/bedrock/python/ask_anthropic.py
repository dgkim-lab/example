import os

from bedrock_common import converse


MODEL_ID = os.getenv(
    "ANTHROPIC_BEDROCK_MODEL_ID",
    "us.anthropic.claude-sonnet-4-20250514-v1:0",
)


def main() -> None:
    print(f"Model: {MODEL_ID}\n")
    print(converse(MODEL_ID))


if __name__ == "__main__":
    main()
