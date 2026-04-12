# Recording Metadata Architecture

This document describes the metadata recording system in the ingfo web extension — how network requests, console logs, and browser info are captured alongside screen recordings, and how to build a replay web app on top of this data.

## Overview

When a user records their screen, the extension simultaneously captures:

1. **Video** — via `MediaRecorder` + `getDisplayMedia`/`tabCapture`
2. **Network logs** — via `chrome.debugger` (Chrome DevTools Protocol)
3. **Console logs** — via main-world script injection (monkey-patched `console.*`)
4. **Browser info** — URL, browser name/version, OS, window size, language

All metadata events are timestamped and synchronized with the video timeline.

## Data Flow

```
┌─────────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│   Content Script     │     │  Background Service  │     │  Offscreen / Recorder│
│                      │     │       Worker         │     │                     │
│  window.postMessage  │     │                      │     │                     │
│  (__INGFO_CONSOLE__) │────>│  CONSOLE_LOG_EVENT   │     │                     │
│                      │     │       │               │     │                     │
│                      │     │       ▼               │     │                     │
│                      │     │  metadataEvents[]    │     │                     │
│                      │     │       ▲               │     │                     │
│                      │     │       │               │     │                     │
│                      │     │  chrome.debugger     │     │                     │
│                      │     │  (Network.*)         │     │                     │
│                      │     │                      │     │  MediaRecorder      │
│                      │     │  browserInfo         │     │       │             │
│                      │     │  pauseIntervals[]    │     │       ▼             │
│                      │     │       │               │     │  OFFSCREEN_DATA_   │
│                      │     │       ▼               │     │  READY (video)     │
│                      │<────│  RECORDING_COMPLETE  │<────│                     │
│                      │     │  { video, metadata } │     │  OFFSCREEN_RECORD_  │
│  VideoPreviewDialog  │     │                      │     │  STARTED (startTime)│
│  Download Metadata   │     │                      │     │                     │
└─────────────────────┘     └──────────────────────┘     └─────────────────────┘
```

## Timestamp Synchronization

All events use `Date.now()` (epoch milliseconds) as their raw `timestamp`. The `elapsedMs` field is computed at recording end using:

```
elapsedMs = timestamp - recordingStartTimeMs - totalPausedTime
```

Where `totalPausedTime` is the sum of all pause intervals that occurred before the event's timestamp. This ensures:

- `elapsedMs = 0` at video start
- Paused time is excluded (events during pause still get recorded but with adjusted `elapsedMs`)
- Video playback position in seconds = `elapsedMs / 1000`

## Metadata JSON Schema

The full metadata is delivered as `RecordingMetadata`:

```typescript
interface RecordingMetadata {
  browserInfo: BrowserInfo;
  events: MetadataEvent[];         // sorted by timestamp
  recordingStartTime: number;      // epoch ms
  recordingDurationMs: number;     // total recording duration
}
```

### Browser Info

```typescript
interface BrowserInfo {
  url: string;                     // page URL at recording start
  title: string;                   // page title
  userAgent: string;               // full UA string
  platform: string;                // navigator.platform
  browserName: string;             // "Chrome", "Edge", "Brave", etc.
  browserVersion: string;          // e.g. "146.0.7680.178"
  windowWidth: number;
  windowHeight: number;
  devicePixelRatio: number;
  language: string;                // navigator.language
}
```

### Network Log Entry

```typescript
interface NetworkLogEntry {
  type: "network";
  timestamp: number;               // epoch ms
  elapsedMs: number;               // relative to video start
  data: {
    url: string;
    method: string;                // GET, POST, PUT, etc.
    status: number;                // HTTP status code (0 = failed)
    statusText: string;
    initiatorType: string;         // "script", "xmlhttprequest", "fetch", etc.
    startTime: number;             // epoch ms
    responseEnd: number;           // epoch ms
    duration: number;              // ms
    requestHeaders: Record<string, string>;
    responseHeaders: Record<string, string>;
    requestBody: string | null;    // truncated to 32KB
    responseBody: string | null;   // truncated to 32KB
    mimeType: string;
    encodedDataLength: number;     // bytes
    cached: boolean;
  };
}
```

### Console Log Entry

```typescript
interface ConsoleLogEntry {
  type: "console";
  timestamp: number;
  elapsedMs: number;
  data: {
    level: "log" | "warn" | "error" | "info" | "debug";
    args: string[];                // serialized arguments (max 10, 2KB each)
    trace: string[];               // stack trace (errors only)
  };
}
```

