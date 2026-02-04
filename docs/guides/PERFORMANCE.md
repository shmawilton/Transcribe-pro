# Performance – Transcription Pro

Summary of performance optimizations and what to avoid so the app stays responsive (especially in Electron).

## Implemented optimizations

### 1. Playback time updates (throttled)

- **Issue:** `setCurrentTime()` was called every 50 ms during playback, so the store updated ~20×/s and many components re-rendered every 50 ms (Waveform, PlaybackPanel, StatusBar, MarkerTimeline, App, etc.), causing lag.
- **Change:** In `HowlerAudioEngine.startTimeUpdate()`:
  - Interval increased from 50 ms to **100 ms** (10 updates/sec).
  - Store is updated only when `currentTime` changes by at least **0.05 s** (avoids redundant updates when time hasn’t moved meaningfully).
- **File:** `src/renderer/components/audio/HowlerAudioEngine.ts`.

### 2. Pitch shifting – instant preview (Electron)

- **Issue:** Pitch change waited for native FFmpeg to finish (several seconds), so the UI felt slow and unresponsive.
- **Change:** In Electron, pitch changes use **instant preview** via Howler’s `rate()` (pitch factor = 2^(semitones/12)). The user hears the new pitch immediately. FFmpeg still runs in the background; when it finishes, we switch to the pitched file so the timeline stays correct and quality is preserved.
- **File:** `src/renderer/components/audio/HowlerAudioEngine.ts` (`setPitch` + `processPitchChange`).

### 3. Waveform decode – non-blocking load

- **Issue:** Waveform was decoded with FFmpeg WASM right after loading audio, blocking the main thread and making “loaded” feel slow (clicks/drag sluggish).
- **Change:** After `loadHowlerFromUrl()` we call **`setIsLoading(false)`** immediately, then run waveform decode in the background via **`decodeWaveformInBackground()`**. The UI is responsive as soon as audio is playable; the waveform appears when decode completes.
- **File:** `src/renderer/components/audio/HowlerAudioEngine.ts`.

## What to avoid

- **Frequent store updates:** Avoid updating the Zustand store (e.g. `setCurrentTime`, or any selector that many components use) more than ~10×/s. Prefer throttling or “min delta” before writing.
- **Heavy work on main thread after load:** Defer non-critical work (waveform, analytics, etc.) with `setTimeout(…, 0)` or fire-and-forget async so the first paint and first interaction stay fast.
- **Blocking IPC:** Pitch/FFmpeg run in the main process; the renderer only awaits the result. Don’t add heavy synchronous work on the renderer while waiting.
- **Too many store subscribers to `currentTime`:** Components that only need “current time for display” could read from `useAppStore.getState().audio.currentTime` inside `requestAnimationFrame` instead of subscribing, to avoid re-renders every tick (optional further optimization).

## References

- Electron: [Performance](https://www.electronjs.org/docs/latest/tutorial/performance), use a bundler, defer non-critical code.
- Zustand: [Prevent rerenders with useShallow](https://zustand.docs.pmnd.rs/guides/prevent-rerenders-with-use-shallow) when selectors return new objects.
- Audio: FFmpeg is used for “true” pitch-only and time-stretch; Howler `rate()` is used for instant preview in Electron.
