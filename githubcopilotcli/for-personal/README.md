# Personal local Copilot CLI report

This script reads local Copilot CLI session files instead of GitHub organization metrics.

```bash
python3 for-personal/copilot_usage_local.py --days 14
python3 for-personal/copilot_usage_local.py --days 14 --markdown-out personal-report.md
python3 for-personal/copilot_usage_local.py --start-date 2026-06-01 --end-date 2026-06-30 --json-out personal-report.json
```

It scans `~/.copilot/session-state/*/events.jsonl` and reports:

* daily sessions
* premium requests
* model usage
* input/output/cache-read tokens
* top sessions by token volume
* a Markdown report file saved by default in the current directory

Notes:

* it only covers **local Copilot CLI usage on this machine**
* it does **not** cover IDE Copilot usage or GitHub.com Copilot activity
* in-progress sessions are excluded until a `session.shutdown` event is written
* default Markdown filename format: `copilot-usage-local-YYYY-MM-DD-to-YYYY-MM-DD.md`
