# AudioEngine API Reference

Complete API documentation for the AudioEngine component.

## Table of Contents

- [HowlerAudioEngine Class](#howleraudioengine-class)
- [useAudioEngine Hook](#useaudioengine-hook)
- [Utility Functions](#utility-functions)
- [Type Definitions](#type-definitions)

---

## HowlerAudioEngine Class

### Constructor

```typescript
constructor()
```

Creates a new AudioEngine instance. Use `getHowlerAudioEngine()` to get the singleton.

---

### Methods

#### `loadAudioFile(file: File): Promise<void>`

Loads and decodes an audio file.

**Parameters:**
- `file: File` - The audio file to load

**Returns:** `Promise<void>`

**Throws:**
- `Error` - If file format is unsupported
- `Error` - If file is corrupted or cannot be decoded
- `Error` - If loading times out (30 seconds)

**Example:**
```typescript
const engine = getHowlerAudioEngine();
const file = await pickAudioFile();
await engine.loadAudioFile(file);
```

**Store Updates:**
- `audio.file` - Set to loaded file
- `audio.duration` - Set to audio duration
- `audio.buffer` - Set to AudioBuffer (dummy for compatibility)
- `audio.isLoaded` - Set to `true`
- `audio.sampleRate` - Set to sample rate

---

#### `play(): Promise<void>`

Starts or resumes audio playback.

**Returns:** `Promise<void>`

**Throws:**
- `Error` - If no audio is loaded

**Example:**
```typescript
await engine.play();
```

**Store Updates:**
- `audio.isPlaying` - Set to `true`
- `audio.currentTime` - Updated every 100ms during playback

---

#### `pause(): void`

Pauses audio playback at the current position.

**Example:**
```typescript
engine.pause();
```

**Store Updates:**
- `audio.isPlaying` - Set to `false`
- `audio.currentTime` - Set to paused position

---

#### `stop(): void`

Stops playback and resets to the beginning.

**Example:**
```typescript
engine.stop();
```

**Store Updates:**
- `audio.isPlaying` - Set to `false`
- `audio.currentTime` - Set to `0`

---

#### `seek(time: number): Promise<void>`

Seeks to a specific time position in the audio.

**Parameters:**
- `time: number` - Time in seconds (will be clamped to 0-duration range)

**Example:**
```typescript
await engine.seek(30.5); // Jump to 30.5 seconds
```

**Store Updates:**
- `audio.currentTime` - Set to seek position

---

#### `getCurrentTime(): number`

Gets the current playback position.

**Returns:** `number` - Current time in seconds (0 if not playing)

**Example:**
```typescript
const currentTime = engine.getCurrentTime();
console.log(`Playing at ${currentTime} seconds`);
```

---

#### `getDuration(): number`

Gets the total duration of the loaded audio.

**Returns:** `number` - Duration in seconds (0 if no audio loaded)

**Example:**
```typescript
const duration = engine.getDuration();
console.log(`Audio is ${duration} seconds long`);
```

---

#### `isAudioLoaded(): boolean`

Checks if audio is loaded and ready for playback.

**Returns:** `boolean` - `true` if audio is loaded

**Example:**
```typescript
if (engine.isAudioLoaded()) {
  await engine.play();
}
```

---

#### `getIsPlaying(): boolean`

Checks if audio is currently playing.

**Returns:** `boolean` - `true` if playing

**Example:**
```typescript
if (engine.getIsPlaying()) {
  engine.pause();
}
```

---

#### `isFormatSupported(file: File): boolean`

Checks if a file format is supported.

**Parameters:**
- `file: File` - File to check

**Returns:** `boolean` - `true` if format is supported

**Supported Formats:**
- MP3 (`.mp3`)
- WAV (`.wav`)
- OGG (`.ogg`)
- FLAC (`.flac`)
- M4A (`.m4a`)
- AAC (`.aac`)
- WEBM (`.webm`)

**Example:**
```typescript
if (engine.isFormatSupported(file)) {
  await engine.loadAudioFile(file);
} else {
  console.error('Unsupported format');
}
```

---

#### `resumeAudioContext(): Promise<void>`

Resumes audio context. Handled automatically by Howler.js, but kept for API compatibility.

**Returns:** `Promise<void>`

---

#### `getAudioBuffer(): AudioBuffer | null`

Gets the AudioBuffer. Returns `null` for HowlerAudioEngine (not available).

**Returns:** `AudioBuffer | null`

**Note:** This is kept for API compatibility. Howler.js doesn't expose AudioBuffer directly.

---

#### `getAnalyserNode(): AnalyserNode | null`

Gets the analyser node. Returns `null` for HowlerAudioEngine (not available).

**Returns:** `AnalyserNode | null`

**Note:** This is kept for API compatibility. Howler.js doesn't expose AnalyserNode directly.

---

#### `dispose(): void`

Cleans up resources and unloads audio.

**Example:**
```typescript
engine.dispose();
```

**Effects:**
- Stops playback
- Unloads Howler instance
- Revokes blob URL
- Clears time update interval

---

## useAudioEngine Hook

### Usage

```typescript
const {
  audioEngine,
  isLoading,
  error,
  loadFile,
  play,
  pause,
  stop,
  seek,
  isAudioLoaded,
  isPlaying,
  resumeAudioContext
} = useAudioEngine();
```

### Return Values

#### `audioEngine: HowlerAudioEngine | null`

Reference to the AudioEngine instance. `null` if not initialized.

---

#### `isLoading: boolean`

Loading state. `true` while loading a file.

**Example:**
```typescript
{isLoading && <div>Loading audio...</div>}
```

---

#### `error: string | null`

Error message if loading failed. `null` if no error.

**Example:**
```typescript
{error && <div>Error: {error}</div>}
```

---

#### `loadFile: (file: File) => Promise<void>`

Loads an audio file. Wraps `engine.loadAudioFile()` with error handling.

**Example:**
```typescript
const file = await pickAudioFile();
if (file) {
  await loadFile(file);
}
```

---

#### `play: () => Promise<void>`

Plays audio. Wraps `engine.play()`.

**Example:**
```typescript
await play();
```

---

#### `pause: () => void`

Pauses audio. Wraps `engine.pause()`.

**Example:**
```typescript
pause();
```

---

#### `stop: () => void`

Stops audio. Wraps `engine.stop()`.

**Example:**
```typescript
stop();
```

---

#### `seek: (time: number) => Promise<void>`

Seeks to position. Wraps `engine.seek()`.

**Example:**
```typescript
await seek(30);
```

---

#### `isAudioLoaded: boolean`

Whether audio is loaded. Wraps `engine.isAudioLoaded()`.

**Example:**
```typescript
{isAudioLoaded && <button onClick={play}>Play</button>}
```

---

#### `isPlaying: boolean`

Whether audio is playing. Wraps `engine.getIsPlaying()`.

**Example:**
```typescript
{isPlaying ? (
  <button onClick={pause}>Pause</button>
) : (
  <button onClick={play}>Play</button>
)}
```

---

#### `resumeAudioContext: () => Promise<void>`

Resumes audio context. Wraps `engine.resumeAudioContext()`.

---

## Utility Functions

### `getHowlerAudioEngine(): HowlerAudioEngine`

Gets or creates the singleton AudioEngine instance.

**Returns:** `HowlerAudioEngine` - The singleton instance

**Example:**
```typescript
const engine = getHowlerAudioEngine();
```

---

### `pickAudioFile(): Promise<File | null>`

Opens a file picker dialog for selecting an audio file.

**Returns:** `Promise<File | null>` - Selected file or `null` if cancelled

**Example:**
```typescript
const file = await pickAudioFile();
if (file) {
  await engine.loadAudioFile(file);
}
```

---

### `validateAudioFile(file: File): { valid: boolean; error?: string }`

Validates an audio file before loading.

**Parameters:**
- `file: File` - File to validate

**Returns:** `{ valid: boolean; error?: string }`

**Example:**
```typescript
const validation = validateAudioFile(file);
if (!validation.valid) {
  console.error(validation.error);
}
```

---

## Type Definitions

### Supported Formats

```typescript
type SupportedFormat = 'mp3' | 'wav' | 'ogg' | 'flac' | 'm4a' | 'aac' | 'webm';
```

---

## Error Messages

Common error messages and their meanings:

| Error Message | Meaning | Solution |
|--------------|---------|----------|
| `No audio loaded` | `play()` called before loading | Load audio file first |
| `Unsupported audio format` | File format not supported | Use MP3, WAV, OGG, FLAC, M4A, AAC, or WEBM |
| `File is empty or corrupted` | File cannot be read | Check file integrity |
| `Audio loading timed out` | Loading took > 30 seconds | Try smaller file or different format |
| `Failed to load audio` | Howler.js load error | Check file format and integrity |

---

## Store State Interface

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

---

**Last Updated:** 2025-12-20