## Network Capture: chrome.debugger

We use the Chrome DevTools Protocol via `chrome.debugger` API to capture network requests. This provides:

- Full request/response headers
- Request/response bodies (text only; binary shows size placeholder)
- HTTP status codes and timing
- Works for all requests (fetch, XHR, images, scripts, fonts, etc.)

**Tradeoff:** Chrome shows a "debugger attached" infobar during recording. This is unavoidable with this API but acceptable for a recording/debugging tool.

**Events used:**
- `Network.requestWillBeSent` — captures URL, method, headers, body
- `Network.responseReceived` — captures status, response headers
- `Network.loadingFinished` — signals completion, triggers body fetch
- `Network.loadingFailed` — captures failed requests

**Body limits:** Request and response bodies are truncated to 32KB. Binary content is replaced with `[binary data, N bytes]`.

## Console Capture: Main-World Injection

Console methods are monkey-patched in the page's main world (not the content script's isolated world) using `chrome.scripting.executeScript({ world: "MAIN" })`.

The injected function:
1. Saves references to original `console.log/warn/error/info/debug`
2. Wraps each with a function that serializes arguments and posts `window.postMessage`
3. The content script forwards these messages to the background as `CONSOLE_LOG_EVENT`
4. Original console behavior is preserved

**Cleanup:** On recording stop, a cleanup function restores original console methods.

## Building the Replay Web App

### Video + Metadata Sync

The replay app should:

1. Load the video file (`.webm`)
2. Load the metadata JSON
3. As the video plays, filter `events` where `elapsedMs <= currentVideoTimeMs`
4. Display matching network/console entries in their respective panels

```typescript
// Pseudocode for syncing
const currentTimeMs = videoElement.currentTime * 1000;
const visibleEvents = metadata.events.filter(e => e.elapsedMs <= currentTimeMs);
const networkEvents = visibleEvents.filter(e => e.type === "network");
const consoleEvents = visibleEvents.filter(e => e.type === "console");
```

### Recommended UI Layout

```
┌─────────────────────────────────────────────────────┐
│  Video Player                    │  Info / Console   │
│                                  │  Network          │
│  [▶ ════════════════ 00:35]      │                   │
│                                  │  ┌─ Tabs ───────┐ │
│                                  │  │ Info │Console │ │
│                                  │  │ Network      │ │
│                                  │  └──────────────┘ │
└─────────────────────────────────────────────────────┘
```

**Tabs:**
- **Info** — Browser info, URL, timestamp, OS, window size
- **Console** — Filterable by level, searchable, with stack traces
- **Network** — Filterable by type (XHR, Fetch, JS, CSS, etc.), searchable, with request/response detail panel

### Replay Framework Options

- **rrweb-player** — Can be used as a timeline UI component (even without rrweb DOM recording)
- **Custom React player** — Build on top of `<video>` element with custom timeline
- **Video.js** — Mature video player with plugin system

### Data Storage Considerations

For the web app, metadata and video can be:
- Stored together in a single bundle (video + JSON sidecar)
- Stored separately with a shared recording ID
- Uploaded to cloud storage (S3/R2) with metadata in a database

### Event Format Compatibility

The metadata format uses a straightforward structure:
- Events are an array of timestamped entries
- Network entries include full request/response details
- Console entries include level, args, and trace
- `elapsedMs` enables video synchronization

## Key Files

| File | Purpose |
|------|---------|
| `apps/web-extension/lib/metadata-types.ts` | TypeScript interfaces |
| `apps/web-extension/lib/network-interceptor.ts` | chrome.debugger network capture |
| `apps/web-extension/lib/console-interceptor.ts` | Console monkey-patch + listener |
| `apps/web-extension/entrypoints/background.ts` | Metadata orchestration |
| `apps/web-extension/entrypoints/content.ts` | Console event forwarding |
| `apps/web-extension/entrypoints/content-ui/VideoPreviewDialog.tsx` | Metadata download button |

## Verification

After recording, click the "Metadata" button in the video preview dialog to download the JSON file. Inspect it to verify:

1. `browserInfo` contains correct URL, browser, OS, window size
2. `events` array contains both `"network"` and `"console"` entries
3. `elapsedMs` values are reasonable (0 at start, increasing)
4. Network entries have correct URLs, methods, status codes
5. Console entries have correct levels and serialized arguments
6. Pausing and resuming doesn't break `elapsedMs` calculation
