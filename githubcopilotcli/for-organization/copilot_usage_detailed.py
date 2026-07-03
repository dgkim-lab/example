#!/usr/bin/env python3

from __future__ import annotations

from copilot_metrics_common import (
    aggregate_daily_entity,
    aggregate_feature,
    aggregate_language_model,
    aggregate_model_feature,
    aggregate_user_day,
    cli_totals,
    fetch_daily_report,
    format_table,
    iter_days,
    parse_args,
    resolve_date_range,
    top_model_label,
    write_json_report,
)


def main() -> None:
    args = parse_args(
        "Show a detailed Copilot usage report with daily summaries, model breakdowns, and top users.",
        default_days=14,
        include_json_out=True,
        include_top_users=True,
    )
    start, end = resolve_date_range(args)

    aggregate_report_name = "organization-1-day" if args.scope == "org" else "enterprise-1-day"
    user_report_name = "users-1-day"

    daily_summary_rows = []
    model_rows = []
    feature_rows = []
    language_model_rows = []
    user_rollup: dict[str, dict[str, float | int | str]] = {}
    json_days = []

    for day in iter_days(start, end):
        aggregate_rows = fetch_daily_report(args.scope, args.target, aggregate_report_name, day)
        user_rows = fetch_daily_report(args.scope, args.target, user_report_name, day)

        aggregate_record = aggregate_daily_entity(aggregate_rows) if aggregate_rows else {}
        cli = cli_totals(aggregate_record)
        user_day = aggregate_user_day(user_rows)
        models = aggregate_model_feature(user_rows or aggregate_rows)
        features = aggregate_feature(user_rows or aggregate_rows)
        language_models = aggregate_language_model(user_rows or aggregate_rows)

        daily_summary = {
            "day": day.isoformat(),
            "daily_active_users": int(aggregate_record.get("daily_active_users", 0) or 0),
            "daily_active_cli_users": int(aggregate_record.get("daily_active_cli_users", 0) or 0),
            "daily_active_cloud_agent_users": int(
                aggregate_record.get("daily_active_copilot_cloud_agent_users", 0) or 0
            ),
            "daily_active_code_review_users": int(
                aggregate_record.get("daily_active_copilot_code_review_users", 0) or 0
            ),
            "ai_credits_used": user_day["ai_credits_used"],
            "cli_sessions": cli["session_count"],
            "cli_requests": cli["request_count"],
            "cli_prompts": cli["prompt_count"],
            "cli_prompt_tokens": cli["prompt_tokens_sum"],
            "cli_output_tokens": cli["output_tokens_sum"],
            "cli_total_tokens": cli["total_tokens_sum"],
            "loc_added": int(aggregate_record.get("loc_added_sum", 0) or 0),
            "loc_deleted": int(aggregate_record.get("loc_deleted_sum", 0) or 0),
            "top_model": top_model_label(models, 1),
        }
        json_days.append(
            {
                "summary": daily_summary,
                "models": models,
                "features": features,
                "language_models": language_models,
            }
        )

        daily_summary_rows.append(
            [
                daily_summary["day"],
                daily_summary["daily_active_users"],
                daily_summary["daily_active_cli_users"],
                daily_summary["ai_credits_used"],
                daily_summary["cli_sessions"],
                daily_summary["cli_requests"],
                daily_summary["cli_total_tokens"],
                daily_summary["loc_added"],
                daily_summary["top_model"],
            ]
        )

        for row in models:
            model_rows.append(
                [
                    day.isoformat(),
                    row.get("model", "unknown"),
                    row.get("feature", "unknown"),
                    row.get("user_initiated_interaction_count", 0),
                    row.get("code_generation_activity_count", 0),
                    row.get("code_acceptance_activity_count", 0),
                    row.get("loc_added_sum", 0),
                ]
            )

        for row in features:
            feature_rows.append(
                [
                    day.isoformat(),
                    row.get("feature", "unknown"),
                    row.get("user_initiated_interaction_count", 0),
                    row.get("code_generation_activity_count", 0),
                    row.get("code_acceptance_activity_count", 0),
                    row.get("loc_added_sum", 0),
                ]
            )

        for row in language_models:
            language_model_rows.append(
                [
                    day.isoformat(),
                    row.get("language", "unknown"),
                    row.get("model", "unknown"),
                    row.get("user_initiated_interaction_count", 0),
                    row.get("code_generation_activity_count", 0),
                    row.get("loc_added_sum", 0),
                ]
            )

        for row in user_rows:
            login = row["user_login"]
            bucket = user_rollup.setdefault(
                login,
                {
                    "user_login": login,
                    "active_days": 0,
                    "ai_credits_used": 0.0,
                    "cli_sessions": 0,
                    "cli_requests": 0,
                    "cli_prompts": 0,
                    "cli_prompt_tokens": 0,
                    "cli_output_tokens": 0,
                    "used_chat_days": 0,
                    "used_agent_days": 0,
                    "used_cli_days": 0,
                },
            )
            bucket["active_days"] += 1
            bucket["ai_credits_used"] += float(row.get("ai_credits_used", 0) or 0)
            bucket["used_chat_days"] += 1 if row.get("used_chat") else 0
            bucket["used_agent_days"] += 1 if row.get("used_agent") else 0
            bucket["used_cli_days"] += 1 if row.get("used_cli") else 0
            cli_user = cli_totals(row)
            bucket["cli_sessions"] += cli_user["session_count"]
            bucket["cli_requests"] += cli_user["request_count"]
            bucket["cli_prompts"] += cli_user["prompt_count"]
            bucket["cli_prompt_tokens"] += cli_user["prompt_tokens_sum"]
            bucket["cli_output_tokens"] += cli_user["output_tokens_sum"]

    top_users = sorted(
        user_rollup.values(),
        key=lambda row: (
            -float(row["cli_prompt_tokens"]) - float(row["cli_output_tokens"]),
            -float(row["ai_credits_used"]),
            str(row["user_login"]),
        ),
    )[: args.top_users]

    print("== Daily summary ==")
    print(
        format_table(
            [
                "day",
                "active_users",
                "cli_users",
                "ai_credits",
                "cli_sessions",
                "cli_requests",
                "cli_total_tokens",
                "loc_added",
                "top_model",
            ],
            daily_summary_rows,
        )
    )
    print()

    print("== Model usage by day ==")
    print(
        format_table(
            [
                "day",
                "model",
                "feature",
                "prompts",
                "generated",
                "accepted",
                "loc_added",
            ],
            model_rows or [["-", "-", "-", 0, 0, 0, 0]],
        )
    )
    print()

    print("== Feature usage by day ==")
    print(
        format_table(
            [
                "day",
                "feature",
                "prompts",
                "generated",
                "accepted",
                "loc_added",
            ],
            feature_rows or [["-", "-", 0, 0, 0, 0]],
        )
    )
    print()

    print("== Language/model usage by day ==")
    print(
        format_table(
            [
                "day",
                "language",
                "model",
                "prompts",
                "generated",
                "loc_added",
            ],
            language_model_rows or [["-", "-", "-", 0, 0, 0]],
        )
    )
    print()

    print(f"== Top users ({len(top_users)}) ==")
    print(
        format_table(
            [
                "user_login",
                "active_days",
                "ai_credits",
                "cli_sessions",
                "cli_requests",
                "cli_prompt_tokens",
                "cli_output_tokens",
                "used_chat_days",
                "used_agent_days",
                "used_cli_days",
            ],
            [
                [
                    row["user_login"],
                    row["active_days"],
                    round(float(row["ai_credits_used"]), 2),
                    row["cli_sessions"],
                    row["cli_requests"],
                    row["cli_prompt_tokens"],
                    row["cli_output_tokens"],
                    row["used_chat_days"],
                    row["used_agent_days"],
                    row["used_cli_days"],
                ]
                for row in top_users
            ]
            or [["-", 0, 0, 0, 0, 0, 0, 0, 0, 0]],
        )
    )

    if args.json_out:
        write_json_report(
            args.json_out,
            {
                "scope": args.scope,
                "target": args.target,
                "start_date": start.isoformat(),
                "end_date": end.isoformat(),
                "daily_reports": json_days,
                "top_users": top_users,
            },
        )


if __name__ == "__main__":
    main()
