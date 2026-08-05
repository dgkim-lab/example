from bedrock_common import aws_region, bedrock_client


def main() -> None:
    response = bedrock_client().list_foundation_models()
    models = response.get("modelSummaries", [])

    print(f"Available Bedrock foundation models in {aws_region()}: {len(models)}")
    for model in models:
        model_id = model.get("modelId", "")
        name = model.get("modelName", "")
        provider = model.get("providerName", "")
        outputs = ", ".join(model.get("outputModalities", []))
        lifecycle = model.get("modelLifecycle", {}).get("status", "")
        print(f"{model_id}\t{provider}\t{name}\toutputs={outputs}\tstatus={lifecycle}")


if __name__ == "__main__":
    main()

