# YouTube homepage suggestion collector

`youtube-home-suggestions.js` is a browser-console script for Chrome or Firefox. It collects recommendation cards from the YouTube homepage, scrolls to trigger lazy loading, removes duplicate video IDs, and downloads a formatted JSON file.

## Use

1. Open `https://www.youtube.com/` and wait for the homepage recommendations to load.
2. Open Developer Tools (`F12` or `Ctrl+Shift+I` / `Cmd+Option+I`) and select **Console**.
3. Paste the contents of `youtube-home-suggestions.js` and press Enter.
4. Keep the tab open while it scrolls. The JSON download starts automatically when collection finishes.

The script stops after five consecutive 1.5-second passes with no new video IDs, or after 150 passes. Adjust `CONFIG` near the top if the connection is slow or the homepage is especially large.

The downloaded object includes the source URL, collection time, item count, and per-video fields such as title, URL, video ID, channel, metadata text, duration, thumbnail, and raw card text. YouTube can change its markup, so some optional fields may be `null`.
