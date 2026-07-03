#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createReadStream, existsSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, resolve } from "node:path";
import { createInterface } from "node:readline";

const FIELDS = ["input_tokens", "cached_input_tokens", "output_tokens", "reasoning_output_tokens", "total_tokens"];

function help(code = 0) {
  process.stdout.write(`Usage: node generate-codex-detailed-usage-report.mjs [options]\n\nOptions:\n  --start YYYY-MM-DD   Include activity on or after this local date\n  --end YYYY-MM-DD     Include activity on or before this local date\n  --db PATH            Database (default: ~/.codex/state_5.sqlite)\n  --output PATH        Output (default: ./codex-detailed-usage-report.md)\n  --top NUMBER         Top dates, projects, and threads to show (default: 20)\n  --help               Show help\n`);
  process.exit(code);
}

function args(argv) {
  const result = {
    db: resolve(homedir(), ".codex/state_5.sqlite"),
    output: resolve("codex-detailed-usage-report.md"),
    top: 20,
    sensitiveOnly: false,
    outputSpecified: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (key === "--help" || key === "-h") help();
    if (key === "--sensitive-only") {
      result.sensitiveOnly = true;
      continue;
    }
    const value = argv[++i];
    if (!value) throw new Error(`Missing value for ${key}`);
    if (key === "--start") result.start = value;
    else if (key === "--end") result.end = value;
    else if (key === "--db") result.db = resolve(value);
    else if (key === "--output") {
      result.output = resolve(value);
      result.outputSpecified = true;
    }
    else if (key === "--top") result.top = Number(value);
    else throw new Error(`Unknown option: ${key}`);
  }
  for (const key of ["start", "end"]) {
    if (result[key] && !/^\d{4}-\d{2}-\d{2}$/.test(result[key])) throw new Error(`--${key} must be YYYY-MM-DD`);
  }
  if (result.start && result.end && result.start > result.end) throw new Error("--start must not be later than --end");
  if (!Number.isInteger(result.top) || result.top < 1 || result.top > 1000) throw new Error("--top must be from 1 to 1000");
  if (result.sensitiveOnly && !result.outputSpecified) result.output = resolve("codex-sensitive-usage-report.md");
  return result;
}

