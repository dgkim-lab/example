#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";

function usage(exitCode = 0) {
  const stream = exitCode === 0 ? process.stdout : process.stderr;
  stream.write(`Usage: node generate-codex-usage-report.mjs [options]\n\nOptions:\n  --start YYYY-MM-DD   Include threads created on or after this date\n  --end YYYY-MM-DD     Include threads created on or before this date\n  --db PATH            Codex state database (default: ~/.codex/state_5.sqlite)\n  --output PATH        Markdown output (default: ./codex-usage-report.md)\n  --top-days NUMBER    Number of highest-usage dates to show (default: 10)\n  --help               Show this help\n\nExamples:\n  node generate-codex-usage-report.mjs\n  node generate-codex-usage-report.mjs --start 2026-06-01 --end 2026-06-30\n  node generate-codex-usage-report.mjs --output reports/codex-usage.md\n`);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const options = {
    db: resolve(homedir(), ".codex/state_5.sqlite"),
    output: resolve("codex-usage-report.md"),
    topDays: 10,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") usage();
    const value = argv[i + 1];
    if (["--start", "--end", "--db", "--output", "--top-days"].includes(arg)) {
      if (!value) throw new Error(`Missing value for ${arg}`);
      i += 1;
    }
    if (arg === "--start") options.start = value;
    else if (arg === "--end") options.end = value;
    else if (arg === "--db") options.db = resolve(value);
    else if (arg === "--output") options.output = resolve(value);
    else if (arg === "--top-days") options.topDays = Number(value);
    else if (arg !== "--help" && arg !== "-h") throw new Error(`Unknown option: ${arg}`);
  }

  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  for (const key of ["start", "end"]) {
    if (options[key] && !datePattern.test(options[key])) {
      throw new Error(`--${key} must use YYYY-MM-DD format`);
    }
  }
  if (options.start && options.end && options.start > options.end) {
    throw new Error("--start must not be later than --end");
  }
  if (!Number.isInteger(options.topDays) || options.topDays < 1 || options.topDays > 1000) {
    throw new Error("--top-days must be an integer from 1 to 1000");
  }
  return options;
}

function query(db, sql) {
  const output = execFileSync("sqlite3", ["-readonly", "-json", db, sql], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
  return output ? JSON.parse(output) : [];
}

function number(value) {
  return new Intl.NumberFormat("en-US").format(value ?? 0);
}

function percent(value) {
  return `${Number(value ?? 0).toFixed(2)}%`;
}

function escapeCell(value) {
  return String(value ?? "").replaceAll("|", "\\|").replaceAll("\n", " ");
}

function table(headers, rows) {
  const alignment = headers.map((_, index) => (index === 0 ? "---" : "---:"));
  return [headers, alignment, ...rows]
    .map((row) => `| ${row.map(escapeCell).join(" | ")} |`)
    .join("\n");
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!existsSync(options.db)) throw new Error(`Database not found: ${options.db}`);

  const filters = ["tokens_used > 0"];
  if (options.start) filters.push(`date(created_at, 'unixepoch', 'localtime') >= '${options.start}'`);
  if (options.end) filters.push(`date(created_at, 'unixepoch', 'localtime') <= '${options.end}'`);
  const where = filters.join(" AND ");

  const [summary] = query(options.db, `
    SELECT COUNT(*) AS threads,
           SUM(tokens_used) AS tokens,
           MIN(date(created_at, 'unixepoch', 'localtime')) AS first_date,
           MAX(date(updated_at, 'unixepoch', 'localtime')) AS last_date
    FROM threads WHERE ${where};
  `);
  if (!summary?.threads) throw new Error("No token usage found for the selected period");

  const models = query(options.db, `
    SELECT COALESCE(model, 'Unknown / older metadata') AS model,
           COUNT(*) AS threads,
           SUM(tokens_used) AS tokens,
           100.0 * SUM(tokens_used) / (SELECT SUM(tokens_used) FROM threads WHERE ${where}) AS share
    FROM threads WHERE ${where}
    GROUP BY model ORDER BY tokens DESC;
  `);
  const months = query(options.db, `
    SELECT strftime('%Y-%m', created_at, 'unixepoch', 'localtime') AS month,
           COUNT(*) AS threads, SUM(tokens_used) AS tokens
    FROM threads WHERE ${where}
    GROUP BY month ORDER BY month;
  `);
  const days = query(options.db, `
    SELECT date(created_at, 'unixepoch', 'localtime') AS date,
           COUNT(*) AS threads, SUM(tokens_used) AS tokens
    FROM threads WHERE ${where}
    GROUP BY date ORDER BY tokens DESC LIMIT ${options.topDays};
  `);

  const topModel = models[0];
  const topDay = days[0];
  const topMonth = [...months].sort((a, b) => b.tokens - a.tokens)[0];
  const requestedPeriod = options.start || options.end
    ? `${options.start ?? "earliest"} through ${options.end ?? "latest"}`
    : `${summary.first_date} through ${summary.last_date}`;
  const generated = new Date().toLocaleString("sv-SE", { timeZoneName: "short" });

  const markdown = `# Codex token usage report

Generated: ${generated}  
Period: ${requestedPeriod}  
Source: local Codex thread metadata (\`${options.db}\`)

## Summary

- Total recorded tokens: **${number(summary.tokens)}**
- Threads with recorded usage: **${number(summary.threads)}**
- Most-used model: **${topModel.model}** — ${number(topModel.tokens)} tokens (${percent(topModel.share)})
- Highest attributed date: **${topDay.date}** — ${number(topDay.tokens)} tokens across ${number(topDay.threads)} threads
- Highest attributed month: **${topMonth.month}** — ${number(topMonth.tokens)} tokens across ${number(topMonth.threads)} threads

## Usage by model

${table(["Model", "Threads", "Tokens", "Share"], models.map((row) => [row.model, number(row.threads), number(row.tokens), percent(row.share)]))}

## Usage by month

${table(["Month", "Threads", "Tokens"], months.map((row) => [row.month, number(row.threads), number(row.tokens)]))}

## Highest-usage dates

${table(["Rank", "Date", "Threads", "Tokens"], days.map((row, index) => [index + 1, row.date, number(row.threads), number(row.tokens)]))}

## Interpretation and limitations

\`tokens_used\` is Codex's recorded aggregate token counter. It may include input, cached input, output, and reasoning tokens; it should not be treated as an invoice or converted directly to cost without detailed API usage categories and applicable pricing.

The local summary stores a lifetime token total per thread. Date filters and date/month tables therefore attribute all tokens from a thread to that thread's creation date. Long-running threads can make a creation date appear larger than the tokens actually consumed on that calendar day. Model totals use each thread's recorded model; threads with missing older metadata are listed as unknown.
`;

  writeFileSync(options.output, markdown, "utf8");
  process.stdout.write(`Wrote ${options.output}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`Error: ${error.message}\n`);
  process.exit(1);
}
