# Copilot usage report scripts

This repository has two report sources:

1. `for-organization/` for organization or enterprise reports from the official Copilot usage metrics API
2. `for-personal/` for personal reports built from local Copilot CLI session files on this machine

The organization reports require GitHub Copilot usage metrics access.

The personal report reads `~/.copilot/session-state/*/events.jsonl`, summarizes completed local Copilot CLI sessions, and saves a Markdown report by default.
