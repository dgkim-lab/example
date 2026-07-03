#!/usr/bin/env python3

from __future__ import annotations

import argparse
import datetime as dt
import json
import subprocess
import sys
import urllib.request
from typing import Any, Iterable


API_VERSION = "2026-03-10"
NUMERIC_BREAKDOWN_FIELDS = (
    "user_initiated_interaction_count",
    "code_generation_activity_count",
    "code_acceptance_activity_count",
    "loc_suggested_to_add_sum",
    "loc_suggested_to_delete_sum",
    "loc_added_sum",
    "loc_deleted_sum",
)


def parse_args(
    description: str,
    *,
    default_days: int,
    include_json_out: bool = False,
    include_top_users: bool = False,
    include_show_models: bool = False,
) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=description)
    parser.add_argument(
        "--scope",
        required=True,
        choices=("org", "enterprise"),
        help="Metrics scope.",
    )
    parser.add_argument(
        "--target",
        required=True,
        help="Organization name or enterprise slug.",
    )
    parser.add_argument(
        "--start-date",
        help="Start date in YYYY-MM-DD format.",
    )
    parser.add_argument(
        "--end-date",
        help="End date in YYYY-MM-DD format.",
    )
    parser.add_argument(
        "--days",
        type=int,
        default=default_days,
        help=f"Number of trailing days to fetch when start/end dates are not provided. Default: {default_days}.",
    )
    if include_json_out:
        parser.add_argument(
            "--json-out",
            help="Optional path to write the structured report as JSON.",
        )
    if include_top_users:
        parser.add_argument(
            "--top-users",
            type=int,
            default=10,
            help="How many users to show in the detailed report. Default: 10.",
        )
    if include_show_models:
        parser.add_argument(
            "--show-models",
            type=int,
            default=3,
            help="How many models to show per day in the simple report. Default: 3.",
        )
    return parser.parse_args()


def resolve_date_range(args: argparse.Namespace) -> tuple[dt.date, dt.date]:
    if args.start_date and not args.end_date:
        raise SystemExit("--end-date is required when --start-date is set.")
    if args.end_date and not args.start_date:
        raise SystemExit("--start-date is required when --end-date is set.")

    if args.start_date and args.end_date:
        start = dt.date.fromisoformat(args.start_date)
        end = dt.date.fromisoformat(args.end_date)
    else:
        if args.days <= 0:
            raise SystemExit("--days must be greater than 0.")
        end = dt.datetime.now(dt.timezone.utc).date() - dt.timedelta(days=2)
        start = end - dt.timedelta(days=args.days - 1)

    if start > end:
        raise SystemExit("--start-date must be on or before --end-date.")

    return start, end


def iter_days(start: dt.date, end: dt.date) -> Iterable[dt.date]:
    current = start
    while current <= end:
        yield current
        current += dt.timedelta(days=1)


def api_path(scope: str, target: str, report_name: str, *, day: str | None = None) -> str:
    if scope == "org":
        base = f"/orgs/{target}/copilot/metrics/reports/{report_name}"
    else:
        base = f"/enterprises/{target}/copilot/metrics/reports/{report_name}"
    return f"{base}?day={day}" if day else base


def gh_api(path: str) -> Any:
    result = subprocess.run(
        [
            "gh",
            "api",
            "-H",
            "Accept: application/vnd.github+json",
            "-H",
            f"X-GitHub-Api-Version: {API_VERSION}",
            path,
        ],
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or f"gh api failed for {path}")
    if not result.stdout.strip():
        return None
    return json.loads(result.stdout)


