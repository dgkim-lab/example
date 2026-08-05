import os

from bedrock_common import converse


MODEL_ID = os.getenv("AMAZON_BEDROCK_MODEL_ID", "us.amazon.nova-lite-v1:0")


def main() -> None:
    print(f"Model: {MODEL_ID}\n")
    print(converse(MODEL_ID))


if __name__ == "__main__":
    main()

