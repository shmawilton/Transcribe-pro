# Console Debug Guide - Blank Screen Issue

## 🔍 Comprehensive Logging Added

I've added detailed console logging throughout the application to help identify where the blank screen issue occurs.

---

## 📋 What to Look For in Console

### 1. **App Initialization**
```
[App] Component rendering...
[App] Theme: dark
[App] Setting theme attribute: dark
[App] Component mounted
[App] About to render JSX
```

### 2. **PlaybackPanel Initialization**
```
[PlaybackPanel] Component rendering...
[useAudioEngine] Hook called
[useAudioEngine] Initializing AudioEngine
[useAudioEngine] AudioEngine initialized: success
[PlaybackPanel] Hook values: { isLoading: false, error: null, ... }
[PlaybackPanel] Audio state: { file: 'null', duration: 0, ... }
[PlaybackPanel] Component mounted
[PlaybackPanel] About to render JSX
```

### 3. **Loading Audio File - Step by Step**

#### Step 1: Button Click
```
[PlaybackPanel] handleLoadAudio called
[PlaybackPanel] Step 1: Clearing previous errors
```

#### Step 2: Resume Audio Context
```
[PlaybackPanel] Step 2: Resuming audio context
[PlaybackPanel] Step 2: Audio context resumed
```

#### Step 3: File Picker
```
[PlaybackPanel] Step 3: Opening file picker
[PlaybackPanel] Step 3: File picker result: { name: 'file.mp3', size: 501061, type: 'audio/mpeg' }
```

#### Step 4: Validation
```
[PlaybackPanel] Step 4: Validating file
[PlaybackPanel] Step 4: Validation result: { valid: true }
```

#### Step 5: Loading into AudioEngine
```
[PlaybackPanel] Step 5: Loading file into AudioEngine
[useAudioEngine] loadFile called with file: { name: 'file.mp3', ... }
[useAudioEngine] Setting loading state to true
[useAudioEngine] Calling engine.loadAudioFile()
```

#### Step 6: AudioEngine Processing
```
[AudioEngine] ===== LOAD AUDIO FILE START =====
[AudioEngine] File info: { name: 'file.mp3', size: 501061, type: 'audio/mpeg' }
[AudioEngine] Step 1: Updating store with file
[Store] setAudioFile called: { name: 'file.mp3', size: 501061 }
[Store] setAudioFile - new state: { hasFile: true, isLoaded: true }
[AudioEngine] Step 1: Store updated, checking state...
[AudioEngine] Store state after file: { hasFile: true, fileName: 'file.mp3', isLoaded: true }
[AudioEngine] Step 2: Reading file as ArrayBuffer
[AudioEngine] Step 2: ArrayBuffer read, size: 501061
[AudioEngine] Step 3: Starting audio decode...
[AudioEngine] Step 3: Audio decode completed successfully
[AudioEngine] Step 4: Storing decoded buffer
[AudioEngine] Step 4: Buffer stored in engine
[AudioEngine] Step 5: Updating store with buffer and duration
[Store] setAudioBuffer called: { hasBuffer: true, sampleRate: 44100, duration: 11.3, length: 498432 }
[Store] setAudioBuffer - new state: { hasBuffer: true, isLoaded: true, sampleRate: 44100 }
[Store] setDuration: 11.3
[AudioEngine] Step 5a: Buffer updated in store
[AudioEngine] Step 5b: Duration updated in store
[AudioEngine] Store state after buffer: { hasBuffer: true, duration: 11.3, isLoaded: true, sampleRate: 44100 }
[AudioEngine] Audio file loaded successfully: { duration: 11.3, sampleRate: 44100, ... }
[AudioEngine] Step 6: Initializing audio nodes
[AudioEngine] Audio nodes initialized
[AudioEngine] Step 7: Resetting playback state
[AudioEngine] Step 7: Playback state reset
[AudioEngine] ===== LOAD AUDIO FILE COMPLETE =====
```

