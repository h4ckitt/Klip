# Klip

A self-hosted "read it later" service for KOReader-enabled e-readers. Save web articles to your server, and sync them directly to your e-reader in beautifully formatted EPUB or PDF files.

## Overview

Klip consists of three components that work together to deliver web content to your e-reader:

1. **Klip Server** - A Node.js server that converts web articles into e-reader-friendly EPUB/PDF files
2. **KOReader Plugin** - A plugin that adds sync functionality to KOReader
3. **Sync Client** - A Go binary that downloads articles from the server to your device

## Features

- Converts web articles to clean, readable EPUB or PDF format
- Uses Mozilla's Readability library for content extraction
- Generates custom EPUB covers with article titles
- E-reader optimized styling (sepia backgrounds, serif fonts, proper line spacing)
- Handles code blocks and syntax highlighting
- Processes lazy-loaded images and embedded gists
- Automatic cleanup after successful downloads
- Simple sync workflow from within KOReader

## Architecture

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Browser   │         │    Klip     │         │  KOReader   │
│  Extension  │────────▶│   Server    │◀────────│   Plugin    │
│     or      │  POST   │  (Node.js)  │  Sync   │   (Lua)     │
│     API     │  /clip  │             │         │      +      │
└─────────────┘         │  Puppeteer  │         │ Go Binary   │
                        │ Readability │         └─────────────┘
                        │  epub-gen   │
                        └─────────────┘
```

## Setup

### Server Setup

#### Using Docker (Recommended)

Run the server using Docker Compose. The server will be available at `http://localhost:3000`.

Configure the `DOWNLOAD_URL` environment variable in `docker-compose.yml` to match your public server URL for remote access.

#### Manual Setup

Install dependencies with `npm install` and run the server with `node server.js`.

### KOReader Plugin Setup

1. Copy the `klip.koplugin` folder to your KOReader's plugins directory (typically `/mnt/us/koreader/plugins/`)

2. Build the Go binary for your e-reader's architecture. For Kindle Paperwhite and similar devices, use `GOARCH=arm GOARM=7`. Adjust for your specific device.

3. Restart KOReader

4. Configure the plugin from the KOReader menu:
   - **Server URL**: Your Klip server address
   - **Download Folder**: Where to save articles on your device

## Usage

### Clipping Articles

Send a POST request to the `/clip` endpoint with the article URL. The server will fetch the page, extract the content, and convert it to your chosen format (EPUB or PDF).

You can optionally specify:
- Output format (epub or pdf)
- Fetch mode (fast or best_effort for JavaScript-heavy sites)

### Syncing to KOReader

1. Open KOReader on your device
2. Open the menu and navigate to **Klip Sync**
3. Tap **Sync Now**

The plugin will download all new articles from the server and save them to your configured folder. Successfully downloaded articles are automatically removed from the server.

## Configuration

### Server Configuration

The server can be configured using environment variables:

- `PORT` - Server port (default: 3000)
- `DOWNLOAD_URL` - Base URL for file downloads
- `PUPPETEER_EXECUTABLE_PATH` - Path to Chromium (automatically set in Docker)

### Plugin Configuration

Plugin settings are stored in `klip.koplugin/klip/config.json` and can be modified through the KOReader menu interface.

## Technical Details

### Content Processing

The server uses Puppeteer with stealth mode to fetch web pages, Mozilla Readability to extract clean article content, and epub-gen to create beautifully formatted EPUB files with custom styling optimized for e-readers.

### E-Reader Optimizations

Articles are formatted with:
- Sepia background color for comfortable reading
- Serif fonts for body text
- Proper line spacing and paragraph formatting
- Clean code block rendering with monospace fonts
- Syntax highlighting for programming content
- Automatic image optimization and centering

### Sync Client

The Go binary handles the sync process by fetching available articles from the server, downloading new content, and notifying the server to clean up downloaded files.

## Browser Extension Integration

You can build a browser extension or bookmarklet to quickly clip articles to your Klip server by sending POST requests to the `/clip` endpoint.

## Troubleshooting

### Plugin doesn't appear in KOReader

Ensure the Go binary is compiled for your device's architecture and exists at the correct path. Check KOReader's crash.log for detailed errors.

### Sync fails

Verify the server URL is accessible from your device and that the download folder exists with proper write permissions. Review crash.log for specific error messages.

### Articles fail to convert

Try using best_effort mode for JavaScript-heavy sites. Some sites may block automated access or require special handling.

## License

This project is provided as-is for personal use.
