#!/usr/bin/env node

const fs = require("fs/promises");
const path = require("path");

const INPUT_PATH = path.resolve(process.argv[2] || "youtube_videos.json");
const OUTPUT_PATH = path.resolve(process.argv[3] || "marketcap-treemap.html");
const TITLE = "YouTube Channel Treemap";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
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

function aggregateChannels(rows) {
  const byChannel = new Map();

  for (const row of rows) {
    const channelName = String(row.channelName || "Unknown").trim() || "Unknown";
    const channelUrl = String(row.channelUrl || "").trim();
    const channelLogoUrl = String(row.channelLogoUrl || row.avatarUrl || row.logoUrl || "").trim();
    const viewCount = parseViewCount(row.viewCountText);
    if (channelName === "Unknown") {
      continue;
    }

    if (!byChannel.has(channelName)) {
      byChannel.set(channelName, {
        channelName,
        channelUrl,
        videos: 0,
        totalViews: 0,
        topVideoUrl: "",
        topVideoViews: 0,
        channelLogoUrl: "",
      });
    }

    const entry = byChannel.get(channelName);
    entry.videos += 1;
    entry.totalViews += viewCount;

    if (!entry.channelUrl && channelUrl) {
      entry.channelUrl = channelUrl;
    }

    if (!entry.channelLogoUrl && channelLogoUrl) {
      entry.channelLogoUrl = channelLogoUrl;
    }

    if (viewCount >= entry.topVideoViews) {
      entry.topVideoViews = viewCount;
      entry.topVideoUrl = String(row.url || "").trim();
    }
  }

  return [...byChannel.values()]
    .filter((entry) => entry.videos > 0)
    .sort((a, b) => b.videos - a.videos || b.totalViews - a.totalViews);
}

function splitTreemap(items, x, y, width, height) {
  if (!items.length) return [];
  if (items.length === 1) {
    return [{ ...items[0], x, y, width, height }];
  }

  const total = items.reduce((sum, item) => sum + item.value, 0);
  let running = 0;
  let splitIndex = 0;

  for (let i = 0; i < items.length; i += 1) {
    running += items[i].value;
    if (running >= total / 2) {
      splitIndex = i + 1;
      break;
    }
  }

  const leftItems = items.slice(0, splitIndex);
  const rightItems = items.slice(splitIndex);
  const leftValue = leftItems.reduce((sum, item) => sum + item.value, 0);
  const ratio = total === 0 ? 0.5 : leftValue / total;

  if (width >= height) {
    const leftWidth = width * ratio;
    return [
      ...splitTreemap(leftItems, x, y, leftWidth, height),
      ...splitTreemap(rightItems, x + leftWidth, y, width - leftWidth, height),
    ];
  }

  const topHeight = height * ratio;
  return [
    ...splitTreemap(leftItems, x, y, width, topHeight),
    ...splitTreemap(rightItems, x, y + topHeight, width, height - topHeight),
  ];
}

function formatViewsExact(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

async function fetchDataUrl(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36",
    },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }

  const contentType = response.headers.get("content-type") || "image/jpeg";
  const buffer = Buffer.from(await response.arrayBuffer());
  return `data:${contentType};base64,${buffer.toString("base64")}`;
}