#### Step 7: Completion
```
[useAudioEngine] engine.loadAudioFile() completed successfully
[useAudioEngine] Store state after load: { isLoaded: true, duration: 11.3, hasBuffer: true }
[useAudioEngine] Setting loading state to false
[PlaybackPanel] Step 5: File loaded successfully!
[PlaybackPanel] Load complete, checking store state...
[PlaybackPanel] Store state after load: { audio: {...}, isLoaded: true, duration: 11.3 }
```

---

## 🚨 Error Patterns to Identify

### Pattern 1: Stops at File Picker
```
[PlaybackPanel] Step 3: Opening file picker
[PlaybackPanel] Step 3: File picker result: null
[PlaybackPanel] No file selected, returning
```
**Issue:** User cancelled file selection (not an error)

### Pattern 2: Validation Fails
```
[PlaybackPanel] Step 4: Validating file
[PlaybackPanel] Step 4: Validation result: { valid: false, error: '...' }
[PlaybackPanel] File validation failed: ...
```
**Issue:** File format or size issue

### Pattern 3: Decode Error
```
[AudioEngine] Step 3: Starting audio decode...
[AudioEngine] Decode error details: { error: ..., errorName: 'EncodingError', ... }
[AudioEngine] Failed to decode audio file...
```
**Issue:** File is corrupted or unsupported format

### Pattern 4: Store Update Fails
```
[Store] setAudioBuffer called: ...
[Store] setAudioBuffer - new state: { hasBuffer: false, ... }
```
**Issue:** Store update didn't work correctly

### Pattern 5: Component Render Error
```
[PlaybackPanel] About to render JSX
[PlaybackPanel] Render error: ...
[PlaybackPanel] Render error stack: ...
```
**Issue:** React rendering error (caught by error boundary)

### Pattern 6: Missing Logs (Silent Failure)
If logs stop appearing at a certain step, that's where the issue is:
- If logs stop after "Step 5: Loading file into AudioEngine" → Issue in AudioEngine
- If logs stop after "Step 6: Initializing audio nodes" → Issue in node initialization
- If logs stop after "Step 7: Resetting playback state" → Issue in stop() method

---

## 🔧 How to Use This Guide

1. **Open DevTools Console** (Ctrl+Shift+I or F12)
2. **Clear the console** (right-click → Clear console)
3. **Load an audio file** (click "Load Audio" button)
4. **Watch the logs** - they should follow the pattern above
5. **Identify where it stops** - the last log message shows where the issue occurs

---

## 📊 Expected Log Flow

```
[App] Component rendering...
[PlaybackPanel] Component rendering...
[PlaybackPanel] handleLoadAudio called
[PlaybackPanel] Step 1-4: ... (file selection & validation)
[PlaybackPanel] Step 5: Loading file into AudioEngine
[AudioEngine] ===== LOAD AUDIO FILE START =====
[AudioEngine] Step 1-7: ... (all steps complete)
[AudioEngine] ===== LOAD AUDIO FILE COMPLETE =====
[PlaybackPanel] Step 5: File loaded successfully!
[PlaybackPanel] Component rendering... (re-render with loaded state)
```

---

## 🐛 Common Issues & Solutions

### Issue: Logs stop at "Step 2: Resuming audio context"
**Solution:** Audio context might be suspended. Check browser autoplay policy.

### Issue: Logs stop at "Step 3: Opening file picker"
**Solution:** File picker might be blocked. Check browser permissions.

### Issue: Logs stop at "Step 5: Loading file into AudioEngine"
**Solution:** Check if AudioEngine is initialized. Look for "[useAudioEngine] AudioEngine initialized: success"

### Issue: Decode error appears
**Solution:** File might be corrupted. Try a different audio file.

### Issue: Store updates but component doesn't re-render
**Solution:** Check if "[PlaybackPanel] Component rendering..." appears after store update.

---

## 📝 What to Report

If the screen still goes blank, please share:

1. **The last log message** before the screen goes blank
2. **Any error messages** (red text in console)
3. **The complete log sequence** from button click to blank screen
4. **Browser/Electron version**
5. **File format and size** you're trying to load

This will help identify the exact point of failure! 🎯


