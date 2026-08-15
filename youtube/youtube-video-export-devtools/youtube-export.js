(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function autoScrollUntilEnd({
    pauseMs = 1200,
    maxRounds = 200,
    stableRoundsToStop = 5,
  } = {}) {
    let lastHeight = 0;
    let stableRounds = 0;

    for (let i = 0; i < maxRounds; i++) {
      window.scrollTo(0, document.documentElement.scrollHeight);
      await sleep(pauseMs);

      const newHeight = document.documentElement.scrollHeight;
      if (newHeight === lastHeight) {
        stableRounds++;
      } else {
        stableRounds = 0;
        lastHeight = newHeight;
      }

      console.log(`[scroll] ${i + 1} / ${maxRounds}  height=${newHeight} stable=${stableRounds}`);
      if (stableRounds >= stableRoundsToStop) break;
    }
  }

  function text(el) {
    return (el?.textContent || "").replace(/\s+/g, " ").trim();
  }

  function attr(el, name) {
    return el?.getAttribute?.(name)?.trim?.() || "";
  }

  function absUrl(url) {
    if (!url) return "";
    try {
      return new URL(url, location.origin).href;
    } catch {
      return url;
    }
  }

  function getVideoIdFromUrl(url) {
    if (!url) return "";
    try {
      const u = new URL(url, location.origin);
      if (u.pathname === "/watch") return u.searchParams.get("v") || "";
      const m = u.pathname.match(/^\/shorts\/([^/?]+)/);
      return m ? m[1] : "";
    } catch {
      return "";
    }
  }

  function getTitleAnchor(renderer) {
    return (
      renderer.querySelector('a.yt-lockup-metadata-view-model__title[href]') ||
      renderer.querySelector('a#video-title[href]') ||
      renderer.querySelector('a[href^="/watch"]') ||
      renderer.querySelector('a[href^="/shorts/"]')
    );
  }

  function getChannelName(renderer) {
    const selectors = [
      '.yt-content-metadata-view-model__metadata-row a[href^="/@"]',
      '.yt-content-metadata-view-model__metadata-row a[href^="/channel/"]',
      '.yt-content-metadata-view-model__metadata-row a[href^="/c/"]',
      '.yt-content-metadata-view-model__metadata-row a[href^="/user/"]',
      '#channel-name a',
      'ytd-channel-name a',
      'yt-formatted-string#text a',
    ];

    for (const sel of selectors) {
      const el = renderer.querySelector(sel);
      const t = text(el);
      if (t) return t;
    }

    const avatarBtn = renderer.querySelector('[aria-label^="Go to channel "]');
    const aria = attr(avatarBtn, 'aria-label');
    if (aria.startsWith('Go to channel ')) {
      return aria.replace(/^Go to channel\s+/, '').trim();
    }

    return "";
  }

  function getChannelUrl(renderer) {
    const el =
      renderer.querySelector('.yt-content-metadata-view-model__metadata-row a[href^="/@"]') ||
      renderer.querySelector('.yt-content-metadata-view-model__metadata-row a[href^="/channel/"]') ||
      renderer.querySelector('.yt-content-metadata-view-model__metadata-row a[href^="/c/"]') ||
      renderer.querySelector('.yt-content-metadata-view-model__metadata-row a[href^="/user/"]');

    return absUrl(attr(el, "href"));
  }

  function getThumbnail(renderer) {
    const img =
      renderer.querySelector("yt-thumbnail-view-model img") ||
      renderer.querySelector("ytd-thumbnail img") ||
      renderer.querySelector("a#thumbnail img") ||
      renderer.querySelector("img");
    return img?.src || attr(img, "src") || "";
  }

  function isVideoThumbnailUrl(url) {
    if (!url) return false;
    try {
      const u = new URL(url, location.origin);
      return (
        u.hostname === "i.ytimg.com" ||
        u.hostname.endsWith(".ytimg.com") ||
        u.pathname.includes("/vi/")
      );
    } catch {
      return false;
    }
  }

  function getImageUrl(img) {
    return (
      img?.currentSrc ||
      img?.src ||
      attr(img, "src") ||
      attr(img, "data-thumb") ||
      attr(img, "data-src") ||
      ""
    );
  }

  function getChannelLogo(renderer) {
    const selectors = [
      "a#avatar-link img",
      "#avatar img",
      "yt-img-shadow#avatar img",
      "ytd-channel-name ~ * img",
      "yt-decorated-avatar-view-model img",
      "yt-avatar-shape img",
    ];

    for (const sel of selectors) {
      const img = renderer.querySelector(sel);
      const url = getImageUrl(img);
      if (url && !isVideoThumbnailUrl(url)) {
        return url;
      }
    }

    const avatarLink = renderer.querySelector('a[href^="/@"] img, a[href^="/channel/"] img, a[href^="/c/"] img, a[href^="/user/"] img');
    const avatarUrl = getImageUrl(avatarLink);
    if (avatarUrl && !isVideoThumbnailUrl(avatarUrl)) {
      return avatarUrl;
    }

    return "";
  }

  function getDuration(renderer) {
    const candidates = [
      renderer.querySelector(".yt-badge-shape__text"),
      renderer.querySelector("ytd-thumbnail-overlay-time-status-renderer span"),
      renderer.querySelector("#time-status span"),
    ];
    for (const el of candidates) {
      const t = text(el);
      if (t) return t;
    }
    return "";
  }

  function getMetadataTexts(renderer) {
    return [...new Set(
      [...renderer.querySelectorAll('.yt-content-metadata-view-model__metadata-text, #metadata-line span')]
        .map((el) => text(el))
        .filter(Boolean)
    )];
  }

  function pickViewCount(metadataTexts) {
    return metadataTexts.find((t) => /조회수|views|watching|회 시청/i.test(t)) || "";
  }

  function pickPublished(metadataTexts) {
    return metadataTexts.find((t) => /ago|전|streamed|게시됨|premiered|방송/i.test(t)) || "";
  }

  function detectType(url) {
    if (url.includes("/shorts/")) return "shorts";
    return "video";
  }

  function collect() {
    const renderers = [
      ...document.querySelectorAll(`
        .yt-lockup-view-model,
        ytd-rich-item-renderer,
        ytd-video-renderer,
        ytd-grid-video-renderer,
        ytd-compact-video-renderer,
        ytd-playlist-video-renderer,
        ytd-reel-item-renderer
      `)
    ];

    const rows = renderers.map((renderer, index) => {
      const titleAnchor = getTitleAnchor(renderer);
      const url = absUrl(attr(titleAnchor, "href"));
      const title =
        attr(titleAnchor, "title") ||
        attr(titleAnchor, "aria-label") ||
        text(titleAnchor);

      const metadataTexts = getMetadataTexts(renderer);

      return {
        index: index + 1,
        pageUrl: location.href,
        collectedAt: new Date().toISOString(),
        type: detectType(url),
        title,
        url,
        videoId: getVideoIdFromUrl(url),
        channelName: getChannelName(renderer),
        channelUrl: getChannelUrl(renderer),
        duration: getDuration(renderer),
        viewCountText: pickViewCount(metadataTexts),
        publishedText: pickPublished(metadataTexts),
        metadataTexts,
        channelLogoUrl: getChannelLogo(renderer),
        thumbnailUrl: getThumbnail(renderer),
      };
    });

    return Array.from(
      new Map(
        rows
          .filter((x) => x.url || x.title)
          .map((row) => [row.url || `${row.title}_${row.index}`, row])
      ).values()
    );
  }

  await autoScrollUntilEnd({
    pauseMs: 1500,
    maxRounds: 300,
    stableRoundsToStop: 6,
  });

  const data = collect();

  console.log("Collected:", data.length);
  console.table(data.map(x => ({
    channelName: x.channelName,
    title: x.title,
    url: x.url,
    channelUrl: x.channelUrl,
    channelLogoUrl: x.channelLogoUrl,
    duration: x.duration,
    viewCountText: x.viewCountText,
    publishedText: x.publishedText,
  })));

  window.youtubeVideoExport = data;

  const jsonBlob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const jsonUrl = URL.createObjectURL(jsonBlob);
  const a1 = document.createElement("a");
  a1.href = jsonUrl;
  a1.download = "youtube_videos.json";
  a1.click();
  URL.revokeObjectURL(jsonUrl);

  const headers = [
    "index", "channelName", "channelUrl", "title", "url", "videoId", "type",
    "duration", "viewCountText", "publishedText", "channelLogoUrl", "thumbnailUrl", "pageUrl", "collectedAt"
  ];

  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [
    headers.join(","),
    ...data.map(row => headers.map(h => esc(row[h])).join(","))
  ].join("\n");

  const csvBlob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const csvUrl = URL.createObjectURL(csvBlob);
  const a2 = document.createElement("a");
  a2.href = csvUrl;
  a2.download = "youtube_videos.csv";
  a2.click();
  URL.revokeObjectURL(csvUrl);
})();
