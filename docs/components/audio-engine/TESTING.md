# AudioEngine Testing Guide

## ✅ Confirmation: AudioEngine Accessible from PlaybackPanel

**Status:** ✅ **CONFIRMED**

The AudioEngine is fully accessible from PlaybackPanel via the `useAudioEngine()` hook.

### Implementation Details

**File:** `src/renderer/components/controls/PlaybackPanel.tsx`

**Access Method:**
```typescript
import { useAudioEngine } from '../audio/useAudioEngine';

const { 
  loadFile,    // Load audio file
  play,        // Play audio
  pause,       // Pause audio
  stop,        // Stop audio
  seek,        // Seek to position
  isAudioLoaded,
  isPlaying,
  isLoading,
  error
} = useAudioEngine();
```

**Store Integration:**
- Automatically reads from: `useAppStore((state) => state.audio)`
- Current time updates every 100ms automatically
- No manual store updates needed

---

## 🧪 Testing Instructions

### Test Flow: Load → Play → Pause

#### Step 1: Start the Application

```bash
npm run dev
```

The Electron app should open with the UI visible.

#### Step 2: Locate PlaybackPanel

The PlaybackPanel is in the **bottom-left panel** of the application:
- Left panel (red border) = Playback Controls
- You should see "Playback Controls" text

#### Step 3: Load Audio File

1. **Click the "Load Audio" button** in PlaybackPanel
2. **File picker dialog opens**
3. **Select an audio file** (MP3, WAV, OGG, FLAC, M4A, or AAC)
4. **Wait for loading** (button shows "Loading...")

**Expected Results:**
- ✅ Button text changes to "Loading..." then back to "Load Audio"
- ✅ File name appears below controls
- ✅ Time display shows "0:00 / X:XX" (where X:XX is duration)
- ✅ Play, Pause, Stop buttons become enabled
- ✅ No error messages

**If Error Occurs:**
- Error message appears in red text
- Check console for detailed error
- Try a different audio file

#### Step 4: Test Play Function

1. **Click the "▶ Play" button**

**Expected Results:**
- ✅ Play button becomes disabled (shows "Playing...")
- ✅ Pause button becomes enabled
- ✅ Time display starts updating (0:00 → 0:01 → 0:02...)
- ✅ Time updates every 100ms (smooth progression)
- ✅ Audio plays through speakers/headphones
- ✅ Store updates: `audio.isPlaying = true`
- ✅ Store updates: `audio.currentTime` increases

**Verify in Console:**
```javascript
// Open DevTools (Ctrl+Shift+I) and run:
useAppStore.getState().audio.isPlaying  // Should be true
useAppStore.getState().audio.currentTime  // Should be increasing
```

#### Step 5: Test Pause Function

1. **While audio is playing, click the "⏸ Pause" button**

