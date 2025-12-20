# MarkerTimeline Testing Guide

## Quick Test

### 1. Add Markers Manually to Store

Open browser console (F12) and run:

```javascript
// Get store
const store = window.useAppStore?.getState() || 
  (await import('./src/renderer/store/store')).useAppStore.getState();

// Add test markers
store.addMarker({
  id: 'test-1',
  timestamp: 5,
  label: 'Test Marker 1',
  color: '#DE2910'
});

store.addMarker({
  id: 'test-2',
  timestamp: 15,
  label: 'Test Marker 2',
  color: '#006644'
});

store.addMarker({
  id: 'test-3',
  timestamp: 12, // Overlaps with test-2
  label: 'Overlapping Marker',
  notes: 'This overlaps with Marker 2'
});
```

### 2. Verify Display

- ✅ Colored bars appear on timeline
- ✅ Bars positioned at correct times (5s, 12s, 15s)
- ✅ Overlapping markers stack vertically
- ✅ Labels visible on bars (if space allows)

### 3. Test Interactions

- **Click a marker** → Should highlight with gold border
- **Hover a marker** → Should show tooltip with name and time
- **Resize window** → Markers should maintain positions

---

## Comprehensive Test Cases

### Test Case 1: Basic Marker Display

**Steps:**
1. Load audio file
2. Add marker at 10 seconds
3. Verify marker appears on timeline

**Expected:**
- Marker bar visible at ~10% of timeline (if audio is 100s)
- Bar has color (custom or auto-assigned)
- Label visible if bar is wide enough

---

### Test Case 2: Overlapping Markers

**Steps:**
1. Add marker at 10 seconds
2. Add marker at 12 seconds (overlaps)
3. Add marker at 11 seconds (overlaps both)

**Expected:**
- All three markers visible
- Markers stack vertically
- No visual overlap/collision
- Each marker clickable independently

---

### Test Case 3: Marker Selection

**Steps:**
1. Add multiple markers
2. Click on a marker

**Expected:**
- Clicked marker gets gold border
- Other markers remain normal
- Store's `selectedMarkerId` updates
- Visual feedback is immediate

---

### Test Case 4: Hover Tooltip

**Steps:**
1. Add marker with label and notes
2. Hover over marker

**Expected:**
- Tooltip appears near cursor
- Shows marker label
- Shows timestamp
- Shows notes (if available)
- Tooltip disappears on mouse leave

---

### Test Case 5: Responsive Resize

**Steps:**
1. Add markers
2. Resize browser window
3. Observe timeline

**Expected:**
- Timeline adjusts to new width
- Marker positions recalculate
- No visual glitches
- Markers remain clickable

---

### Test Case 6: Empty States

**Test 6a: No Audio Loaded**
- Timeline shows "Load audio to see markers"
- No markers displayed even if markers exist in store

**Test 6b: No Markers**
- Timeline shows "No markers yet"
- Timeline still visible and functional

---

### Test Case 7: Custom Colors

**Steps:**
1. Add marker with custom color: `color: '#FF5733'`
2. Verify color is used

**Expected:**
- Marker bar uses custom color
- Not auto-assigned color

---

### Test Case 8: Auto-Assigned Colors

**Steps:**
1. Add multiple markers without colors
2. Observe colors

**Expected:**
- Each marker gets different color
- Colors rotate through palette
- Colors are distinct and visible

---

## Edge Cases

### Edge Case 1: Marker at Time 0

**Test:**
- Add marker with `timestamp: 0`

**Expected:**
- Marker appears at start of timeline
- Still clickable and functional

---

### Edge Case 2: Marker at End of Audio

**Test:**
- Add marker with `timestamp: duration`

**Expected:**
- Marker appears at end of timeline
- Still visible and functional

---

### Edge Case 3: Many Overlapping Markers

**Test:**
- Add 10+ markers all overlapping

**Expected:**
- All markers stack properly
- No visual collision
- All remain clickable
- Timeline doesn't break

---

### Edge Case 4: Very Short Audio

**Test:**
- Load audio < 1 second
- Add markers

**Expected:**
- Timeline still functional
- Markers positioned correctly
- No division by zero errors

---

## Automated Testing (Future)

```typescript
describe('MarkerTimeline', () => {
  it('displays markers from store', () => {
    // Test implementation
  });
  
  it('handles overlapping markers', () => {
    // Test implementation
  });
  
  it('selects marker on click', () => {
    // Test implementation
  });
  
  it('shows tooltip on hover', () => {
    // Test implementation
  });
});
```

---

## Browser Console Test Script

Copy and paste this into browser console:

```javascript
(async () => {
  // Import store (adjust path as needed)
  const { useAppStore } = await import('./src/renderer/store/store');
  const store = useAppStore.getState();
  
  // Clear existing markers
  store.setMarkers([]);
  
  // Add test markers
  console.log('Adding test markers...');
  
  store.addMarker({
    id: 'm1',
    timestamp: 5,
    label: 'Start',
    color: '#DE2910'
  });
  
  store.addMarker({
    id: 'm2',
    timestamp: 15,
    label: 'Middle',
    color: '#006644'
  });
  
  store.addMarker({
    id: 'm3',
    timestamp: 12,
    label: 'Overlap',
    notes: 'Overlaps with Middle'
  });
  
  store.addMarker({
    id: 'm4',
    timestamp: 25,
    label: 'End Section'
  });
  
  console.log('✅ Test markers added!');
  console.log('Markers:', store.markers);
  console.log('Now test:');
  console.log('1. Click markers to select');
  console.log('2. Hover to see tooltips');
  console.log('3. Resize window to test responsiveness');
})();
```

---

**Last Updated:** 2025-12-20

