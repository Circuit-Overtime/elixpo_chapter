# The Image Pipeline: From Pixels to Canvas to Cloud

Images are the heaviest objects on any canvas. A single uncompressed screenshot can weigh 5MB — multiply that by ten images and you've blown past localStorage limits, clogged autosave, and made collaboration painful. Here's how LixSketch handles images across every entry point: file uploads, AI generation, clipboard pastes, and frame backgrounds.

## The Problem

Images can arrive from four different sources:

1. **File upload** — user picks a PNG/JPG from their device
2. **AI generation** — Pollinations API returns a base64 data URI
3. **Clipboard paste** — user pastes a screenshot or copied image (Ctrl+V)
4. **Frame background** — user sets an image as a frame's background fill

All four share the same fundamental problem: the raw image data is a massive base64 string that needs to live on an SVG canvas, persist across page reloads, and sync to the cloud — without killing performance.

## The Pipeline

Every image, regardless of source, flows through the same async pipeline:

```
Raw Data → Compress → Place on Canvas → Upload to Cloudinary → Replace href with URL
```

### Step 1: Adaptive Compression

Before anything touches the canvas, images pass through our `compressImage()` utility:

- **Max dimension**: 1920px — anything larger gets scaled down proportionally
- **Target size**: 300KB — achieved by iteratively reducing JPEG quality
- **Quality floor**: 0.4 — we never go below this to avoid visible artifacts
- **Transparency detection**: Images with alpha channels stay as PNG (no quality reduction)
- **Frame backgrounds** get even more aggressive compression: 1280px max, quality 0.5

The compression runs entirely in the browser using a temporary `<canvas>` element — no server round-trip needed.

### Step 2: Canvas Placement

The compressed image (still a base64 data URI at this point) is placed on the SVG canvas as an `<image>` element. The user sees it immediately — no waiting for upload.

```
<image href="data:image/jpeg;base64,/9j/4AAQ..." x="100" y="200" width="400" height="300" />
```

This gives instant visual feedback while the upload happens in the background.

### Step 3: Signed Upload to Cloudinary

The upload is a three-phase process:

1. **Sign** — browser requests a signed upload URL from our API (`/api/images/sign`). The server generates an HMAC-SHA256 signature using the Cloudinary API secret, scoped to the user's session folder (`lixsketch/{sessionId}/img_{timestamp}`).

2. **Upload** — browser POSTs the compressed blob directly to Cloudinary's upload endpoint with the signature. This is a direct browser-to-Cloudinary transfer — our server never sees the image data.

3. **Replace** — once Cloudinary returns the CDN URL, the `<image>` element's `href` is swapped from the base64 data URI to the Cloudinary URL:

```
<image href="https://res.cloudinary.com/elixpo/image/upload/v.../lixsketch/session/img.jpg" ... />
```

### Step 4: Autosave Benefits

This swap is the key to the entire system. When autosave serializes the canvas every 10 seconds:

- **Before upload**: `href` contains base64 (large, but functional)
- **After upload**: `href` contains a URL (tiny, just a string)

This means localStorage never accumulates megabytes of base64 data. A canvas with 20 images might serialize to just 50KB instead of 50MB.

## Source-Specific Handling

### File Upload
User clicks the image tool → picks a file → `FileReader` converts to data URI → pipeline kicks in. We also enforce a per-room 5MB total limit to prevent runaway storage.

### AI Generation
The Pollinations API returns a base64 image in the response. When the user clicks "Place on Canvas" in the generate modal, the image is placed and immediately routed through `uploadImageToCloudinary()`. The loading indicator (a pulsing yellow icon) shows on the image until the upload completes.

### Clipboard Paste
We listen for the browser's `paste` event globally. When the clipboard contains image data:

```js
document.addEventListener('paste', (e) => {
  for (const item of e.clipboardData.items) {
    if (item.type.startsWith('image/')) {
      const blob = item.getAsFile()
      // → FileReader → data URI → place → upload
    }
  }
})
```

The pasted image appears at the center of the current viewport.

### Frame Backgrounds
Frames support background images with fit modes (cover, contain, stretch). These images get extra-aggressive compression since they're decorative backgrounds, not precision content. The compressed data URI is stored directly on the frame's `_frameImageURL` property and persists through serialization.

## Upload Cancellation

If a user deletes an image while it's still uploading, we need to abort the in-flight request. Each `ImageShape` has an `AbortController`:

```js
imageShape.uploadAbortController = new AbortController()
const signal = imageShape.uploadAbortController.signal

// Every fetch in the pipeline checks: if (signal.aborted) return
```

When the shape is deleted, the controller is aborted and the upload silently stops.

## Loading Indicators

During upload, each image shows a small animated indicator (a pulsing icon in the top-left corner). The indicator:
- Appears when upload starts (`uploadStatus = 'uploading'`)
- Follows the image if it's moved
- Disappears when upload succeeds or fails
- Uses `pointer-events: none` so it doesn't interfere with selection

## Room Size Tracking

We track total image bytes per room via `window.__roomImageBytesUsed`. Each uploaded image's compressed size is added to this counter. When a user tries to add an image that would exceed 5MB total, they get a clear error message showing current and attempted usage.

## The Serialization Cycle

Here's the full lifecycle of an image through save/load:

```
Create → base64 href → upload → Cloudinary URL href
                                        ↓
                              Autosave to localStorage (tiny URL string)
                                        ↓
                              Page reload → deserialize → <image href="cloudinary-url" />
                                        ↓
                              Image loads directly from CDN (no re-upload needed)
```

On reload, images load from Cloudinary's CDN — fast, cached, and globally distributed. The canvas restore is nearly instant because localStorage only stores URLs, not pixel data.

## Key Design Decisions

1. **Compress before upload, not after** — saves bandwidth and storage costs
2. **Direct browser-to-Cloudinary upload** — our server never handles image blobs, only signs URLs
3. **Immediate visual feedback** — image appears on canvas instantly, upload happens in background
4. **URL replacement is atomic** — one `setAttribute('href', url)` swap, no intermediate states
5. **Same pipeline for all sources** — file uploads, AI images, clipboard pastes, and frame backgrounds all go through identical compress → upload → replace flow
6. **Graceful degradation** — if upload fails, the base64 image still works (just takes more localStorage space)

This architecture lets LixSketch handle dozens of images per canvas without performance degradation, while keeping autosave reliable and cloud sync efficient.
