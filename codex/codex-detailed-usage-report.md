# Detailed Codex token usage report

Generated: 2026-07-04 7:54:05 GMT+9  
Activity period: 2026-01-09 through 2026-07-04  
Source: token counter events in local Codex session rollouts, indexed by `/home/dgkim/.codex/state_5.sqlite`

## Summary

- Total tokens: **222,585,293**
- Input tokens: **221,374,590**
- Cached input tokens: **210,561,280** (95.12% of input)
- Output tokens: **1,210,703**
- Reasoning output tokens: **292,907** (24.19% of output)
- Threads with activity in period: **72**
- Most active date: **2026-05-31** (52,367,884 tokens)
- Most-used model: **gpt-5.5** (194,921,281 tokens, 87.57%)

Cached input is a subset of input and must not be added to total tokens. Reasoning output is a subset of output.

## By model

| Name | Total | Input | Cached input | Output | Reasoning |
| --- | ---: | ---: | ---: | ---: | ---: |
| gpt-5.5 | 194,921,281 | 194,049,024 | 186,912,768 | 872,257 | 234,987 |
| gpt-5.4 | 25,709,207 | 25,415,297 | 21,948,160 | 293,910 | 47,703 |
| gpt-5.2-codex | 1,106,269 | 1,083,836 | 1,007,488 | 22,433 | 5,780 |
| gpt-5.3-codex | 848,536 | 826,433 | 692,864 | 22,103 | 4,437 |

## By month

| Name | Total | Input | Cached input | Output | Reasoning |
| --- | ---: | ---: | ---: | ---: | ---: |
| 2026-01 | 1,018,602 | 997,479 | 931,840 | 21,123 | 5,440 |
| 2026-02 | 87,667 | 86,357 | 75,648 | 1,310 | 340 |
| 2026-03 | 4,870,592 | 4,785,658 | 4,236,416 | 84,934 | 16,480 |
| 2026-04 | 7,054,063 | 6,978,397 | 5,451,008 | 75,666 | 10,463 |
| 2026-05 | 67,000,972 | 66,563,674 | 62,489,856 | 437,298 | 75,956 |
| 2026-06 | 141,881,235 | 141,304,013 | 136,761,344 | 577,222 | 181,934 |
| 2026-07 | 672,162 | 659,012 | 615,168 | 13,150 | 2,294 |

## Highest-usage dates

| Name | Total | Input | Cached input | Output | Reasoning |
| --- | ---: | ---: | ---: | ---: | ---: |
| 2026-05-31 | 52,367,884 | 52,085,999 | 49,536,256 | 281,885 | 50,759 |
| 2026-06-27 | 49,845,292 | 49,684,643 | 48,534,656 | 160,649 | 61,766 |
| 2026-06-28 | 42,592,436 | 42,495,332 | 41,820,672 | 97,104 | 42,277 |
| 2026-06-03 | 23,216,500 | 23,102,197 | 22,247,680 | 114,303 | 22,206 |
| 2026-06-29 | 11,603,430 | 11,533,810 | 11,127,552 | 69,620 | 27,935 |
| 2026-04-01 | 6,870,133 | 6,799,785 | 5,302,528 | 70,348 | 9,912 |
| 2026-05-24 | 6,745,684 | 6,670,866 | 6,072,576 | 74,818 | 10,591 |
| 2026-05-25 | 6,139,732 | 6,088,288 | 5,551,744 | 51,444 | 8,257 |
| 2026-06-21 | 4,568,630 | 4,531,158 | 4,161,280 | 37,472 | 8,425 |
| 2026-06-25 | 4,029,165 | 3,993,434 | 3,730,432 | 35,731 | 5,457 |
| 2026-06-01 | 2,879,632 | 2,854,421 | 2,660,096 | 25,211 | 6,468 |
| 2026-03-29 | 1,625,111 | 1,598,584 | 1,469,184 | 26,527 | 6,362 |
| 2026-03-21 | 1,554,371 | 1,534,728 | 1,432,448 | 19,643 | 2,926 |
| 2026-06-14 | 1,374,960 | 1,358,259 | 1,115,904 | 16,701 | 2,937 |
| 2026-06-06 | 1,289,466 | 1,274,032 | 953,728 | 15,434 | 2,951 |
| 2026-05-05 | 945,666 | 931,010 | 722,432 | 14,656 | 4,276 |
| 2026-01-11 | 941,847 | 927,165 | 875,520 | 14,682 | 2,752 |
| 2026-03-03 | 848,536 | 826,433 | 692,864 | 22,103 | 4,437 |
| 2026-07-04 | 672,162 | 659,012 | 615,168 | 13,150 | 2,294 |
| 2026-05-27 | 602,565 | 590,539 | 444,416 | 12,026 | 1,900 |

## By reasoning effort

| Name | Total | Input | Cached input | Output | Reasoning |
| --- | ---: | ---: | ---: | ---: | ---: |
| medium | 208,517,450 | 207,503,552 | 199,063,552 | 1,013,898 | 256,157 |
| Unspecified | 14,067,843 | 13,871,038 | 11,497,728 | 196,805 | 36,750 |

## Data quality and interpretation

This report calculates deltas between cumulative token-counter events, so its daily tables represent activity dates rather than thread creation dates. Date boundaries use the machine's local timezone. Threads with no readable rollout: **0**. Readable rollouts with no detailed counters: **0**.

These are local Codex counters, not invoice data. Price estimation requires the applicable model prices and billing treatment for input, cached input, and output. Project paths and thread titles are intentionally excluded; use the separate sensitive report when those details are required.
