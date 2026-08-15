#!/usr/bin/env node

const fs = require("fs/promises");
const path = require("path");
const { loadDotEnv } = require("./lib/env");

const OPENAI_API_BASE = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-5-mini";

function parseArgs(argv) {
  const args = {
    inputPath: "youtube_videos.json",
    outputBase: "youtube-report",
    model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
  };

  const positional = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--model" || arg === "-m") {
      args.model = argv[i + 1];
      i += 1;
    } else if (arg.startsWith("--model=")) {
      args.model = arg.slice("--model=".length);
    } else {
      positional.push(arg);
    }
  }

  if (positional[0]) args.inputPath = positional[0];
  if (positional[1]) args.outputBase = positional[1];
  return args;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function parseViewCount(text) {
  if (!text) return 0;

  const normalized = String(text)
    .replace(/\u00a0/g, " ")
    .replace(/,/g, "")
    .replace(/views?/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  const koreanMatch = normalized.match(/([0-9]*\.?[0-9]+)\s*(천|만|억)/);
  if (koreanMatch) {
    const value = Number(koreanMatch[1]);
    const unit = koreanMatch[2];
    const multiplier = unit === "천" ? 1e3 : unit === "만" ? 1e4 : 1e8;
    return Math.round(value * multiplier);
  }

  const compactMatch = normalized.match(/([0-9]*\.?[0-9]+)\s*([KMB])/i);
  if (compactMatch) {
    const value = Number(compactMatch[1]);
    const unit = compactMatch[2].toUpperCase();
    const multiplier = unit === "K" ? 1e3 : unit === "M" ? 1e6 : 1e9;
    return Math.round(value * multiplier);
  }

  const rawNumberMatch = normalized.match(/[0-9]+(?:\.[0-9]+)?/);
  return rawNumberMatch ? Math.round(Number(rawNumberMatch[0])) : 0;
}

function looksLikeDuration(value) {
  return /^\d{1,2}:\d{2}(?::\d{2})?$/.test(String(value || "").trim());
}

function getVideoIdFromUrl(url) {
  if (!url) return "";
  try {
    const u = new URL(url);
    if (u.pathname === "/watch") return u.searchParams.get("v") || "";
    const shorts = u.pathname.match(/^\/shorts\/([^/?]+)/);
    return shorts ? shorts[1] : "";
  } catch {
    return "";
  }
}

function normalizeTitle(title) {
  return String(title || "")
    .replace(/^Watched\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeRow(row) {
  const subtitle = Array.isArray(row.subtitles) ? row.subtitles[0] : null;
  const url = row.url || row.titleUrl || "";
  const watchedAt = row.watchedAt || row.time || row.collectedAt || "";

  return {
    ...row,
    title: normalizeTitle(row.title),
    url,
    videoId: row.videoId || getVideoIdFromUrl(url),
    type: row.type || (String(url).includes("/shorts/") ? "shorts" : "video"),
    channelName: row.channelName || subtitle?.name || "",
    channelUrl: row.channelUrl || subtitle?.url || "",
    watchedAt,
    collectedAt: row.collectedAt || watchedAt,
  };
}

function detectInputKind(rows) {
  return rows.some((row) => row.titleUrl || row.time || row.activityControls)
    ? "google-takeout-watch-history"
    : "youtube-export";
}

function compactRows(rows) {
  const inputKind = detectInputKind(rows);
  const normalizedRows = rows.map(normalizeRow);
  const byChannel = new Map();
  const videoIds = new Set();
  const collectedAt = [];
  const watchedAt = [];
  const quality = {
    missingChannelName: 0,
    missingChannelUrl: 0,
    missingChannelLogoUrl: 0,
    missingTitle: 0,
    durationLikeTitle: 0,
    missingViewCountText: 0,
    missingPublishedText: 0,
  };
  const typeCounts = {};

  for (const row of normalizedRows) {
    const channelName = String(row.channelName || "Unknown").trim() || "Unknown";
    const viewCount = parseViewCount(row.viewCountText);
    const type = String(row.type || "unknown").trim() || "unknown";
    const title = String(row.title || "").trim();

    if (!row.channelName) quality.missingChannelName += 1;
    if (!row.channelUrl) quality.missingChannelUrl += 1;
    if (!row.channelLogoUrl) quality.missingChannelLogoUrl += 1;
    if (!title) quality.missingTitle += 1;
    if (looksLikeDuration(title)) quality.durationLikeTitle += 1;
    if (!row.viewCountText) quality.missingViewCountText += 1;
    if (!row.publishedText) quality.missingPublishedText += 1;
    if (row.videoId) videoIds.add(row.videoId);
    if (row.collectedAt) collectedAt.push(row.collectedAt);
    if (row.watchedAt) watchedAt.push(row.watchedAt);
    typeCounts[type] = (typeCounts[type] || 0) + 1;

    if (!byChannel.has(channelName)) {
      byChannel.set(channelName, {
        channelName,
        videos: 0,
        totalParsedViews: 0,
        videoCountByType: {},
        hasChannelUrl: Boolean(row.channelUrl),
        hasChannelLogoUrl: Boolean(row.channelLogoUrl),
        sampleTitles: [],
      });
    }

    const entry = byChannel.get(channelName);
    entry.videos += 1;
    entry.totalParsedViews += viewCount;
    entry.videoCountByType[type] = (entry.videoCountByType[type] || 0) + 1;
    entry.hasChannelUrl = entry.hasChannelUrl || Boolean(row.channelUrl);
    entry.hasChannelLogoUrl = entry.hasChannelLogoUrl || Boolean(row.channelLogoUrl);
    if (title && !looksLikeDuration(title) && entry.sampleTitles.length < 5) {
      entry.sampleTitles.push(title);
    }
  }

  const channels = [...byChannel.values()]
    .filter((channel) => channel.channelName !== "Unknown")
    .sort((a, b) => b.videos - a.videos || b.totalParsedViews - a.totalParsedViews);

  return {
    inputKind,
    generatedAt: new Date().toISOString(),
    rows: normalizedRows.length,
    uniqueVideos: videoIds.size,
    duplicateVideoRows: Math.max(normalizedRows.length - videoIds.size, 0),
    uniqueChannels: channels.length,
    collectedAtRange: {
      earliest: collectedAt.sort()[0] || "",
      latest: collectedAt.sort().at(-1) || "",
    },
    watchedAtRange: {
      earliest: watchedAt.sort()[0] || "",
      latest: watchedAt.sort().at(-1) || "",
    },
    typeCounts,
    dataQuality: quality,
    topChannelsByVideos: channels.slice(0, 50),
    topChannelsByParsedViews: [...channels]
      .sort((a, b) => b.totalParsedViews - a.totalParsedViews || b.videos - a.videos)
      .slice(0, 30),
    channelsMissingLogo: channels
      .filter((channel) => !channel.hasChannelLogoUrl)
      .slice(0, 40)
      .map((channel) => ({ channelName: channel.channelName, videos: channel.videos })),
  };
}

function extractResponseText(response) {
  if (response.output_text) {
    return response.output_text;
  }

  const chunks = [];
  for (const item of response.output || []) {
    for (const content of item.content || []) {
      if (content.text) {
        chunks.push(content.text);
      }
    }
  }
  return chunks.join("\n").trim();
}

async function createReport({ apiKey, model, analysisInput }) {
  const response = await fetch(`${OPENAI_API_BASE}/responses`, {
    method: "POST",
    headers: {
      "authorization": `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content: [
            "당신은 유튜브 시청 기록을 해석하는 소비자 인사이트 분석가입니다.",
            "제공된 JSON 요약만 근거로 삼고, 제작자 성과 분석처럼 쓰지 마세요.",
            "반드시 한국어로, 짧고 단정적인 Markdown 리포트를 작성하세요.",
          ].join(" "),
        },
        {
          role: "user",
          content: [
            "이 데이터는 채널 운영자/제작자 데이터가 아니라 한 사용자의 유튜브 소비 목록입니다.",
            "소비자 관점에서 이 사람이 어떤 콘텐츠에 끌리는지 분석하세요.",
            "예: 먹방에 집착한다, 테크 뉴스/리뷰를 자주 본다, 긴 영상 위주다, 쇼츠 비중이 높다 같은 식의 취향/습관 추론.",
            "inputKind가 google-takeout-watch-history이면 time/watchedAtRange는 실제 시청 시각이고, 조회수/게시일/영상 길이 부재는 취향 분석의 핵심 결함처럼 과장하지 마세요.",
            "watchProgressPercent는 YouTube가 진행 막대를 표시한 일부 영상에만 있는 선택 필드이므로, 비어 있어도 미시청으로 해석하지 마세요.",
            "리포트는 HTML 한 화면에 들어갈 정도로 매우 간결해야 합니다.",
            "형식:",
            "# 유튜브 소비 성향 요약",
            "## 한줄 결론",
            "한 문장만 작성",
            "## 주요 성향",
            "불릿 4개 이하",
            "## 주의할 점",
            "데이터 품질 caveat 2개 이하",
            "전체 450자 이내. 표는 쓰지 마세요.",
            "",
            JSON.stringify(analysisInput, null, 2),
          ].join("\n"),
        },
      ],
    }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error?.message || `OpenAI API HTTP ${response.status}`);
  }

  const report = extractResponseText(body);
  if (!report) {
    throw new Error("OpenAI API returned an empty report.");
  }
  return report;
}

function renderInline(markdown) {
  return escapeHtml(markdown)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

function renderMarkdown(markdown) {
  const lines = markdown.split(/\r?\n/);
  const html = [];
  let paragraph = [];
  let list = null;

  function flushParagraph() {
    if (paragraph.length) {
      html.push(`<p>${renderInline(paragraph.join(" "))}</p>`);
      paragraph = [];
    }
  }

  function closeList() {
    if (list) {
      html.push(`</${list}>`);
      list = null;
    }
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      closeList();
      continue;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      closeList();
      html.push(`<h${heading[1].length}>${renderInline(heading[2])}</h${heading[1].length}>`);
      continue;
    }

    const bullet = trimmed.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      flushParagraph();
      if (list !== "ul") {
        closeList();
        list = "ul";
        html.push("<ul>");
      }
      html.push(`<li>${renderInline(bullet[1])}</li>`);
      continue;
    }

    const numbered = trimmed.match(/^\d+\.\s+(.+)$/);
    if (numbered) {
      flushParagraph();
      if (list !== "ol") {
        closeList();
        list = "ol";
        html.push("<ol>");
      }
      html.push(`<li>${renderInline(numbered[1])}</li>`);
      continue;
    }

    closeList();
    paragraph.push(trimmed);
  }

  flushParagraph();
  closeList();
  return html.join("\n");
}

function buildHtml(markdown, sourceFile, model) {
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>YouTube Export Report</title>
  <style>
    body {
      margin: 0;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: #1f2933;
      background: #f4f5f6;
    }
    main {
      max-width: 920px;
      margin: 0 auto;
      padding: 18px 22px;
    }
    article {
      background: #ffffff;
      border: 1px solid #d8d6ce;
      border-radius: 8px;
      padding: 22px 28px;
      box-shadow: 0 10px 30px rgba(31, 41, 51, 0.08);
    }
    h1, h2, h3 {
      line-height: 1.12;
      margin: 0.9em 0 0.35em;
    }
    h1 { margin-top: 0; font-size: 25px; }
    h2 { font-size: 17px; border-top: 1px solid #e7e4dc; padding-top: 12px; }
    h3 { font-size: 15px; }
    p, li {
      font-size: 14px;
      line-height: 1.42;
    }
    p {
      margin: 0.35em 0 0.65em;
    }
    ul, ol {
      padding-left: 20px;
      margin: 0.35em 0 0.7em;
    }
    code {
      background: #f0eee8;
      padding: 2px 5px;
      border-radius: 4px;
      font-size: 0.92em;
    }
    .meta {
      color: #69727d;
      font-size: 11px;
      margin-bottom: 12px;
    }
  </style>
</head>
<body>
  <main>
    <article>
      <div class="meta">Source: ${escapeHtml(sourceFile)} · Model: ${escapeHtml(model)} · Generated: ${escapeHtml(new Date().toISOString())}</div>
      ${renderMarkdown(markdown)}
    </article>
  </main>
</body>
</html>`;
}

async function main() {
  await loadDotEnv();

  const args = parseArgs(process.argv.slice(2));
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Set OPENAI_API_KEY in .env or the environment.");
  }
  if (!args.model) {
    throw new Error("Set OPENAI_MODEL or pass --model.");
  }

  const inputPath = path.resolve(args.inputPath);
  const outputBase = path.resolve(args.outputBase);
  const rows = JSON.parse(await fs.readFile(inputPath, "utf8"));
  if (!Array.isArray(rows)) {
    throw new Error("Input JSON must be an array of YouTube video rows.");
  }

  const analysisInput = compactRows(rows);
  const markdown = await createReport({
    apiKey,
    model: args.model,
    analysisInput,
  });

  const markdownPath = `${outputBase}.md`;
  const htmlPath = `${outputBase}.html`;
  await fs.writeFile(markdownPath, `${markdown.trim()}\n`, "utf8");
  await fs.writeFile(htmlPath, buildHtml(markdown, path.basename(inputPath), args.model), "utf8");

  console.log(`Wrote ${markdownPath}`);
  console.log(`Wrote ${htmlPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
