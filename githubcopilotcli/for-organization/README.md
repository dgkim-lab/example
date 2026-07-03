# Copilot usage report scripts

Two scripts are included:

1. `copilot_usage_simple.py` prints a compact daily table.
2. `copilot_usage_detailed.py` adds model, feature, language, and user breakdowns.

Both scripts use the GitHub Copilot usage metrics API through `gh api`, then download the signed NDJSON report files returned by that API.

## Requirements

1. `gh` must be installed and authenticated.
2. Your token must have access to Copilot usage metrics for the target organization or enterprise.
3. The Copilot usage metrics feature must be enabled in GitHub for that scope.

## Simple report

```bash
python3 for-organization/copilot_usage_simple.py --scope org --target YOUR_ORG --days 7
python3 for-organization/copilot_usage_simple.py --scope enterprise --target YOUR_ENTERPRISE --start-date 2026-06-01 --end-date 2026-06-30
```

Output columns:

* `prompt_tokens`, `output_tokens`, `total_tokens`: daily Copilot **CLI** token usage
* `top_models`: top chat models used that day, based on Copilot usage metrics breakdowns

## Detailed report

```bash
python3 for-organization/copilot_usage_detailed.py --scope org --target YOUR_ORG --days 14
python3 for-organization/copilot_usage_detailed.py --scope org --target YOUR_ORG --days 14 --json-out report.json
```

The detailed script prints:

* daily summaries
* model usage by day
* feature usage by day
* language/model usage by day
* top users across the selected window

## Notes

* GitHub documents that Copilot usage metrics are usually available within two full UTC days, so the default window ends at `UTC today - 2 days`.
* Daily token usage is available for **Copilot CLI** through `totals_by_cli.token_usage`.
* Model usage comes from the usage metrics model breakdowns for chat and IDE activity. GitHub does not expose a CLI token-by-model breakdown in these reports.
