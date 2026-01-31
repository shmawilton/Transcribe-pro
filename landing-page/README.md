# TranscribePro Landing Page

A neumorphic landing page for TranscribePro with video demos.

## Quick Start

```bash
cd landing-page
npm install
npm run dev
```

## Build

```bash
npm run build
```

Output: `dist/` folder. Deploy to Vercel, Netlify, or any static host.

---

## Where to Put Files

```
landing-page/
├── public/
│   ├── downloads/
│   │   ├── TranscribePro-Setup.exe      ← Windows installer
│   │   ├── TranscribePro-arm64.dmg      ← macOS Apple Silicon
│   │   └── TranscribePro.dmg            ← macOS Intel
│   ├── videos/
│   │   ├── demo-desktop.mp4             ← Desktop app demo video
│   │   └── demo-mobile.mp4              ← Mobile/PWA demo video
│   └── logo.png
```

---

## Video Demo Files

Place your recorded demo videos in `public/videos/`:

| File | Description | Recommended Size |
|------|-------------|------------------|
| `demo-desktop.mp4` | Desktop app walkthrough | 1280×800 (16:10) |
| `demo-mobile.mp4` | Mobile/PWA walkthrough | 390×844 (phone) |

**Recording tips:**
- Keep videos short: 15-30 seconds
- Show key features: load audio → add markers → playback controls → export
- Use MP4 with H.264 codec
- Compress to <10MB each for fast loading

**Recording tools:**
- **macOS**: QuickTime Player, OBS Studio
- **Windows**: Xbox Game Bar, OBS Studio
- **Mobile**: Built-in screen recorder

---

## Downloads

### Getting the Files

**Windows** (build locally):
```bash
npm run dist:win
# Copy: release/TranscribePro Setup 1.0.0.exe → public/downloads/TranscribePro-Setup.exe
```

**macOS** (from GitHub Actions):
1. Push to main → Actions → Build macOS → Download artifact
2. Copy DMGs to `public/downloads/`

---

## Customization

Edit `src/App.tsx`:

- `DOWNLOADS.web` - Your web app URL
- Download file names if different

Edit `src/index.css` for colors.

---

## Deployment Notes

Since downloads are served directly, your hosting must support large files:
- **Vercel**: 100MB limit (free tier)
- **Netlify**: 100MB limit
- **Cloudflare Pages**: 25MB limit per file

If your DMGs exceed limits, use external hosting (S3, R2, etc.) and update the URLs in `App.tsx`.
