#!/usr/bin/env node

const fs = require("fs/promises");
const path = require("path");

const INPUT_PATH = path.resolve(process.argv[2] || "youtube_videos.json");
const OUTPUT_PATH = path.resolve(process.argv[3] || "youtube_videos.enriched.json");
const API_BASE = "https://www.googleapis.com/youtube/v3";
const BATCH_SIZE = 50;

async function loadDotEnv(filePath = ".env") {
  try {
    const raw = await fs.readFile(path.resolve(filePath), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!match || process.env[match[1]] !== undefined) {
        continue;
      }

      process.env[match[1]] = match[2]
        .trim()
        .replace(/^(['"])(.*)\1$/, "$2");
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}

function chunk(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function getVideoId(row) {
  if (row.videoId) {
    return String(row.videoId).trim();
  }

  try {
    const url = new URL(row.url);
    if (url.pathname === "/watch") {
      return url.searchParams.get("v") || "";
    }

    const shortsMatch = url.pathname.match(/^\/shorts\/([^/?]+)/);
    return shortsMatch ? shortsMatch[1] : "";
  } catch {
    return "";
  }
}

function pickBestThumbnail(thumbnails = {}) {
  return (
    thumbnails.maxres?.url ||
    thumbnails.high?.url ||
    thumbnails.medium?.url ||
    thumbnails.default?.url ||
    ""
  );
}

async function youtubeGet(resource, params, apiKey) {
  const url = new URL(`${API_BASE}/${resource}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set("key", apiKey);

  const response = await fetch(url, {
    headers: {
      "accept": "application/json",
    },
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = body.error?.message || `HTTP ${response.status}`;
    throw new Error(`${resource}: ${message}`);
  }

  return body;
}

async function fetchVideos(videoIds, apiKey) {
  const byVideoId = new Map();

  for (const ids of chunk(videoIds, BATCH_SIZE)) {
    const body = await youtubeGet("videos", {
      part: "snippet",
      id: ids.join(","),
      maxResults: String(BATCH_SIZE),
    }, apiKey);

    for (const item of body.items || []) {
      byVideoId.set(item.id, item);
    }

    console.log(`[videos] fetched ${byVideoId.size}/${videoIds.length}`);
  }

  return byVideoId;
}

async function fetchChannels(channelIds, apiKey) {
  const byChannelId = new Map();

  for (const ids of chunk(channelIds, BATCH_SIZE)) {
    const body = await youtubeGet("channels", {
      part: "snippet",
      id: ids.join(","),
      maxResults: String(BATCH_SIZE),
    }, apiKey);

    for (const item of body.items || []) {
      byChannelId.set(item.id, item);
    }

    console.log(`[channels] fetched ${byChannelId.size}/${channelIds.length}`);
  }

  return byChannelId;
}

async function main() {
  await loadDotEnv();

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error("Set YOUTUBE_API_KEY in .env or the environment.");
  }

  const raw = await fs.readFile(INPUT_PATH, "utf8");
  const rows = JSON.parse(raw);
  if (!Array.isArray(rows)) {
    throw new Error("Input JSON must be an array of YouTube video rows.");
  }

  const videoIds = unique(rows.map(getVideoId));
  const videosById = await fetchVideos(videoIds, apiKey);
  const channelIds = unique([...videosById.values()].map((video) => video.snippet?.channelId));
  const channelsById = await fetchChannels(channelIds, apiKey);

  let rowsWithChannelUrl = 0;
  let rowsWithChannelLogoUrl = 0;

  const enriched = rows.map((row) => {
    const videoId = getVideoId(row);
    const video = videosById.get(videoId);
    const videoSnippet = video?.snippet || {};
    const channelId = videoSnippet.channelId || "";
    const channel = channelId ? channelsById.get(channelId) : null;
    const channelSnippet = channel?.snippet || {};
    const channelLogoUrl = pickBestThumbnail(channelSnippet.thumbnails);
    const channelUrl = channelId ? `https://www.youtube.com/channel/${channelId}` : "";

    const next = {
      ...row,
      videoId: row.videoId || videoId,
      channelName: row.channelName || videoSnippet.channelTitle || channelSnippet.title || "",
      channelUrl: row.channelUrl || channelUrl,
      channelId: row.channelId || channelId,
      channelLogoUrl: row.channelLogoUrl || channelLogoUrl,
    };

    if (next.channelUrl) rowsWithChannelUrl += 1;
    if (next.channelLogoUrl) rowsWithChannelLogoUrl += 1;
    return next;
  });

  await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(enriched, null, 2)}\n`, "utf8");
  console.log(`Wrote ${OUTPUT_PATH}`);
  console.log(`Rows with channelUrl: ${rowsWithChannelUrl}/${rows.length}`);
  console.log(`Rows with channelLogoUrl: ${rowsWithChannelLogoUrl}/${rows.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
