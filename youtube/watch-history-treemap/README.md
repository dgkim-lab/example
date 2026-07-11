# YouTube Watch History Treemap

Generate standalone HTML treemaps from your Google Takeout YouTube watch history.

## Get Your YouTube Watch History

1. Open <https://takeout.google.com/>.
2. Click **Deselect all**.
3. Select **YouTube and YouTube Music**.
4. Open the product options and include your watch history. If Takeout offers a format choice, choose JSON.
5. Click **Next step** and create the export.
6. Download and unzip the Takeout archive after Google finishes preparing it.
7. Find the watch history file. It is usually under a path similar to:

```text
Takeout/YouTube and YouTube Music/history/watch-history.json
```

8. Copy that file into this project directory as:

```text
watch-history.json
```

The generator expects `watch-history.json` in the project root, next to `package.json`.

## Generate Treemaps

Generate both video and channel treemaps:

```bash
npm run build
```

Generate only the video treemap:

```bash
npm run build:video
```

Generate only the channel treemap:

```bash
npm run build:channel
```

Use the interactive terminal prompt:

```bash
npm run build:tui
```

Generated files are written to `dist/`:

```text
dist/video-treemap.html
dist/channel-treemap.html
```

Open the HTML files directly in a browser. No local web server is required.

## Filters

Exclude YouTube Music rows:

```bash
node scripts/generate-video-treemap.mjs --exclude-youtube-music
node scripts/generate-channel-treemap.mjs --exclude-youtube-music
```

Generate a date range:

```bash
node scripts/generate-video-treemap.mjs --since 2024-01-01 --until 2024-12-31
node scripts/generate-channel-treemap.mjs --since 2024-01-01 --until 2024-12-31
```

Dates are inclusive and must use `YYYY-MM-DD`.
