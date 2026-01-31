# TranscribePro Landing Page

A simple, neumorphic landing page for TranscribePro with download links for Web, Windows, and macOS versions.

## Quick Start

```bash
cd landing-page
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Build for Production

```bash
npm run build
```

Output is in the `dist/` folder. Deploy to any static hosting (Vercel, Netlify, GitHub Pages, etc.).

---

## Download Links Configuration

The landing page is pre-configured to use **GitHub Releases** for downloads. This is the recommended approach because:
- Keeps landing page repository small (no large binaries)
- Users always get the latest version
- Reduces hosting bandwidth costs

### Current Configuration (`src/App.tsx`)

```typescript
const DOWNLOADS = {
  web: 'https://transcribe-flax.vercel.app/',
  windows: 'https://github.com/shmawilton/Transcribe-pro/releases/latest/download/TranscribePro-Setup-1.0.0.exe',
  macosIntel: 'https://github.com/shmawilton/Transcribe-pro/releases/latest/download/TranscribePro-1.0.0.dmg',
  macosArm: 'https://github.com/shmawilton/Transcribe-pro/releases/latest/download/TranscribePro-1.0.0-arm64.dmg',
}
```

### Publishing Releases to GitHub

1. **Build Windows** (locally): `npm run dist:win`
2. **Build macOS** (via GitHub Actions): Push to `main` or run the workflow manually
3. **Create a GitHub Release**:
   - Go to your repo → Releases → "Create a new release"
   - Tag: `v1.0.0`
   - Upload your built files:
     - `TranscribePro-Setup-1.0.0.exe` (from `release/`)
     - `TranscribePro-1.0.0.dmg` (from GitHub Actions artifact)
     - `TranscribePro-1.0.0-arm64.dmg` (from GitHub Actions artifact)
   - Publish the release

### Alternative: Self-Host Downloads

If you prefer to host downloads with the landing page:

```
landing-page/
├── public/
│   └── downloads/
│       ├── TranscribePro-Setup-1.0.0.exe
│       ├── TranscribePro-1.0.0.dmg
│       └── TranscribePro-1.0.0-arm64.dmg
```

Then update `src/App.tsx`:

```typescript
const DOWNLOADS = {
  web: 'https://transcribe-flax.vercel.app/',
  windows: '/downloads/TranscribePro-Setup-1.0.0.exe',
  macosIntel: '/downloads/TranscribePro-1.0.0.dmg',
  macosArm: '/downloads/TranscribePro-1.0.0-arm64.dmg',
}
```

---

## PWA Icons

Create PWA icons from your logo:

1. Use an online tool like [RealFaviconGenerator](https://realfavicongenerator.net/) or [PWA Asset Generator](https://www.pwabuilder.com/imageGenerator)
2. Generate 192x192 and 512x512 PNG icons
3. Save as:
   - `public/logo-192.png`
   - `public/logo-512.png`

---

## Customization

### Colors

Edit CSS variables in `src/index.css`:

```css
:root {
  --green: #006b3f;        /* Primary accent */
  --green-light: #00a86b;  /* Secondary accent */
  --black: #1a1a1a;        /* Text */
  --red: #c8102e;          /* Minimal accent (not heavily used) */
}
```

### Content

Edit `src/App.tsx` to change:
- Hero text
- Feature descriptions
- Download URLs
- Footer content

---

## Deployment

### Vercel (Recommended)

1. Push this folder to a Git repo
2. Import to [Vercel](https://vercel.com)
3. It auto-detects Vite and deploys

### Netlify

1. Push to Git
2. Import to [Netlify](https://netlify.com)
3. Build command: `npm run build`
4. Publish directory: `dist`

### GitHub Pages

1. Build: `npm run build`
2. Push `dist/` contents to `gh-pages` branch
3. Enable GitHub Pages in repo settings
