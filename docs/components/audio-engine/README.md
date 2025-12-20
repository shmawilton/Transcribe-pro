# AudioEngine Component Documentation

## Overview

The AudioEngine is the core audio processing component responsible for loading, decoding, and playing audio files in the TRANSCRIBE PRO application. It provides a reliable, cross-platform audio solution using Howler.js for Electron desktop compatibility.

**Component Owner:** Wilton  
**Branch:** `wilton/audio-engine`  
**File:** `src/renderer/components/audio/HowlerAudioEngine.ts`

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [API Reference](#api-reference)
- [Usage Examples](#usage-examples)
- [State Management](#state-management)
- [Error Handling](#error-handling)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

---

## Features

### ✅ Completed Features

1. **Audio File Loading**
   - Supports MP3, WAV, OGG, FLAC, M4A, AAC, WEBM formats
   - Automatic format detection and validation
   - Blob URL creation for reliable file handling

2. **Playback Controls**
   - `play()` - Start/resume playback
   - `pause()` - Pause playback at current position
   - `stop()` - Stop and reset to beginning
   - `seek(time)` - Jump to specific time position

3. **Real-time Position Tracking**
   - Updates Zustand store every 100ms during playback
   - Accurate time tracking for UI synchronization

4. **Zustand Store Integration**
   - Automatic state updates for:
     - `audio.file` - Current audio file
     - `audio.duration` - Total duration in seconds
     - `audio.currentTime` - Current playback position
     - `audio.isPlaying` - Playback state
     - `audio.isLoaded` - Load status
     - `audio.buffer` - AudioBuffer (for compatibility)

5. **Error Handling**
   - Unsupported format detection
   - Corrupted file validation
   - Timeout protection (30 seconds)
   - Comprehensive error messages

6. **Electron Compatibility**
   - Uses Howler.js for reliable desktop app support
   - HTML5 Audio fallback for maximum compatibility
   - Automatic audio context management

---

## Architecture

### Technology Stack

- **Howler.js** - Cross-platform audio library
- **Zustand** - State management
- **TypeScript** - Type safety

### Component Structure

```
src/renderer/components/audio/
├── HowlerAudioEngine.ts      # Main audio engine (Howler.js based)
├── AudioEngine.ts             # Original Web Audio API implementation (legacy)
├── useAudioEngine.ts          # React hook for easy component integration
├── audioFilePicker.ts         # File picker utility
└── AudioEngineAPI.ts          # Public API documentation
```

### Why Howler.js?

The original `AudioEngine.ts` used raw Web Audio API which had reliability issues in Electron:
- `decodeAudioData()` would hang indefinitely
- AudioContext suspension issues
- Format compatibility problems

**HowlerAudioEngine** solves these by:
- Using HTML5 Audio element (native Electron support)
- Automatic format fallbacks
- Built-in error recovery
- Cross-platform compatibility

---

## API Reference

### Class: `HowlerAudioEngine`

#### Methods

##### `loadAudioFile(file: File): Promise<void>`

Loads and decodes an audio file.

**Parameters:**
- `file: File` - Audio file to load

**Returns:** `Promise<void>`

**Throws:**
- `Error` - If file is unsupported, corrupted, or cannot be loaded

**Example:**
```typescript
const engine = getHowlerAudioEngine();
await engine.loadAudioFile(file);
```

---

##### `play(): Promise<void>`

Starts or resumes audio playback.

**Returns:** `Promise<void>`

**Throws:**
- `Error` - If no audio is loaded

**Example:**
```typescript
await engine.play();
```

---

##### `pause(): void`

Pauses audio playback at current position.

**Example:**
```typescript
engine.pause();
```

---

##### `stop(): void`

Stops playback and resets to beginning.

**Example:**
```typescript
engine.stop();
```

---

##### `seek(time: number): Promise<void>`

Seeks to a specific time position.

**Parameters:**
- `time: number` - Time in seconds (0 to duration)

**Example:**
```typescript
await engine.seek(30.5); // Jump to 30.5 seconds
```

---

##### `getCurrentTime(): number`

Gets current playback position.

**Returns:** `number` - Current time in seconds

---

##### `getDuration(): number`

Gets total audio duration.

**Returns:** `number` - Duration in seconds

---

##### `isAudioLoaded(): boolean`

Checks if audio is loaded and ready.

**Returns:** `boolean`

---

##### `getIsPlaying(): boolean`

Checks if audio is currently playing.

**Returns:** `boolean`

---

##### `isFormatSupported(file: File): boolean`

Checks if file format is supported.

**Parameters:**
- `file: File` - File to check

**Returns:** `boolean`

---

##### `resumeAudioContext(): Promise<void>`

Resumes audio context (handled automatically by Howler).

---

##### `dispose(): void`

Cleans up resources and unloads audio.

---

### React Hook: `useAudioEngine()`

Provides easy access to AudioEngine in React components.

**Returns:**
```typescript
{
  audioEngine: HowlerAudioEngine | null,
  isLoading: boolean,
  error: string | null,
  loadFile: (file: File) => Promise<void>,
  play: () => Promise<void>,
  pause: () => void,
  stop: () => void,
  seek: (time: number) => Promise<void>,
  isAudioLoaded: boolean,
  isPlaying: boolean,
  resumeAudioContext: () => Promise<void>
}
```

**Example:**
```typescript
const { loadFile, play, pause, stop, isAudioLoaded } = useAudioEngine();
```

---

## Usage Examples

### Basic Usage in React Component

```typescript
import { useAudioEngine } from '../audio/useAudioEngine';
import { pickAudioFile } from '../audio/audioFilePicker';

function PlaybackPanel() {
  const { loadFile, play, pause, stop, isAudioLoaded, isLoading } = useAudioEngine();
  
  const handleLoad = async () => {
    const file = await pickAudioFile();
    if (file) {
      await loadFile(file);
    }
  };
  
  return (
    <div>
      <button onClick={handleLoad} disabled={isLoading}>
        Load Audio
      </button>
      {isAudioLoaded && (
        <>
          <button onClick={play}>Play</button>
          <button onClick={pause}>Pause</button>
          <button onClick={stop}>Stop</button>
        </>
      )}
    </div>
  );
}
```

### Direct Class Usage

```typescript
import { getHowlerAudioEngine } from './HowlerAudioEngine';

const engine = getHowlerAudioEngine();

// Load file
await engine.loadAudioFile(file);

// Play
await engine.play();

// Pause
engine.pause();

// Seek
await engine.seek(30);

// Get info
const duration = engine.getDuration();
const currentTime = engine.getCurrentTime();
```

---

## State Management

### Zustand Store Integration

The AudioEngine automatically updates the Zustand store:

```typescript
interface AudioState {
  file: File | null;
  buffer: AudioBuffer | undefined;
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  isLoaded: boolean;
  sampleRate: number | undefined;
}
```

### Store Updates

- **On Load:** `file`, `duration`, `buffer`, `isLoaded`, `sampleRate`
- **On Play:** `isPlaying = true`
- **On Pause:** `isPlaying = false`, `currentTime = paused position`
- **On Stop:** `isPlaying = false`, `currentTime = 0`
- **During Playback:** `currentTime` updated every 100ms

### Reading Store State

```typescript
import { useAppStore } from '../../store/store';

const audio = useAppStore((state) => state.audio);
console.log(audio.duration, audio.currentTime, audio.isPlaying);
```

---

## Error Handling

### Error Types

1. **Unsupported Format**
   ```typescript
   Error: AudioEngine: Unsupported audio format. File: audio.xyz, Type: audio/xyz
   ```

2. **Corrupted File**
   ```typescript
   Error: AudioEngine: File is empty or corrupted
   ```

3. **Load Timeout**
   ```typescript
   Error: Audio loading timed out after 30 seconds
   ```

4. **Load Error**
   ```typescript
   Error: Failed to load audio: [Howler error message]
   ```

### Error Handling Example

```typescript
try {
  await engine.loadAudioFile(file);
} catch (error) {
  if (error.message.includes('Unsupported')) {
    // Show format error to user
  } else if (error.message.includes('corrupted')) {
    // Show corruption error
  } else if (error.message.includes('timed out')) {
    // Show timeout error
  } else {
    // Show generic error
  }
}
```

### Store Reset on Error

On any error, the store is automatically reset to prevent inconsistent state:
- `file = null`
- `duration = 0`
- `currentTime = 0`
- `isPlaying = false`
- `buffer = undefined`

---

## Testing

### Manual Testing Checklist

- [x] Load MP3 file → Audio loads successfully
- [x] Load WAV file → Audio loads successfully
- [x] Load unsupported format → Error message shown
- [x] Play → Audio plays, `isPlaying = true`
- [x] Pause → Audio pauses, `isPlaying = false`
- [x] Stop → Audio stops, position resets to 0
- [x] Seek → Position jumps to correct time
- [x] Time updates → `currentTime` updates every 100ms
- [x] Store updates → All state changes reflected in store
- [x] Electron compatibility → Works in desktop app

### Testing in Electron

1. Start dev server: `npm run dev`
2. Load audio file in Electron app
3. Verify console logs show successful load
4. Test play/pause/stop/seek
5. Verify UI updates reflect state changes

---

## Troubleshooting

### Audio Won't Load

**Problem:** File loads but doesn't play

**Solutions:**
1. Check file format is supported
2. Verify file is not corrupted
3. Check console for error messages
4. Try converting to MP3 or WAV

### Playback Doesn't Start

**Problem:** `play()` called but nothing happens

**Solutions:**
1. Ensure audio is loaded (`isAudioLoaded() === true`)
2. Check if audio context is suspended (Howler handles this automatically)
3. Verify store state: `audio.isPlaying` should be `true`

### Time Updates Not Working

**Problem:** `currentTime` not updating during playback

**Solutions:**
1. Check if `isPlaying` is `true`
2. Verify time update interval is running (check console logs)
3. Ensure Howler instance is not null

### Electron-Specific Issues

**Problem:** Works in browser but not in Electron

**Solutions:**
1. Use `HowlerAudioEngine` (not `AudioEngine`)
2. Ensure `html5: true` is set in Howler config
3. Check Electron main process has audio flags enabled

---

## Related Documentation

- [AudioEngine API Reference](./API.md)
- [Implementation Details](./IMPLEMENTATION.md)
- [Testing Guide](./TESTING.md)
- [Electron Audio Setup](../../../ELECTRON_AUDIO_SETUP.md)

---

## Changelog

### v1.0.0 (Current)
- ✅ Initial implementation with Howler.js
- ✅ Full playback controls (play, pause, stop, seek)
- ✅ Real-time position tracking (100ms updates)
- ✅ Zustand store integration
- ✅ Error handling and validation
- ✅ Electron compatibility

---

## Future Enhancements

- [ ] Waveform visualization support
- [ ] Audio effects (pitch, speed, reverb)
- [ ] Multiple audio track support
- [ ] Audio recording capabilities
- [ ] Export audio functionality

---

**Last Updated:** 2025-12-20  
**Maintained by:** Wilton

