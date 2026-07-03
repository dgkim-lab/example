#!/usr/bin/env python3

from __future__ import annotations

from copilot_metrics_common import (
    aggregate_daily_entity,
    aggregate_model_feature,
    cli_totals,
    fetch_daily_report,
    format_table,
    iter_days,
    parse_args,
    resolve_date_range,
    top_model_label,
)


def main() -> None:
    args = parse_args(
        "Show a compact Copilot usage report with daily CLI token totals and top chat models.",
        default_days=7,
        include_show_models=True,
    )
    start, end = resolve_date_range(args)

    rows = []
    for day in iter_days(start, end):
        day_rows = fetch_daily_report(args.scope, args.target, "organization-1-day" if args.scope == "org" else "enterprise-1-day", day)
        if not day_rows:
            rows.append([day.isoformat(), 0, 0, 0, 0, 0, 0, 0, "-"])
            continue

        record = aggregate_daily_entity(day_rows)
        cli = cli_totals(record)
        models = aggregate_model_feature(day_rows)
        rows.append(
            [
                day.isoformat(),
                record.get("daily_active_users", 0),
                record.get("daily_active_cli_users", 0),
                cli["session_count"],
                cli["request_count"],
                cli["prompt_tokens_sum"],
                cli["output_tokens_sum"],
                cli["total_tokens_sum"],
                top_model_label(models, args.show_models),
            ]
        )

    print(
        format_table(
            [
                "day",
                "active_users",
                "cli_users",
                "cli_sessions",
                "cli_requests",
                "prompt_tokens",
                "output_tokens",
                "total_tokens",
                "top_models",
            ],
            rows,
        )
    )


if __name__ == "__main__":
    main()