function sql(db, statement) {
  const text = execFileSync("sqlite3", ["-readonly", "-json", db, statement], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
  return text ? JSON.parse(text) : [];
}

function localDate(timestamp) {
  const date = new Date(timestamp);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function emptyUsage() {
  return Object.fromEntries(FIELDS.map((field) => [field, 0]));
}

function add(target, usage) {
  for (const field of FIELDS) target[field] += Number(usage[field] ?? 0);
}

function increment(current, previous) {
  const delta = emptyUsage();
  for (const field of FIELDS) {
    const now = Number(current[field] ?? 0);
    const before = Number(previous[field] ?? 0);
    delta[field] = now >= before ? now - before : now;
  }
  return delta;
}

function bucket(map, key) {
  if (!map.has(key)) map.set(key, emptyUsage());
  return map.get(key);
}

async function scanThread(thread, options, aggregates) {
  if (!thread.rollout_path || !existsSync(thread.rollout_path)) {
    aggregates.missingRollouts += 1;
    return;
  }
  let model = thread.model || "Unknown";
  let previous = emptyUsage();
  let foundCounters = false;
  const threadUsage = emptyUsage();
  const input = createInterface({ input: createReadStream(thread.rollout_path), crlfDelay: Infinity });

  for await (const line of input) {
    let event;
    try { event = JSON.parse(line); } catch { continue; }
    if (event.type === "turn_context" && event.payload?.model) model = event.payload.model;
    if (event.type !== "event_msg" || event.payload?.type !== "token_count") continue;
    const current = event.payload.info?.total_token_usage;
    if (!current || !event.timestamp) continue;
    foundCounters = true;
    const delta = increment(current, previous);
    previous = current;
    const date = localDate(event.timestamp);
    if ((options.start && date < options.start) || (options.end && date > options.end)) continue;
    add(aggregates.total, delta);
    add(bucket(aggregates.days, date), delta);
    add(bucket(aggregates.months, date.slice(0, 7)), delta);
    add(bucket(aggregates.models, model), delta);
    add(threadUsage, delta);
  }

  if (!foundCounters) aggregates.missingCounters += 1;
  if (threadUsage.total_tokens > 0) {
    add(bucket(aggregates.projects, thread.cwd || "Unknown"), threadUsage);
    add(bucket(aggregates.reasoning, thread.reasoning_effort || "Unspecified"), threadUsage);
    aggregates.threads.push({ ...thread, usage: threadUsage });
  }
}

const nf = new Intl.NumberFormat("en-US");
const n = (value) => nf.format(Math.round(value ?? 0));
const pct = (part, total) => total ? `${(100 * part / total).toFixed(2)}%` : "0.00%";
const cell = (value) => String(value ?? "").replaceAll("|", "\\|").replaceAll("\n", " ");
function table(headers, rows) {
  return [headers, headers.map((_, i) => i ? "---:" : "---"), ...rows]
    .map((row) => `| ${row.map(cell).join(" | ")} |`).join("\n");
}
function sorted(map) {
  return [...map].map(([name, usage]) => ({ name, ...usage })).sort((a, b) => b.total_tokens - a.total_tokens);
}
function usageRows(items) {
  return items.map((x) => [x.name, n(x.total_tokens), n(x.input_tokens), n(x.cached_input_tokens), n(x.output_tokens), n(x.reasoning_output_tokens)]);
}

async function main() {
  const options = args(process.argv.slice(2));
  if (!existsSync(options.db)) throw new Error(`Database not found: ${options.db}`);
  const threads = sql(options.db, `SELECT id, rollout_path, created_at, updated_at, model, reasoning_effort, cwd, title, tokens_used FROM threads WHERE tokens_used > 0 ORDER BY created_at;`);
  const a = { total: emptyUsage(), days: new Map(), months: new Map(), models: new Map(), projects: new Map(), reasoning: new Map(), threads: [], missingRollouts: 0, missingCounters: 0 };
  for (const thread of threads) await scanThread(thread, options, a);
  if (!a.total.total_tokens) throw new Error("No detailed token activity found for the selected period");

  const dates = sorted(a.days);
  const months = [...a.months].map(([name, usage]) => ({ name, ...usage })).sort((x, y) => x.name.localeCompare(y.name));
  const models = sorted(a.models);
  const projects = sorted(a.projects).slice(0, options.top);
  const reasoning = sorted(a.reasoning);
  const topThreads = a.threads.sort((x, y) => y.usage.total_tokens - x.usage.total_tokens).slice(0, options.top);
  const period = `${options.start ?? dates.map((x) => x.name).sort()[0]} through ${options.end ?? dates.map((x) => x.name).sort().at(-1)}`;
  const generated = new Date().toLocaleString("sv-SE", { timeZoneName: "short" });
  const headers = ["Name", "Total", "Input", "Cached input", "Output", "Reasoning"];

  const standardReport = `# Detailed Codex token usage report

Generated: ${generated}  
Activity period: ${period}  
Source: token counter events in local Codex session rollouts, indexed by \`${options.db}\`

## Summary

- Total tokens: **${n(a.total.total_tokens)}**
- Input tokens: **${n(a.total.input_tokens)}**
- Cached input tokens: **${n(a.total.cached_input_tokens)}** (${pct(a.total.cached_input_tokens, a.total.input_tokens)} of input)
- Output tokens: **${n(a.total.output_tokens)}**
- Reasoning output tokens: **${n(a.total.reasoning_output_tokens)}** (${pct(a.total.reasoning_output_tokens, a.total.output_tokens)} of output)
- Threads with activity in period: **${n(a.threads.length)}**
- Most active date: **${dates[0].name}** (${n(dates[0].total_tokens)} tokens)
- Most-used model: **${models[0].name}** (${n(models[0].total_tokens)} tokens, ${pct(models[0].total_tokens, a.total.total_tokens)})

Cached input is a subset of input and must not be added to total tokens. Reasoning output is a subset of output.

## By model

${table(headers, usageRows(models))}

## By month

${table(headers, usageRows(months))}

## Highest-usage dates

${table(headers, usageRows(dates.slice(0, options.top)))}

## By reasoning effort

${table(headers, usageRows(reasoning))}

## Data quality and interpretation

This report calculates deltas between cumulative token-counter events, so its daily tables represent activity dates rather than thread creation dates. Date boundaries use the machine's local timezone. Threads with no readable rollout: **${a.missingRollouts}**. Readable rollouts with no detailed counters: **${a.missingCounters}**.

These are local Codex counters, not invoice data. Price estimation requires the applicable model prices and billing treatment for input, cached input, and output. Project paths and thread titles are intentionally excluded; use the separate sensitive report when those details are required.
`;
  const sensitiveReport = `# Sensitive Codex usage report

Generated: ${generated}  
Activity period: ${period}  
Source: local Codex session rollouts and \`${options.db}\`

> **Sensitive:** This report contains project paths and thread titles. Do not share it without review.

## Summary

- Total tokens represented: **${n(a.total.total_tokens)}**
- Threads with activity in period: **${n(a.threads.length)}**

## Top project directories

${table(headers, usageRows(projects))}

## Top threads

${table(["Title", "Model", "Project", "Total", "Input", "Cached", "Output", "Reasoning"], topThreads.map((x) => [x.title || x.id, x.model || "Unknown", basename(x.cwd || "Unknown"), n(x.usage.total_tokens), n(x.usage.input_tokens), n(x.usage.cached_input_tokens), n(x.usage.output_tokens), n(x.usage.reasoning_output_tokens)]))}

## Data quality

Date boundaries use the machine's local timezone. Threads with no readable rollout: **${a.missingRollouts}**. Readable rollouts with no detailed counters: **${a.missingCounters}**.
`;
  const report = options.sensitiveOnly ? sensitiveReport : standardReport;
  writeFileSync(options.output, report, "utf8");
  process.stdout.write(`Wrote ${options.output}\n`);
}

main().catch((error) => {
  process.stderr.write(`Error: ${error.message}\n`);
  process.exit(1);
});
