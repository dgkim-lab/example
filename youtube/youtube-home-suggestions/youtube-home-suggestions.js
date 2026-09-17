/*
 * YouTube homepage recommendation collector
 *
 * Paste this entire file into the DevTools Console while on youtube.com.
 * It scrolls the homepage, collects recommendation metadata, removes duplicate
 * videos, and downloads youtube-home-recommendations-YYYY-MM-DD.json.
 */
(async () => {
  'use strict';

  const CONFIG = {
    // Time between collection passes. Increase this if YouTube loads slowly.
    waitMs: 1500,
    // Number of consecutive passes without a new video before stopping.
    idlePassesToStop: 5,
    // Safety limit for YouTube's effectively infinite homepage.
    maxScrollPasses: 150,
    // Number of pixels to leave visible above the bottom of the page.
    bottomPadding: 400,
  };

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const text = (element) => element?.textContent?.replace(/\s+/g, ' ').trim() || null;

  const firstText = (root, selectors) => {
    for (const selector of selectors) {
      const value = text(root.querySelector(selector));
      if (value) return value;
    }
    return null;
  };

  const firstAttribute = (root, selectors, attribute) => {
    for (const selector of selectors) {
      const value = root.querySelector(selector)?.getAttribute(attribute);
      if (value) return value;
    }
    return null;
  };

  const modernMetadataRows = (root) => [...root.querySelectorAll(
    'yt-content-metadata-view-model .ytContentMetadataViewModelMetadataRow'
  )].map((row) => [...row.querySelectorAll(
    ':scope > span.ytContentMetadataViewModelMetadataText'
  )].map(text).filter(Boolean));

  const thumbnailUrl = (root) => firstAttribute(root, [
    'a[href*="/watch"] img',
    'a[href*="/shorts"] img',
    'a[href*="/live"] img',
    'yt-img-shadow img',
    'img',
  ], 'src');

  const duration = (root) => {
    const badge = [...root.querySelectorAll('badge-shape[aria-label], ytd-thumbnail-overlay-time-status-renderer span')]
      .map((element) => element.getAttribute('aria-label') || text(element))
      .find((value) => value && (
        /^\d{1,2}:\d{2}(?::\d{2})?$/.test(value) ||
        /(?:second|minute|hour|초|분|시간)/i.test(value)
      ));
    return badge || null;
  };

  const absoluteUrl = (href) => {
    try {
      return new URL(href, location.origin).href;
    } catch {
      return null;
    }
  };

  const videoIdFromUrl = (url) => {
    if (!url) return null;
    try {
      const parsed = new URL(url);
      if (parsed.hostname === 'youtu.be') return parsed.pathname.slice(1) || null;
      if (parsed.searchParams.get('v')) return parsed.searchParams.get('v');
      const match = parsed.pathname.match(/^\/(shorts|live|embed)\/([^/?]+)/);
      return match?.[2] || null;
    } catch {
      return null;
    }
  };

  const recommendationSelectors = [
    'ytd-rich-item-renderer',
    'ytd-rich-grid-media',
    'ytd-video-renderer',
    'ytd-grid-video-renderer',
    'ytd-compact-video-renderer',
  ];

  const cardSelector = recommendationSelectors.join(',');

  function collectRecommendations() {
    const found = new Map();

    for (const card of document.querySelectorAll(cardSelector)) {
      const links = [...card.querySelectorAll('a[href]')]
        .map((anchor) => absoluteUrl(anchor.getAttribute('href')))
        .filter((url) => videoIdFromUrl(url));
      const videoUrl = links[0] || null;
      const videoId = videoIdFromUrl(videoUrl);
      if (!videoId || found.has(videoId)) continue;

      const title = firstText(card, [
        'a.ytLockupMetadataViewModelTitle',
        'h3.ytLockupMetadataViewModelHeadingReset a',
        '#video-title',
        'a#video-title-link',
        '[aria-label][href*="watch"]',
      ]);
      const metadataRows = modernMetadataRows(card);
      const modernStats = metadataRows[1] || [];
      const channelUrl = firstAttribute(card, [
        'ytd-channel-name a',
        'yt-content-metadata-view-model a[href^="/@"]',
        'yt-content-metadata-view-model a[href^="/channel/"]',
        'yt-content-metadata-view-model a[href^="/c/"]',
        'yt-content-metadata-view-model a[href^="/user/"]',
        'a[href^="/@"]',
        'a[href^="/channel/"]',
        'a[href^="/c/"]',
        'a[href^="/user/"]',
      ], 'href');

      const item = {
        videoId,
        title,
        videoUrl,
        channelName: firstText(card, [
          '#channel-name',
          'ytd-channel-name',
          '.ytd-channel-name',
          // Current homepage markup puts the channel in the first metadata row.
          'yt-content-metadata-view-model a[href^="/@"]',
          'yt-content-metadata-view-model a[href^="/channel/"]',
          'yt-content-metadata-view-model a[href^="/c/"]',
          'yt-content-metadata-view-model a[href^="/user/"]',
          'a.ytAttributedStringLink[href^="/@"]',
        ]),
        channelUrl: absoluteUrl(channelUrl),
        published: modernStats[1] || firstText(card, [
          '#metadata-line span:nth-child(2)',
          '#metadata-line span:nth-child(1)',
          '#metadata-line',
        ]),
        views: modernStats[0] || firstText(card, [
          '#metadata-line span:nth-child(1)',
          '#metadata-line span:nth-child(2)',
        ]),
        duration: duration(card),
        thumbnailUrl: thumbnailUrl(card),
        ariaLabel: firstAttribute(card, [
          'a.ytLockupMetadataViewModelTitle',
          '#video-title',
          'a#video-title-link',
        ], 'aria-label'),
        rawText: text(card),
        collectedAt: new Date().toISOString(),
      };

      found.set(videoId, item);
    }

    return found;
  }

  function downloadJson(items) {
    const payload = {
      source: 'YouTube homepage recommendations',
      sourceUrl: location.href,
      collectedAt: new Date().toISOString(),
      count: items.length,
      items,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `youtube-home-recommendations-${date}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return payload;
  }

  if (!location.hostname.endsWith('youtube.com')) {
    throw new Error('Open this script on youtube.com first.');
  }

  const allItems = new Map();
  let idlePasses = 0;
  let previousHeight = 0;

  console.log('Collecting YouTube homepage recommendations...');

  for (let pass = 1; pass <= CONFIG.maxScrollPasses; pass += 1) {
    for (const [videoId, item] of collectRecommendations()) {
      allItems.set(videoId, item);
    }

    const heightBeforeScroll = document.documentElement.scrollHeight;
    const sizeBefore = allItems.size;
    window.scrollTo({ top: heightBeforeScroll, behavior: 'smooth' });
    await sleep(CONFIG.waitMs);
    for (const [videoId, item] of collectRecommendations()) {
      allItems.set(videoId, item);
    }
    const sizeAfter = allItems.size;
    const heightAfterScroll = document.documentElement.scrollHeight;
    const added = sizeAfter - sizeBefore;

    if (added === 0 && heightAfterScroll === previousHeight) idlePasses += 1;
    else idlePasses = 0;
    previousHeight = heightAfterScroll;

    console.log(`Pass ${pass}: ${sizeAfter} unique videos (+${added}), idle ${idlePasses}/${CONFIG.idlePassesToStop}`);

    if (idlePasses >= CONFIG.idlePassesToStop) break;
    if (window.scrollY + window.innerHeight < heightAfterScroll - CONFIG.bottomPadding) {
      window.scrollTo(0, heightAfterScroll);
    }
  }

  // Collect cards that appeared during the final loading pass.
  for (const [videoId, item] of collectRecommendations()) allItems.set(videoId, item);

  const payload = downloadJson([...allItems.values()]);
  console.log(`Done. Downloaded ${payload.count} unique recommendations as ${payload.count ? 'a JSON file' : 'an empty JSON file'}.`);
})();
