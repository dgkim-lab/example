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

  function deepWalk(value, visit) {
    if (!value || typeof value !== "object") return;
    visit(value);
    if (Array.isArray(value)) {
      value.forEach((item) => deepWalk(item, visit));
    } else {
      Object.values(value).forEach((item) => deepWalk(item, visit));
    }
  }

  function lastSourceUrl(sources) {
    if (!Array.isArray(sources) || !sources.length) return "";
    return sources[sources.length - 1]?.url || sources[0]?.url || "";
  }

  function firstContentText(part) {
    return (
      part?.text?.content ||
      part?.text?.runs?.map((run) => run.text).join("") ||
      part?.text?.commandRuns?.map((run) => run.text).join("") ||
      part?.content ||
      ""
    );
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

  function looksLikeDuration(value) {
    return /^\d{1,2}:\d{2}(?::\d{2})?$/.test(String(value || "").trim());
  }

  function isUsableTitle(value) {
    const t = String(value || "").replace(/\s+/g, " ").trim();
    return Boolean(t) && !looksLikeDuration(t);
  }

  function extractTitleFromAriaLabel(value) {
    const label = String(value || "").replace(/\s+/g, " ").trim();
    if (!label || looksLikeDuration(label)) {
      return "";
    }

    const patterns = [
      /\s+by\s+.+?\s+\d[\d,.]*\s+views?\s+/i,
      /\s+by\s+.+?\s+(?:\d+\s+)?(?:seconds?|minutes?|hours?|days?|weeks?|months?|years?)\s+ago\s+/i,
      /\s+by\s+.+?\s+(?:streamed|premiered)\s+/i,
      /\s+게시자:\s+.+?\s+조회수\s+/i,
      /\s+조회수\s+[\d,.]+\S*\s*회\s+/i,
      /\s+[\d,.]+\S*\s*회\s+시청\s+/i,
    ];

    for (const pattern of patterns) {
      const match = label.match(pattern);
      if (match?.index > 0) {
        return label.slice(0, match.index).trim();
      }
    }

    return label;
  }

  function formatDurationFromLabel(value) {
    const label = String(value || "").replace(/\s+/g, " ").trim();
    if (!label) return "";

    const matches = [...label.matchAll(/(\d+)\s+(hours?|minutes?|seconds?)/gi)];
    if (!matches.length) return "";

    const parts = { hours: 0, minutes: 0, seconds: 0 };
    for (const match of matches.slice(-3)) {
      const amount = Number(match[1]);
      const unit = match[2].toLowerCase();
      if (unit.startsWith("hour")) parts.hours = amount;
      if (unit.startsWith("minute")) parts.minutes = amount;
      if (unit.startsWith("second")) parts.seconds = amount;
    }

    if (!parts.hours && !parts.minutes && !parts.seconds) return "";

    const pad = (n) => String(n).padStart(2, "0");
    return parts.hours
      ? `${parts.hours}:${pad(parts.minutes)}:${pad(parts.seconds)}`
      : `${parts.minutes}:${pad(parts.seconds)}`;
  }

  function parseEnglishDuration(value) {
    return formatDurationFromLabel(value);
  }

  function getTitleAnchor(renderer) {
    const selectors = [
      'a.yt-lockup-metadata-view-model__title[href]',
      'a.ytLockupMetadataViewModelTitle[href]',
      'h3.ytLockupMetadataViewModelHeadingReset a[href]',
      '.shortsLockupViewModelHostMetadataTitle a[href]',
      'a.shortsLockupViewModelHostEndpoint[title][href]',
      'a#video-title-link[href]',
      'a#video-title[href]',
      'h3 a[href^="/watch"]',
      'h3 a[href^="/shorts/"]',
      'a[title][href^="/watch"]',
      'a[title][href^="/shorts/"]',
      'a[aria-label][href^="/watch"]',
      'a[aria-label][href^="/shorts/"]',
    ];

    for (const selector of selectors) {
      const anchors = [...renderer.querySelectorAll(selector)];
      const anchor = anchors.find((el) => attr(el, "id") !== "thumbnail");
      if (anchor) {
        return anchor;
      }
    }

    return null;
  }

  function getVideoAnchor(renderer) {
    return (
      getTitleAnchor(renderer) ||
      renderer.querySelector('a[href^="/watch"]:not(#thumbnail)') ||
      renderer.querySelector('a[href^="/shorts/"]:not(#thumbnail)') ||
      renderer.querySelector('a[href^="/watch"]') ||
      renderer.querySelector('a[href^="/shorts/"]')
    );
  }

  function getTitle(renderer, titleAnchor) {
    const candidates = [
      attr(titleAnchor, "title"),
      text(titleAnchor),
      extractTitleFromAriaLabel(attr(titleAnchor, "aria-label")),
      attr(renderer.querySelector("h3.ytLockupMetadataViewModelHeadingReset"), "title"),
      text(renderer.querySelector(".ytLockupMetadataViewModelTitle")),
      attr(renderer.querySelector(".shortsLockupViewModelHostMetadataTitle a"), "title"),
      text(renderer.querySelector(".shortsLockupViewModelHostMetadataTitle")),
      text(renderer.querySelector(".yt-lockup-metadata-view-model__title")),
      text(renderer.querySelector("#video-title")),
      text(renderer.querySelector("h3")),
    ];

    return candidates.find(isUsableTitle) || "";
  }

  function getChannelName(renderer) {
    const selectors = [
      '.yt-content-metadata-view-model__metadata-row a[href^="/@"]',
      '.yt-content-metadata-view-model__metadata-row a[href^="/channel/"]',
      '.yt-content-metadata-view-model__metadata-row a[href^="/c/"]',
      '.yt-content-metadata-view-model__metadata-row a[href^="/user/"]',
      '.ytContentMetadataViewModelMetadataRow a[href^="/@"]',
      '.ytContentMetadataViewModelMetadataRow a[href^="/channel/"]',
      '.ytContentMetadataViewModelMetadataRow a[href^="/c/"]',
      '.ytContentMetadataViewModelMetadataRow a[href^="/user/"]',
      '.ytContentMetadataViewModelHost a[href^="/@"]',
      '.ytContentMetadataViewModelHost a[href^="/channel/"]',
      '.ytContentMetadataViewModelHost a[href^="/c/"]',
      '.ytContentMetadataViewModelHost a[href^="/user/"]',
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
      renderer.querySelector('.yt-content-metadata-view-model__metadata-row a[href^="/user/"]') ||
      renderer.querySelector('.ytContentMetadataViewModelMetadataRow a[href^="/@"]') ||
      renderer.querySelector('.ytContentMetadataViewModelMetadataRow a[href^="/channel/"]') ||
      renderer.querySelector('.ytContentMetadataViewModelMetadataRow a[href^="/c/"]') ||
      renderer.querySelector('.ytContentMetadataViewModelMetadataRow a[href^="/user/"]') ||
      renderer.querySelector('.ytContentMetadataViewModelHost a[href^="/@"]') ||
      renderer.querySelector('.ytContentMetadataViewModelHost a[href^="/channel/"]') ||
      renderer.querySelector('.ytContentMetadataViewModelHost a[href^="/c/"]') ||
      renderer.querySelector('.ytContentMetadataViewModelHost a[href^="/user/"]');

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

  function getDuration(renderer, titleAnchor) {
    const candidates = [
      renderer.querySelector(".yt-badge-shape__text"),
      renderer.querySelector(".ytBadgeShapeText"),
      renderer.querySelector("yt-thumbnail-badge-view-model .ytBadgeShapeText"),
      renderer.querySelector("ytd-thumbnail-overlay-time-status-renderer span"),
      renderer.querySelector("#time-status span"),
    ];
    for (const el of candidates) {
      const t = text(el);
      if (t) return t;
    }
    return parseEnglishDuration(attr(titleAnchor, "aria-label"));
  }

  function parsePercent(value) {
    const match = String(value || "").match(/(\d+(?:\.\d+)?)\s*%/);
    if (!match) {
      return "";
    }

    const percent = Math.max(0, Math.min(100, Number(match[1])));
    return Number.isFinite(percent) ? String(Math.round(percent)) : "";
  }

  function getWatchProgress(renderer) {
    const candidates = [
      ...renderer.querySelectorAll(`
        yt-thumbnail-overlay-progress-bar-view-model,
        .ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment,
        ytd-thumbnail-overlay-resume-playback-renderer,
        .ytd-thumbnail-overlay-resume-playback-renderer,
        [role="progressbar"],
        #progress
      `),
    ];

    for (const el of candidates) {
      const ariaValue = attr(el, "aria-valuenow");
      if (ariaValue) {
        return {
          watchProgressPercent: String(Math.round(Number(ariaValue))),
          watchProgressText: attr(el, "aria-label") || text(el),
        };
      }

      const percent =
        parsePercent(attr(el, "style")) ||
        parsePercent(attr(el.querySelector?.("#progress"), "style")) ||
        parsePercent(attr(el.querySelector?.("[style*='width']"), "style"));

      if (percent) {
        return {
          watchProgressPercent: percent,
          watchProgressText: attr(el, "aria-label") || text(el),
        };
      }
    }

    return {
      watchProgressPercent: "",
      watchProgressText: "",
    };
  }

  function getMetadataTexts(renderer) {
    return [...new Set(
      [
        ...renderer.querySelectorAll(`
        .yt-content-metadata-view-model__metadata-text,
          .ytContentMetadataViewModelMetadataText,
          .ytContentMetadataViewModelHost span,
          .ytLockupMetadataViewModelMetadata span,
          .shortsLockupViewModelHostMetadataSubhead span,
          .shortsLockupViewModelHostOutsideMetadataSubhead span,
          .inline-metadata-item,
          ytd-video-meta-block span,
          #metadata-line span,
          #metadata span,
          ytd-grid-video-renderer #metadata span
        `),
      ]
        .map((el) => text(el))
        .filter(Boolean)
    )];
  }

  function getAriaMetadata(titleAnchor) {
    const aria = attr(titleAnchor, "aria-label");
    if (!aria || looksLikeDuration(aria)) {
      return [];
    }

    return [
      ...aria.matchAll(/[\d,.]+\s*(?:K|M|B)?\s+views?/gi),
      ...aria.matchAll(/조회수\s+[\d,.]+\S*\s*회/gi),
      ...aria.matchAll(/[\d,.]+\S*\s*회\s+시청/gi),
      ...aria.matchAll(/(?:\d+\s+)?(?:seconds?|minutes?|hours?|days?|weeks?|months?|years?)\s+ago/gi),
      ...aria.matchAll(/\d+\s*(?:초|분|시간|일|주|개월|달|년)\s*전/gi),
      ...aria.matchAll(/(?:streamed|premiered)\s+[^,]+/gi),
    ].map((match) => match[0]);
  }

  function pickViewCount(metadataTexts, ariaMetadata = []) {
    return [...metadataTexts, ...ariaMetadata].find((t) => /조회수|views|watching|회 시청/i.test(t)) || "";
  }

  function pickPublished(metadataTexts, ariaMetadata = []) {
    return [...metadataTexts, ...ariaMetadata].find((t) => /ago|전|streamed|게시됨|premiered|방송/i.test(t)) || "";
  }

  function detectType(url) {
    if (url.includes("/shorts/")) return "shorts";
    return "video";
  }

  function getDurationFromLockup(lockup) {
    const overlays = lockup?.contentImage?.thumbnailViewModel?.overlays || [];
    for (const overlay of overlays) {
      const badges = overlay.thumbnailBottomOverlayViewModel?.badges || [];
      for (const badge of badges) {
        const model = badge.thumbnailBadgeViewModel;
        if (model?.text) return model.text;
        const label = model?.rendererContext?.accessibilityContext?.label;
        const duration = formatDurationFromLabel(label);
        if (duration) return duration;
      }
    }
    return "";
  }

  function getWatchProgressFromLockup(lockup) {
    const overlays = lockup?.contentImage?.thumbnailViewModel?.overlays || [];
    for (const overlay of overlays) {
      const progress = overlay.thumbnailBottomOverlayViewModel
        ?.progressBar
        ?.thumbnailOverlayProgressBarViewModel;
      if (progress?.startPercent !== undefined) {
        return {
          watchProgressPercent: String(Math.round(Number(progress.startPercent))),
          watchProgressText: "",
        };
      }
    }
    return {
      watchProgressPercent: "",
      watchProgressText: "",
    };
  }

  function rowFromLockup(lockup, index) {
    const metadata = lockup?.metadata?.lockupMetadataViewModel || {};
    const metadataRows = metadata?.metadata?.contentMetadataViewModel?.metadataRows || [];
    const channelPart = metadataRows[0]?.metadataParts?.[0];
    const viewPart = metadataRows[1]?.metadataParts?.[0];
    const publishedPart = metadataRows[1]?.metadataParts?.[1];
    const videoPath =
      lockup?.rendererContext?.commandContext?.onTap?.innertubeCommand?.commandMetadata?.webCommandMetadata?.url ||
      lockup?.itemPlayback?.inlinePlayerData?.onSelect?.innertubeCommand?.commandMetadata?.webCommandMetadata?.url ||
      "";
    const channelPath =
      metadata?.image?.decoratedAvatarViewModel?.rendererContext?.commandContext?.onTap?.innertubeCommand?.browseEndpoint?.canonicalBaseUrl ||
      channelPart?.text?.commandRuns?.[0]?.onTap?.innertubeCommand?.browseEndpoint?.canonicalBaseUrl ||
      channelPart?.text?.commandRuns?.[0]?.onTap?.innertubeCommand?.commandMetadata?.webCommandMetadata?.url ||
      "";
    const thumbnailUrl = lastSourceUrl(lockup?.contentImage?.thumbnailViewModel?.image?.sources);
    const channelLogoUrl = lastSourceUrl(metadata?.image?.decoratedAvatarViewModel?.avatar?.avatarViewModel?.image?.sources);
    const watchProgress = getWatchProgressFromLockup(lockup);

    return {
      index,
      pageUrl: location.href,
      collectedAt: new Date().toISOString(),
      type: detectType(videoPath),
      title: metadata.title?.content || "",
      url: absUrl(videoPath),
      videoId: getVideoIdFromUrl(videoPath),
      channelName: firstContentText(channelPart),
      channelUrl: absUrl(channelPath),
      duration: getDurationFromLockup(lockup),
      viewCountText: firstContentText(viewPart),
      publishedText: firstContentText(publishedPart),
      ...watchProgress,
      metadataTexts: metadataRows.flatMap((row) =>
        (row.metadataParts || []).map(firstContentText).filter(Boolean)
      ),
      channelLogoUrl,
      thumbnailUrl,
    };
  }

  function collectInitialDataRows() {
    const rows = [];
    deepWalk(window.ytInitialData, (node) => {
      if (node.lockupViewModel) {
        rows.push(rowFromLockup(node.lockupViewModel, rows.length + 1));
      }
    });
    return rows;
  }

  function mergeRows(rows) {
    const byKey = new Map();
    for (const row of rows) {
      const key = row.videoId || row.url || `${row.title}_${row.index}`;
      if (!key) continue;
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, row);
        continue;
      }

      const merged = { ...existing };
      for (const [field, value] of Object.entries(row)) {
        if (Array.isArray(value)) {
          if (!merged[field]?.length && value.length) merged[field] = value;
        } else if ((merged[field] === "" || merged[field] === undefined || merged[field] === null) && value) {
          merged[field] = value;
        }
      }
      byKey.set(key, merged);
    }

    return [...byKey.values()].map((row, index) => ({ ...row, index: index + 1 }));
  }

  function collect() {
    const renderers = [
      ...document.querySelectorAll(`
        .yt-lockup-view-model,
        yt-lockup-view-model,
        ytm-shorts-lockup-view-model,
        ytm-shorts-lockup-view-model-v2,
        ytd-rich-item-renderer,
        ytd-video-renderer,
        ytd-grid-video-renderer,
        ytd-compact-video-renderer,
        ytd-playlist-video-renderer,
        ytd-reel-item-renderer
      `)
    ];

    const domRows = renderers.map((renderer, index) => {
      const titleAnchor = getTitleAnchor(renderer);
      const videoAnchor = getVideoAnchor(renderer);
      const url = absUrl(attr(videoAnchor, "href"));
      const title = getTitle(renderer, titleAnchor);

      const metadataTexts = getMetadataTexts(renderer);
      const ariaMetadata = getAriaMetadata(titleAnchor);
      const watchProgress = getWatchProgress(renderer);

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
        duration: getDuration(renderer, titleAnchor),
        viewCountText: pickViewCount(metadataTexts, ariaMetadata),
        publishedText: pickPublished(metadataTexts, ariaMetadata),
        ...watchProgress,
        metadataTexts,
        channelLogoUrl: getChannelLogo(renderer),
        thumbnailUrl: getThumbnail(renderer),
      };
    });

    return mergeRows([
      ...collectInitialDataRows(),
      ...domRows,
    ].filter((x) => x.url || x.title));
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
    "duration", "watchProgressPercent", "watchProgressText", "viewCountText", "publishedText", "channelLogoUrl", "thumbnailUrl", "pageUrl", "collectedAt"
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
