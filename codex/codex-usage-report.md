# Codex token usage report

Generated: 2026-07-04 7:45:35 GMT+9  
Period: 2026-01-09 through 2026-07-04  
Source: local Codex thread metadata (`/home/dgkim/.codex/state_5.sqlite`)

## Summary

- Total recorded tokens: **222,276,296**
- Threads with recorded usage: **72**
- Most-used model: **gpt-5.5** — 194,612,284 tokens (87.55%)
- Highest attributed date: **2026-06-27** — 92,437,728 tokens across 4 threads
- Highest attributed month: **2026-06** — 141,881,235 tokens across 30 threads

## Usage by model

| Model | Threads | Tokens | Share |
| --- | ---: | ---: | ---: |
| gpt-5.5 | 43 | 194,612,284 | 87.55% |
| gpt-5.4 | 20 | 25,013,802 | 11.25% |
| Unknown / older metadata | 9 | 2,650,210 | 1.19% |

## Usage by month

| Month | Threads | Tokens |
| --- | ---: | ---: |
| 2026-01 | 3 | 1,018,602 |
| 2026-02 | 1 | 87,667 |
| 2026-03 | 8 | 4,870,592 |
| 2026-04 | 3 | 7,054,063 |
| 2026-05 | 26 | 67,000,972 |
| 2026-06 | 30 | 141,881,235 |
| 2026-07 | 1 | 363,165 |

## Highest-usage dates

| Rank | Date | Threads | Tokens |
| --- | ---: | ---: | ---: |
| 1 | 2026-06-27 | 4 | 92,437,728 |
| 2 | 2026-05-31 | 12 | 52,367,884 |
| 3 | 2026-06-03 | 4 | 23,216,500 |
| 4 | 2026-06-29 | 6 | 11,603,430 |
| 5 | 2026-04-01 | 1 | 6,870,133 |
| 6 | 2026-05-24 | 5 | 6,745,684 |
| 7 | 2026-05-25 | 4 | 6,139,732 |
| 8 | 2026-06-21 | 9 | 4,568,630 |
| 9 | 2026-06-25 | 1 | 4,029,165 |
| 10 | 2026-06-01 | 1 | 2,879,632 |

## Interpretation and limitations

`tokens_used` is Codex's recorded aggregate token counter. It may include input, cached input, output, and reasoning tokens; it should not be treated as an invoice or converted directly to cost without detailed API usage categories and applicable pricing.

The local summary stores a lifetime token total per thread. Date filters and date/month tables therefore attribute all tokens from a thread to that thread's creation date. Long-running threads can make a creation date appear larger than the tokens actually consumed on that calendar day. Model totals use each thread's recorded model; threads with missing older metadata are listed as unknown.