**Expected Results:**
- ✅ Playback stops immediately
- ✅ Play button becomes enabled again
- ✅ Pause button becomes disabled
- ✅ Time display stops updating (frozen at current position)
- ✅ Store updates: `audio.isPlaying = false`
- ✅ Store updates: `audio.currentTime` = paused position (doesn't reset)
- ✅ Audio can be resumed from same position

**Verify:**
- Time should NOT reset to 0:00
- Time should be frozen at the position where you paused
- Clicking Play again should resume from that position

#### Step 6: Test Stop Function

1. **Click the "⏹ Stop" button**

**Expected Results:**
- ✅ Playback stops
- ✅ Time display resets to "0:00 / X:XX"
- ✅ Store updates: `audio.isPlaying = false`
- ✅ Store updates: `audio.currentTime = 0`
- ✅ Clicking Play starts from beginning (0:00)

---

## 📋 Complete Test Checklist

### Basic Functionality

- [ ] **Load Audio File**
  - [ ] Click "Load Audio" button
  - [ ] File picker opens
  - [ ] Select valid audio file (MP3/WAV/etc.)
  - [ ] File loads successfully
  - [ ] File name displays
  - [ ] Duration displays correctly

- [ ] **Play Audio**
  - [ ] Click "▶ Play" button
  - [ ] Audio starts playing
  - [ ] Time counter increases (0:00 → 0:01 → 0:02...)
  - [ ] Time updates smoothly (every 100ms)
  - [ ] Play button disabled during playback
  - [ ] Pause button enabled

- [ ] **Pause Audio**
  - [ ] While playing, click "⏸ Pause"
  - [ ] Audio stops immediately
  - [ ] Time freezes at current position
  - [ ] Time does NOT reset to 0:00
  - [ ] Play button enabled
  - [ ] Pause button disabled

- [ ] **Resume from Pause**
  - [ ] After pausing, click "▶ Play" again
  - [ ] Audio resumes from paused position
  - [ ] Time continues from where it paused

- [ ] **Stop Audio**
  - [ ] Click "⏹ Stop" button
  - [ ] Audio stops
  - [ ] Time resets to 0:00
  - [ ] Play button enabled
  - [ ] Clicking Play starts from beginning

### Error Handling

- [ ] **Unsupported Format**
  - [ ] Try loading a non-audio file (e.g., .txt, .pdf)
  - [ ] Error message displays
  - [ ] Store is reset (no file loaded)

- [ ] **Corrupted File**
  - [ ] Try loading a corrupted audio file
  - [ ] Error message displays
  - [ ] Store is reset

### Store Integration

- [ ] **Verify Store Updates**
  - [ ] Open DevTools Console
  - [ ] Run: `useAppStore.getState().audio`
  - [ ] Check that properties update:
    - [ ] `isPlaying` changes on play/pause
    - [ ] `currentTime` updates every 100ms during playback
    - [ ] `duration` is set after loading
    - [ ] `file` is set after loading
    - [ ] `isLoaded` is true after loading

---

## 🎯 Quick Test Script

Copy and paste this into the browser console (DevTools) to verify:

```javascript
// Get store reference
const store = window.__ZUSTAND_STORE__ || useAppStore.getState();

// Test 1: Check if AudioEngine is accessible
console.log('Test 1: AudioEngine accessible?', typeof useAudioEngine !== 'undefined');

// Test 2: Load a file (manual test - use UI button)
// Then check store:
console.log('Test 2: Store after load', store.audio);

// Test 3: During playback, check time updates
setInterval(() => {
  if (store.audio.isPlaying) {
    console.log('Current time:', store.audio.currentTime);
  }
}, 1000);
```

---

## 🐛 Troubleshooting

### Audio doesn't play
- **Check:** Browser console for errors
- **Solution:** Click "Load Audio" first, then try play
- **Note:** Audio context requires user interaction (click button)

### Time doesn't update
- **Check:** Is `audio.isPlaying` true in store?
- **Check:** Console for errors in time update loop
- **Solution:** Try pausing and playing again

### Error on load
- **Check:** File format is supported (MP3, WAV, OGG, FLAC, M4A, AAC)
- **Check:** File is not corrupted
- **Check:** File size is reasonable (< 500MB)
- **Solution:** Try a different audio file

### Store not updating
- **Check:** DevTools → React DevTools → Components → Check store
- **Check:** Console for errors
- **Solution:** Refresh the app

---

## ✅ Success Criteria

The implementation is successful if:

1. ✅ **Load Audio** button works and loads files
2. ✅ **Play** button starts playback and time updates
3. ✅ **Pause** button stops playback and freezes time
4. ✅ **Stop** button resets to beginning
5. ✅ Time updates every 100ms during playback
6. ✅ Store updates automatically (no manual updates needed)
7. ✅ Error messages display for invalid files
8. ✅ All buttons enable/disable correctly

---

## 📸 Visual Test Flow

```
1. Initial State:
   [Load Audio] button
   "Load an audio file to begin"

2. After Loading:
   [Load Audio] [▶ Play] [⏸ Pause] [⏹ Stop]
   0:00 / 3:45
   filename.mp3

3. During Playback:
   [Load Audio] [▶ Playing...] [⏸ Pause] [⏹ Stop]
   1:23 / 3:45  ← Updates every 100ms
   filename.mp3

4. After Pause:
   [Load Audio] [▶ Play] [⏸ Pause] [⏹ Stop]
   1:23 / 3:45  ← Frozen at pause position
   filename.mp3
```

---

**Ready to test!** 🎉

Run `npm run dev` and follow the steps above to verify all functionality.