function normalizeImageUrl(url) {
  return String(url || "")
    .replace(/\\u0026/g, "&")
    .replace(/\\u003d/g, "=")
    .replace(/\\\//g, "/")
    .replace(/&amp;/g, "&")
    .trim();
}

function isVideoThumbnailUrl(url) {
  try {
    const { hostname, pathname } = new URL(url);
    return (
      hostname === "i.ytimg.com" ||
      hostname.endsWith(".ytimg.com") ||
      pathname.includes("/vi/")
    );
  } catch {
    return false;
  }
}

function isLikelyChannelLogoUrl(url) {
  if (!url || isVideoThumbnailUrl(url)) {
    return false;
  }

  try {
    const { hostname } = new URL(url);
    return hostname.endsWith(".googleusercontent.com") || hostname.endsWith(".ggpht.com");
  } catch {
    return false;
  }
}

async function resolveChannelLogo(entry) {
  const directLogoUrl = normalizeImageUrl(entry.channelLogoUrl);
  if (!isLikelyChannelLogoUrl(directLogoUrl)) {
    return "";
  }

  try {
    return await fetchDataUrl(directLogoUrl);
  } catch (error) {
    console.warn(`[logo] ${entry.channelName}: ${error.message}`);
    return directLogoUrl;
  }
}

async function enrichWithLogos(entries) {
  const concurrency = 6;
  const queue = [...entries];
  const enriched = new Map();

  async function worker() {
    while (queue.length) {
      const entry = queue.shift();
      const logoDataUrl = await resolveChannelLogo(entry);
      enriched.set(entry.channelName, { ...entry, logoDataUrl });
      console.log(`[tile] ${entry.channelName} videos=${entry.videos}`);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return entries.map((entry) => enriched.get(entry.channelName) || entry);
}

function buildHtml(layout, generatedAt, sourceFile) {
  const tiles = layout.map((item) => {
    const style = [
      `left:${((item.x / 1400) * 100).toFixed(4)}%`,
      `top:${((item.y / 900) * 100).toFixed(4)}%`,
      `width:${((item.width / 1400) * 100).toFixed(4)}%`,
      `height:${((item.height / 900) * 100).toFixed(4)}%`,
    ].filter(Boolean).join(";");

    return `
      <a class="tile" href="${escapeHtml(item.channelUrl || item.topVideoUrl || "#")}" target="_blank" rel="noreferrer" style="${style}">
        ${item.logoDataUrl
          ? `<img class="tile__image" src="${escapeAttribute(item.logoDataUrl)}" alt="${escapeAttribute(item.channelName)} logo" loading="lazy" decoding="async">`
          : `<div class="tile__image tile__image--empty"></div>`}
        <div class="tile__shade"></div>
        <div class="tile__content">
          <div class="tile__name">${escapeHtml(item.channelName)}</div>
          <div class="tile__stats">${escapeHtml(formatViewsExact(item.videos))}</div>
        </div>
      </a>
    `;
  }).join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(TITLE)}</title>
  <style>
    :root {
      --bg: #f5f0e8;
      --ink: #1e1d1a;
      --muted: rgba(30, 29, 26, 0.72);
      --tile-gap: 6px;
      --panel: #fffaf2;
      --accent: #cc5a2d;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      min-height: 100vh;
      font-family: Georgia, "Times New Roman", serif;
      color: var(--ink);
      background:
        radial-gradient(circle at top left, rgba(204, 90, 45, 0.12), transparent 28%),
        radial-gradient(circle at bottom right, rgba(16, 102, 122, 0.12), transparent 30%),
        linear-gradient(180deg, #f8f2e8 0%, #efe6d8 100%);
    }

    .page {
      width: min(1920px, 100vw);
      height: 100vh;
      margin: 0 auto;
      padding: 18px 20px 14px;
      display: grid;
      grid-template-rows: auto minmax(0, 1fr) auto;
      gap: 12px;
    }

    .header {
      display: grid;
      grid-template-columns: 1.4fr 1fr;
      gap: 14px;
      align-items: end;
    }

    .eyebrow {
      font-size: 12px;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--accent);
      margin-bottom: 10px;
    }

    h1 {
      margin: 0;
      font-size: clamp(28px, 3.8vw, 58px);
      line-height: 0.92;
      letter-spacing: -0.04em;
      font-weight: 700;
    }

    .summary {
      background: rgba(255, 250, 242, 0.78);
      border: 1px solid rgba(30, 29, 26, 0.12);
      border-radius: 18px;
      padding: 14px 16px;
      backdrop-filter: blur(10px);
    }

    .summary p,
    .footer p {
      margin: 0;
      color: var(--muted);
      line-height: 1.35;
      font-size: 13px;
    }

    .stats {
      display: flex;
      gap: 14px;
      flex-wrap: wrap;
      margin-top: 10px;
      font-size: 13px;
    }

    .stats strong {
      display: block;
      font-size: 18px;
      color: var(--ink);
    }

    .controls {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      margin: 10px 0 0;
    }

    .toggle {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 999px;
      border: 1px solid rgba(30, 29, 26, 0.12);
      background: rgba(255, 255, 255, 0.58);
      color: var(--ink);
      font-size: 13px;
      cursor: pointer;
      user-select: none;
    }

    .toggle input {
      margin: 0;
      accent-color: var(--accent);
    }

    .treemap {
      position: relative;
      height: 100%;
      min-height: 0;
      background: rgba(255, 250, 242, 0.48);
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 20px 70px rgba(55, 38, 12, 0.14);
      border: 1px solid rgba(30, 29, 26, 0.12);
    }

    .tile {
      position: absolute;
      display: block;
      overflow: hidden;
      border-radius: 16px;
      border: 3px solid rgba(255, 250, 242, 0.82);
      color: #fffdf7;
      text-decoration: none;
      background:
        linear-gradient(135deg, rgba(61, 58, 49, 0.7), rgba(20, 20, 17, 0.45)),
        linear-gradient(135deg, #876445, #3f2f25);
      isolation: isolate;
    }

    .tile__shade,
    .tile__content {
      position: absolute;
      inset: 0;
    }

    .tile__image {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      transform: scale(1.02);
      filter: saturate(1.08) contrast(1.02);
    }

    .tile__image--empty {
      background:
        radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.28), transparent 20%),
        linear-gradient(135deg, #876445, #3f2f25);
    }

    .tile__shade {
      background:
        linear-gradient(180deg, rgba(0, 0, 0, 0.06) 0%, rgba(0, 0, 0, 0.58) 100%),
        linear-gradient(135deg, rgba(255, 255, 255, 0.04), rgba(0, 0, 0, 0.28));
    }

    .tile__content {
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      padding: clamp(12px, 1.4vw, 18px);
      gap: 4px;
    }

    .tile__name {
      font-size: clamp(14px, 1.4vw, 30px);
      line-height: 1;
      font-weight: 700;
      text-wrap: balance;
      text-shadow: 0 2px 12px rgba(0, 0, 0, 0.35);
    }

    .tile__stats {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      text-shadow: 0 2px 10px rgba(0, 0, 0, 0.35);
    }

    .tile__stats {
      font-size: clamp(11px, 1vw, 16px);
      opacity: 0.96;
    }

    body.hide-names .tile__name {
      display: none;
    }

    body.hide-counts .tile__stats {
      display: none;
    }

    body.hide-names.hide-counts .tile__shade {
      background:
        linear-gradient(180deg, rgba(0, 0, 0, 0.02) 0%, rgba(0, 0, 0, 0.16) 100%),
        linear-gradient(135deg, rgba(255, 255, 255, 0.02), rgba(0, 0, 0, 0.12));
    }

    .footer {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      padding: 0 4px;
    }

    @media (max-width: 900px) {
      .page {
        width: 100%;
        height: auto;
        min-height: 100vh;
        padding: 16px;
        grid-template-rows: auto auto auto;
      }

      .header {
        grid-template-columns: 1fr;
      }

      .treemap {
        min-height: 78vh;
        height: 78vh;
      }
    }
  </style>
</head>
<body>
  <main class="page">
    <section class="header">
      <div>
        <div class="eyebrow">Generated from youtube_videos.json</div>
        <h1>${escapeHtml(TITLE)}</h1>
      </div>
      <div class="summary">
        <p>
          Tile area uses the exported video count per channel.
          Channel logos come from exported or API-enriched <code>channelLogoUrl</code> values.
        </p>
        <div class="stats">
          <span><strong>${escapeHtml(String(layout.length))}</strong>channels</span>
          <span><strong>${escapeHtml(formatViewsExact(layout.reduce((sum, item) => sum + item.videos, 0)))}</strong>videos</span>
          <span><strong>${escapeHtml(formatViewsExact(layout.reduce((sum, item) => sum + item.totalViews, 0)))}</strong>parsed views</span>
        </div>
        <div class="controls">
          <label class="toggle">
            <input id="toggle-names" type="checkbox" checked>
            <span>Show channel names</span>
          </label>
          <label class="toggle">
            <input id="toggle-counts" type="checkbox" checked>
            <span>Show video counts</span>
          </label>
        </div>
      </div>
    </section>

    <section class="treemap">
      ${tiles}
    </section>

    <section class="footer">
      <p>Source: ${escapeHtml(sourceFile)}</p>
      <p>Generated: ${escapeHtml(generatedAt)}</p>
    </section>
  </main>
  <script>
    const toggleNames = document.getElementById("toggle-names");
    const toggleCounts = document.getElementById("toggle-counts");

    function syncToggles() {
      document.body.classList.toggle("hide-names", !toggleNames.checked);
      document.body.classList.toggle("hide-counts", !toggleCounts.checked);
    }

    toggleNames.addEventListener("change", syncToggles);
    toggleCounts.addEventListener("change", syncToggles);
    syncToggles();
  </script>
</body>
</html>`;
}

async function main() {
  const raw = await fs.readFile(INPUT_PATH, "utf8");
  const rows = JSON.parse(raw);

  if (!Array.isArray(rows)) {
    throw new Error("Input JSON must be an array of YouTube video rows.");
  }

  const channels = aggregateChannels(rows);
  const withLogos = await enrichWithLogos(channels);
  const chartWidth = 1400;
  const chartHeight = 900;
  const layout = splitTreemap(
    withLogos.map((entry) => ({
      ...entry,
      value: Math.max(entry.videos, 1),
    })),
    0,
    0,
    chartWidth,
    chartHeight,
  );

  const html = buildHtml(layout, new Date().toISOString(), path.basename(INPUT_PATH));
  await fs.writeFile(OUTPUT_PATH, html, "utf8");

  console.log(`Wrote ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