def download_report_rows(download_links: list[str]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for url in download_links:
        request = urllib.request.Request(url, headers={"Accept": "application/x-ndjson, application/json"})
        with urllib.request.urlopen(request) as response:
            payload = response.read().decode("utf-8")
        rows.extend(parse_rows_payload(payload))
    return rows


def parse_rows_payload(payload: str) -> list[dict[str, Any]]:
    text = payload.strip()
    if not text:
        return []
    if text[0] == "[":
        data = json.loads(text)
        return data if isinstance(data, list) else [data]
    return [json.loads(line) for line in text.splitlines() if line.strip()]


def fetch_daily_report(scope: str, target: str, report_name: str, day: dt.date) -> list[dict[str, Any]]:
    meta = gh_api(api_path(scope, target, report_name, day=day.isoformat()))
    if not meta:
        return []
    links = meta.get("download_links", [])
    return download_report_rows(links)


def merge_by_keys(
    items: Iterable[dict[str, Any]],
    key_fields: tuple[str, ...],
    numeric_fields: tuple[str, ...] = NUMERIC_BREAKDOWN_FIELDS,
) -> list[dict[str, Any]]:
    merged: dict[tuple[Any, ...], dict[str, Any]] = {}
    for item in items:
        key = tuple(item.get(field, "") for field in key_fields)
        bucket = merged.setdefault(key, {field: item.get(field, "") for field in key_fields})
        for field in numeric_fields:
            bucket[field] = int(bucket.get(field, 0)) + int(item.get(field, 0) or 0)
    return list(merged.values())


def aggregate_model_feature(rows: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for row in rows:
        for model_row in row.get("totals_by_model_feature", []) or []:
            items.append(model_row)
    merged = merge_by_keys(items, ("model", "feature"))
    return sorted(
        merged,
        key=lambda row: (
            -int(row.get("user_initiated_interaction_count", 0) or 0),
            -int(row.get("code_generation_activity_count", 0) or 0),
            str(row.get("model", "")),
            str(row.get("feature", "")),
        ),
    )


def aggregate_feature(rows: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for row in rows:
        for feature_row in row.get("totals_by_feature", []) or []:
            items.append(feature_row)
    merged = merge_by_keys(items, ("feature",))
    return sorted(
        merged,
        key=lambda row: (
            -int(row.get("user_initiated_interaction_count", 0) or 0),
            -int(row.get("code_generation_activity_count", 0) or 0),
            str(row.get("feature", "")),
        ),
    )


def aggregate_language_model(rows: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for row in rows:
        for language_model_row in row.get("totals_by_language_model", []) or []:
            items.append(language_model_row)
    merged = merge_by_keys(items, ("language", "model"))
    return sorted(
        merged,
        key=lambda row: (
            -int(row.get("user_initiated_interaction_count", 0) or 0),
            -int(row.get("code_generation_activity_count", 0) or 0),
            str(row.get("language", "")),
            str(row.get("model", "")),
        ),
    )


def cli_totals(row: dict[str, Any]) -> dict[str, Any]:
    cli = row.get("totals_by_cli", {}) or {}
    token_usage = cli.get("token_usage", {}) or {}
    prompt_tokens = int(token_usage.get("prompt_tokens_sum", 0) or 0)
    output_tokens = int(token_usage.get("output_tokens_sum", 0) or 0)
    request_count = int(cli.get("request_count", 0) or 0)
    return {
        "session_count": int(cli.get("session_count", 0) or 0),
        "request_count": request_count,
        "prompt_count": int(cli.get("prompt_count", 0) or 0),
        "prompt_tokens_sum": prompt_tokens,
        "output_tokens_sum": output_tokens,
        "total_tokens_sum": prompt_tokens + output_tokens,
        "avg_tokens_per_request": (
            round((prompt_tokens + output_tokens) / request_count, 2) if request_count else None
        ),
    }


def aggregate_user_day(users_rows: list[dict[str, Any]]) -> dict[str, Any]:
    cli_users = [row for row in users_rows if row.get("used_cli")]
    used_chat_users = sum(1 for row in users_rows if row.get("used_chat"))
    used_agent_users = sum(1 for row in users_rows if row.get("used_agent"))
    credits = sum(float(row.get("ai_credits_used", 0) or 0) for row in users_rows)

    cli_sessions = 0
    cli_requests = 0
    cli_prompts = 0
    cli_prompt_tokens = 0
    cli_output_tokens = 0

    for row in cli_users:
        cli = cli_totals(row)
        cli_sessions += cli["session_count"]
        cli_requests += cli["request_count"]
        cli_prompts += cli["prompt_count"]
        cli_prompt_tokens += cli["prompt_tokens_sum"]
        cli_output_tokens += cli["output_tokens_sum"]

    return {
        "ai_credits_used": round(credits, 2),
        "users_in_report": len(users_rows),
        "used_cli_users": len(cli_users),
        "used_chat_users": used_chat_users,
        "used_agent_users": used_agent_users,
        "cli_session_count": cli_sessions,
        "cli_request_count": cli_requests,
        "cli_prompt_count": cli_prompts,
        "cli_prompt_tokens_sum": cli_prompt_tokens,
        "cli_output_tokens_sum": cli_output_tokens,
        "cli_total_tokens_sum": cli_prompt_tokens + cli_output_tokens,
    }


def aggregate_daily_entity(rows: list[dict[str, Any]]) -> dict[str, Any]:
    totals = {
        "daily_active_users": 0,
        "daily_active_cli_users": 0,
        "daily_active_copilot_cloud_agent_users": 0,
        "daily_active_copilot_code_review_users": 0,
        "loc_added_sum": 0,
        "loc_deleted_sum": 0,
        "totals_by_cli": {
            "session_count": 0,
            "request_count": 0,
            "prompt_count": 0,
            "token_usage": {
                "prompt_tokens_sum": 0,
                "output_tokens_sum": 0,
            },
        },
    }
    for row in rows:
        totals["daily_active_users"] += int(row.get("daily_active_users", 0) or 0)
        totals["daily_active_cli_users"] += int(row.get("daily_active_cli_users", 0) or 0)
        totals["daily_active_copilot_cloud_agent_users"] += int(
            row.get("daily_active_copilot_cloud_agent_users", 0) or 0
        )
        totals["daily_active_copilot_code_review_users"] += int(
            row.get("daily_active_copilot_code_review_users", 0) or 0
        )
        totals["loc_added_sum"] += int(row.get("loc_added_sum", 0) or 0)
        totals["loc_deleted_sum"] += int(row.get("loc_deleted_sum", 0) or 0)
        cli = cli_totals(row)
        totals["totals_by_cli"]["session_count"] += cli["session_count"]
        totals["totals_by_cli"]["request_count"] += cli["request_count"]
        totals["totals_by_cli"]["prompt_count"] += cli["prompt_count"]
        totals["totals_by_cli"]["token_usage"]["prompt_tokens_sum"] += cli["prompt_tokens_sum"]
        totals["totals_by_cli"]["token_usage"]["output_tokens_sum"] += cli["output_tokens_sum"]

    request_count = totals["totals_by_cli"]["request_count"]
    prompt_tokens = totals["totals_by_cli"]["token_usage"]["prompt_tokens_sum"]
    output_tokens = totals["totals_by_cli"]["token_usage"]["output_tokens_sum"]
    totals["totals_by_cli"]["token_usage"]["avg_tokens_per_request"] = (
        round((prompt_tokens + output_tokens) / request_count, 2) if request_count else None
    )
    return totals


def top_model_label(model_rows: list[dict[str, Any]], limit: int) -> str:
    if not model_rows:
        return "-"
    labels: list[str] = []
    for row in model_rows[:limit]:
        model = row.get("model", "unknown")
        prompts = int(row.get("user_initiated_interaction_count", 0) or 0)
        generated = int(row.get("code_generation_activity_count", 0) or 0)
        labels.append(f"{model} (prompts={prompts}, generated={generated})")
    return "; ".join(labels)


def format_number(value: Any) -> str:
    if value is None:
        return "-"
    if isinstance(value, float):
        if value.is_integer():
            return str(int(value))
        return f"{value:.2f}"
    return str(value)


def format_table(headers: list[str], rows: list[list[Any]]) -> str:
    string_rows = [[format_number(cell) for cell in row] for row in rows]
    widths = [len(header) for header in headers]
    for row in string_rows:
        for index, cell in enumerate(row):
            widths[index] = max(widths[index], len(cell))

    def render(cells: list[str]) -> str:
        return " | ".join(cell.ljust(widths[index]) for index, cell in enumerate(cells))

    separator = "-+-".join("-" * width for width in widths)
    table = [render(headers), separator]
    table.extend(render(row) for row in string_rows)
    return "\n".join(table)


def write_json_report(path: str, data: dict[str, Any]) -> None:
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(data, handle, indent=2, sort_keys=True)
        handle.write("\n")


def die(message: str) -> None:
    print(f"error: {message}", file=sys.stderr)
    raise SystemExit(1)
