import os
from datetime import datetime, timedelta, timezone

from bedrock_common import aws_region, cloudwatch_client


COUNT_METRICS = [
    "Invocations",
    "InvocationClientErrors",
    "InvocationServerErrors",
    "InvocationThrottles",
    "InputTokenCount",
    "OutputTokenCount",
    "CacheReadInputTokens",
    "CacheWriteInputTokens",
]


def discover_model_ids(client) -> list[str]:
    paginator = client.get_paginator("list_metrics")
    model_ids = set()

    for page in paginator.paginate(Namespace="AWS/Bedrock", MetricName="Invocations"):
        for metric in page.get("Metrics", []):
            for dimension in metric.get("Dimensions", []):
                if dimension.get("Name") == "ModelId":
                    model_ids.add(dimension["Value"])

    configured_models = [
        os.getenv("AMAZON_BEDROCK_MODEL_ID"),
        os.getenv("ANTHROPIC_BEDROCK_MODEL_ID"),
    ]
    model_ids.update(model for model in configured_models if model)
    return sorted(model_ids)


def metric_sum(client, model_id: str, metric_name: str, start: datetime, end: datetime, period: int) -> float:
    response = client.get_metric_statistics(
        Namespace="AWS/Bedrock",
        MetricName=metric_name,
        Dimensions=[{"Name": "ModelId", "Value": model_id}],
        StartTime=start,
        EndTime=end,
        Period=period,
        Statistics=["Sum"],
    )
    return sum(point.get("Sum", 0.0) for point in response.get("Datapoints", []))


def main() -> None:
    hours = int(os.getenv("USAGE_LOOKBACK_HOURS", "24"))
    period = int(os.getenv("USAGE_PERIOD_SECONDS", "3600"))
    end = datetime.now(timezone.utc)
    start = end - timedelta(hours=hours)
    client = cloudwatch_client()
    model_ids = discover_model_ids(client)

    print(f"Bedrock CloudWatch usage in {aws_region()} for the last {hours} hour(s)")
    print("Source: AWS/Bedrock metrics, grouped by ModelId")

    if not model_ids:
        print("No Bedrock invocation metrics found. Run a model call first, then wait a few minutes.")
        return

    header = ["model_id", *COUNT_METRICS]
    print("\t".join(header))

    for model_id in model_ids:
        values = [
            str(int(metric_sum(client, model_id, metric, start, end, period)))
            for metric in COUNT_METRICS
        ]
        print("\t".join([model_id, *values]))


if __name__ == "__main__":
    main()
