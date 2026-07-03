#!/usr/bin/env python3

from __future__ import annotations

import argparse
import datetime as dt
import json
from collections import defaultdict
from pathlib import Path
from typing import Any


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Summarize personal Copilot CLI usage from local session event files."
    )
    parser.add_argument(
        "--root",
        default=str(Path.home() / ".copilot" / "session-state"),
        help="Directory containing Copilot session-state folders. Default: ~/.copilot/session-state",
    )
    parser.add_argument("--start-date", help="Start date in YYYY-MM-DD format.")
    parser.add_argument("--end-date", help="End date in YYYY-MM-DD format.")
    parser.add_argument(
        "--days",
        type=int,
        default=14,
        help="Trailing days to include when explicit dates are not provided. Default: 14.",
    )
    parser.add_argument(
        "--json-out",
        help="Optional path to write the structured report as JSON.",
    )
    parser.add_argument(
        "--markdown-out",
        help="Optional path to write the Markdown report. Defaults to a generated .md file in the current directory.",
    )
    parser.add_argument(
        "--top-sessions",
        type=int,
        default=10,
        help="How many sessions to show in the session details table. Default: 10.",
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
        end = dt.datetime.now(dt.timezone.utc).date()
        start = end - dt.timedelta(days=args.days - 1)
    if start > end:
        raise SystemExit("--start-date must be on or before --end-date.")
    return start, end


def iso_to_datetime(value: str | None) -> dt.datetime | None:
    if not value:
        return None
    return dt.datetime.fromisoformat(value.replace("Z", "+00:00"))


def format_number(value: Any) -> str:
    if value is None:
        return "-"
    if isinstance(value, float):
        if value.is_integer():
            return str(int(value))
        return f"{value:.2f}"
    return str(value)


def format_table(headers: list[str], rows: list[list[Any]]) -> str:
    normalized = [[format_number(cell) for cell in row] for row in rows]
    widths = [len(header) for header in headers]
    for row in normalized:
        for index, cell in enumerate(row):
            widths[index] = max(widths[index], len(cell))

    def render(cells: list[str]) -> str:
        return " | ".join(cell.ljust(widths[index]) for index, cell in enumerate(cells))

    separator = "-+-".join("-" * width for width in widths)
    return "\n".join([render(headers), separator, *[render(row) for row in normalized]])


def markdown_cell(value: Any) -> str:
    return format_number(value).replace("|", "\\|").replace("\n", "<br>")


def format_markdown_table(headers: list[str], rows: list[list[Any]]) -> str:
    header_line = "| " + " | ".join(headers) + " |"
    separator_line = "| " + " | ".join(["---"] * len(headers)) + " |"
    body_lines = [
        "| " + " | ".join(markdown_cell(cell) for cell in row) + " |"
        for row in rows
    ]
    return "\n".join([header_line, separator_line, *body_lines])


def default_markdown_path(start_date: dt.date, end_date: dt.date) -> Path:
    filename = f"copilot-usage-local-{start_date.isoformat()}-to-{end_date.isoformat()}.md"
    return Path.cwd() / filename


def write_markdown_report(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def short_path(value: str | None) -> str:
    if not value:
        return "-"
    stripped = value.rstrip("/")
    if not stripped:
        return "/"
    return Path(stripped).name or stripped


def parse_session_events(path: Path) -> dict[str, Any] | None:
    session: dict[str, Any] = {
        "session_id": path.parent.name,
        "source_file": str(path),
        "start_time": None,
        "end_time": None,
        "copilot_version": None,
        "cwd": None,
        "current_model": None,
        "premium_requests": 0,
        "api_duration_ms": 0,
        "lines_added": 0,
        "lines_removed": 0,
        "files_modified": 0,
        "user_messages": 0,
        "assistant_messages": 0,
        "tool_calls": 0,
        "errors": 0,
        "tokens": {
            "input": 0,
            "output": 0,
            "cache_read": 0,
            "cache_write": 0,
            "current": 0,
            "system": 0,
            "conversation": 0,
            "tool_definitions": 0,
        },
        "models": defaultdict(
            lambda: {
                "requests": 0,
                "premium_requests": 0,
                "input_tokens": 0,
                "output_tokens": 0,
                "cache_read_tokens": 0,
                "cache_write_tokens": 0,
            }
        ),
    }

    with path.open(encoding="utf-8") as handle:
        for line in handle:
            if not line.strip():
                continue
            event = json.loads(line)
            event_type = event.get("type")
            data = event.get("data", {})

            if event_type == "session.start":
                session["start_time"] = data.get("startTime") or event.get("timestamp")
                session["copilot_version"] = data.get("copilotVersion")
                context = data.get("context", {}) or {}
                session["cwd"] = context.get("cwd")
            elif event_type == "session.shutdown":
                session["end_time"] = event.get("timestamp")
                session["current_model"] = data.get("currentModel")
                session["premium_requests"] = int(data.get("totalPremiumRequests", 0) or 0)
                session["api_duration_ms"] = int(data.get("totalApiDurationMs", 0) or 0)
                code_changes = data.get("codeChanges", {}) or {}
                session["lines_added"] = int(code_changes.get("linesAdded", 0) or 0)
                session["lines_removed"] = int(code_changes.get("linesRemoved", 0) or 0)
                session["files_modified"] = len(code_changes.get("filesModified", []) or [])
                session["tokens"]["current"] = int(data.get("currentTokens", 0) or 0)
                session["tokens"]["system"] = int(data.get("systemTokens", 0) or 0)
                session["tokens"]["conversation"] = int(data.get("conversationTokens", 0) or 0)
                session["tokens"]["tool_definitions"] = int(data.get("toolDefinitionsTokens", 0) or 0)
                for model_name, metrics in (data.get("modelMetrics", {}) or {}).items():
                    request_metrics = metrics.get("requests", {}) or {}
                    usage = metrics.get("usage", {}) or {}
                    model_bucket = session["models"][model_name]
                    model_bucket["requests"] += int(request_metrics.get("count", 0) or 0)
                    model_bucket["premium_requests"] += int(request_metrics.get("cost", 0) or 0)
                    model_bucket["input_tokens"] += int(usage.get("inputTokens", 0) or 0)
                    model_bucket["output_tokens"] += int(usage.get("outputTokens", 0) or 0)
                    model_bucket["cache_read_tokens"] += int(usage.get("cacheReadTokens", 0) or 0)
                    model_bucket["cache_write_tokens"] += int(usage.get("cacheWriteTokens", 0) or 0)
                    session["tokens"]["input"] += int(usage.get("inputTokens", 0) or 0)
                    session["tokens"]["output"] += int(usage.get("outputTokens", 0) or 0)
                    session["tokens"]["cache_read"] += int(usage.get("cacheReadTokens", 0) or 0)
                    session["tokens"]["cache_write"] += int(usage.get("cacheWriteTokens", 0) or 0)
            elif event_type == "user.message":
                session["user_messages"] += 1
            elif event_type == "assistant.message":
                session["assistant_messages"] += 1
            elif event_type == "tool.execution_start":
                session["tool_calls"] += 1
            elif event_type == "session.error":
                session["errors"] += 1

    if session["end_time"] is None:
        return None

    session["models"] = dict(session["models"])
    return session


def main() -> None:
    args = parse_args()
    start_date, end_date = resolve_date_range(args)
    root = Path(args.root).expanduser()
    event_files = sorted(root.glob("*/events.jsonl"))

    sessions: list[dict[str, Any]] = []
    for event_file in event_files:
        session = parse_session_events(event_file)
        if not session:
            continue
        end_time = iso_to_datetime(session["end_time"])
        if end_time is None:
            continue
        day = end_time.date()
        if start_date <= day <= end_date:
            start_time = iso_to_datetime(session["start_time"])
            session["day"] = day.isoformat()
            session["duration_minutes"] = (
                round((end_time - start_time).total_seconds() / 60, 2) if start_time else None
            )
            sessions.append(session)

    daily: dict[str, dict[str, Any]] = {}
    models_by_day: dict[tuple[str, str], dict[str, int]] = defaultdict(
        lambda: {
            "requests": 0,
            "premium_requests": 0,
            "input_tokens": 0,
            "output_tokens": 0,
            "cache_read_tokens": 0,
            "cache_write_tokens": 0,
        }
    )

    for session in sessions:
        day_bucket = daily.setdefault(
            session["day"],
            {
                "sessions": 0,
                "premium_requests": 0,
                "api_duration_ms": 0,
                "user_messages": 0,
                "assistant_messages": 0,
                "tool_calls": 0,
                "errors": 0,
                "lines_added": 0,
                "lines_removed": 0,
                "files_modified": 0,
                "input_tokens": 0,
                "output_tokens": 0,
                "cache_read_tokens": 0,
                "cache_write_tokens": 0,
            },
        )
        day_bucket["sessions"] += 1
        day_bucket["premium_requests"] += session["premium_requests"]
        day_bucket["api_duration_ms"] += session["api_duration_ms"]
        day_bucket["user_messages"] += session["user_messages"]
        day_bucket["assistant_messages"] += session["assistant_messages"]
        day_bucket["tool_calls"] += session["tool_calls"]
        day_bucket["errors"] += session["errors"]
        day_bucket["lines_added"] += session["lines_added"]
        day_bucket["lines_removed"] += session["lines_removed"]
        day_bucket["files_modified"] += session["files_modified"]
        day_bucket["input_tokens"] += session["tokens"]["input"]
        day_bucket["output_tokens"] += session["tokens"]["output"]
        day_bucket["cache_read_tokens"] += session["tokens"]["cache_read"]
        day_bucket["cache_write_tokens"] += session["tokens"]["cache_write"]

        for model_name, metrics in session["models"].items():
            model_bucket = models_by_day[(session["day"], model_name)]
            for key, value in metrics.items():
                model_bucket[key] += int(value)

    daily_rows = []
    for day in sorted(daily):
        bucket = daily[day]
        total_tokens = bucket["input_tokens"] + bucket["output_tokens"]
        daily_rows.append(
            [
                day,
                bucket["sessions"],
                bucket["premium_requests"],
                bucket["user_messages"],
                bucket["tool_calls"],
                bucket["input_tokens"],
                bucket["output_tokens"],
                total_tokens,
                bucket["cache_read_tokens"],
                round(bucket["api_duration_ms"] / 1000, 2),
            ]
        )

    model_rows = []
    for (day, model_name), bucket in sorted(
        models_by_day.items(),
        key=lambda item: (item[0][0], -(item[1]["input_tokens"] + item[1]["output_tokens"]), item[0][1]),
    ):
        model_rows.append(
            [
                day,
                model_name,
                bucket["requests"],
                bucket["premium_requests"],
                bucket["input_tokens"],
                bucket["output_tokens"],
                bucket["input_tokens"] + bucket["output_tokens"],
                bucket["cache_read_tokens"],
            ]
        )

    top_sessions = sorted(
        sessions,
        key=lambda session: (
            -(session["tokens"]["input"] + session["tokens"]["output"]),
            -session["premium_requests"],
            session["session_id"],
        ),
    )[: args.top_sessions]

    session_rows = [
        [
            session["day"],
            session["current_model"] or "-",
            session["premium_requests"],
            session["user_messages"],
            session["tool_calls"],
            session["tokens"]["input"],
            session["tokens"]["output"],
            session["tokens"]["input"] + session["tokens"]["output"],
            session["duration_minutes"],
            short_path(session["cwd"]),
        ]
        for session in top_sessions
    ]

    daily_headers = [
        "day",
        "sessions",
        "premium_requests",
        "user_msgs",
        "tool_calls",
        "input_tokens",
        "output_tokens",
        "total_tokens",
        "cache_read_tokens",
        "api_seconds",
    ]
    model_headers = [
        "day",
        "model",
        "requests",
        "premium_requests",
        "input_tokens",
        "output_tokens",
        "total_tokens",
        "cache_read_tokens",
    ]
    session_headers = [
        "day",
        "current_model",
        "premium_requests",
        "user_msgs",
        "tool_calls",
        "input_tokens",
        "output_tokens",
        "total_tokens",
        "duration_minutes",
        "cwd",
    ]

    print("== Daily personal usage from local Copilot CLI files ==")
    print(
        format_table(
            daily_headers,
            daily_rows or [["-", 0, 0, 0, 0, 0, 0, 0, 0, 0]],
        )
    )
    print()
    print("== Model usage by day ==")
    print(
        format_table(
            model_headers,
            model_rows or [["-", "-", 0, 0, 0, 0, 0, 0]],
        )
    )
    print()
    print(f"== Top sessions ({len(top_sessions)}) ==")
    print(
        format_table(
            session_headers,
            session_rows or [["-", "-", 0, 0, 0, 0, 0, 0, 0, "-"]],
        )
    )
    print()
    print(
        "Note: this report uses completed local Copilot CLI sessions from events.jsonl; "
        "the current live session is not included until it shuts down."
    )

    markdown_out = Path(args.markdown_out).expanduser() if args.markdown_out else default_markdown_path(
        start_date, end_date
    )
    markdown_report = "\n\n".join(
        [
            "# Personal Copilot CLI usage report",
            f"- **Source root:** `{root}`\n- **Date range:** `{start_date.isoformat()}` to `{end_date.isoformat()}`\n- **Sessions included:** `{len(sessions)}`",
            "## Daily personal usage from local Copilot CLI files\n"
            + format_markdown_table(daily_headers, daily_rows or [["-", 0, 0, 0, 0, 0, 0, 0, 0, 0]]),
            "## Model usage by day\n"
            + format_markdown_table(model_headers, model_rows or [["-", "-", 0, 0, 0, 0, 0, 0]]),
            f"## Top sessions ({len(top_sessions)})\n"
            + format_markdown_table(session_headers, session_rows or [["-", "-", 0, 0, 0, 0, 0, 0, 0, "-"]]),
            "> Note: this report uses completed local Copilot CLI sessions from `events.jsonl`; the current live session is not included until it shuts down.",
        ]
    )
    write_markdown_report(markdown_out, markdown_report + "\n")
    print(f"Markdown report saved to: {markdown_out}")

    if args.json_out:
        report = {
            "root": str(root),
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "sessions": sessions,
            "daily": daily,
            "models_by_day": [
                {"day": day, "model": model, **metrics}
                for (day, model), metrics in sorted(models_by_day.items())
            ],
        }
        with open(args.json_out, "w", encoding="utf-8") as handle:
            json.dump(report, handle, indent=2, sort_keys=True)
            handle.write("\n")


if __name__ == "__main__":
    main()
