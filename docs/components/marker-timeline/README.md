# MarkerTimeline Component Documentation

## Overview

The MarkerTimeline component provides a visual timeline overlay for displaying audio markers. It shows markers as colored bars positioned along a timeline, handles overlapping markers by stacking them, and provides interactive features like clicking to select and hovering to see details.

**Component Owner:** Wilton  
**Branch:** `wilton/marker-timeline`  
**File:** `src/renderer/components/markers/MarkerTimeline.tsx`

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Usage](#usage)
- [Props](#props)
- [State Management](#state-management)
- [Styling](#styling)
- [Testing](#testing)

---

## Features

### ✅ Completed Features

1. **SVG-based Timeline Overlay**
   - Visual timeline with time markers
   - Responsive to container width
   - Clean, modern design

2. **Marker Display**
   - Markers displayed as colored bars
   - Positioned based on timestamp
   - Custom colors or auto-assigned colors
   - Minimum width for visibility

3. **Overlapping Marker Handling**
   - Automatic detection of overlapping markers
   - Stacked display (vertical stacking)
   - Smart positioning algorithm
   - Visual separation between stacked markers

4. **Interactive Features**
   - Click marker to activate (select)
   - Gold border highlight for selected marker
   - Hover tooltip with marker information
   - Smooth animations and transitions

5. **Responsive Design**
   - Handles window resize events
   - Maintains marker positions on resize
   - Adapts to container width changes

6. **Zustand Store Integration**
   - Reads markers from store
   - Reads audio duration from store
   - Updates selected marker in store
   - Reactive to store changes

---

## Architecture

### Technology Stack

- **React** - Component framework
- **TypeScript** - Type safety
- **SVG** - Timeline visualization
- **Zustand** - State management
- **CSS-in-JS** - Styling

### Component Structure

```typescript
MarkerTimeline
├── Container (div)
│   ├── SVG Timeline (background)
│   │   └── Time markers (vertical lines)
│   ├── Marker Bars (div)
│   │   └── Individual marker bars
│   ├── Hover Tooltip (conditional)
│   └── Empty State (conditional)
```

### Key Functions

- `getMarkerPosition()` - Calculates marker position and width
- `groupOverlappingMarkers()` - Groups overlapping markers for stacking
- `getStackLevel()` - Determines vertical stack level for a marker
- `getMarkerColor()` - Gets marker color (custom or auto-assigned)
- `handleMarkerClick()` - Handles marker selection
- `handleMarkerHover()` - Handles tooltip display

---

## Usage

### Basic Usage

```tsx
import MarkerTimeline from './components/markers/MarkerTimeline';

function App() {
  return (
    <div>
      <MarkerTimeline />
    </div>
  );
}
```

### With Store

The component automatically reads from Zustand store:

```typescript
// Store structure
{
  markers: Marker[],
  audio: {
    duration: number
  },
  ui: {
    selectedMarkerId: string | null
  }
}
```

---

## Props

The component doesn't accept any props. It reads all data from the Zustand store.

---

## State Management

### Reads From Store

- `markers` - Array of markers to display
- `audio.duration` - Audio duration for timeline scaling
- `ui.selectedMarkerId` - Currently selected marker ID

### Updates Store

- `setSelectedMarkerId(id)` - Sets the selected marker when clicked

### Marker Interface

```typescript
interface Marker {
  id: string;
  timestamp: number; // in seconds
  label: string;
  color?: string; // Optional custom color
  notes?: string; // Optional notes
}
```

---

## Styling

### Colors

The component uses Kenyan theme colors:
- **Kenyan Red:** `#DE2910`
- **Kenyan Green:** `#006644`
- **Gold:** `#FFD700` (for selected border)
- **Auto-assigned colors:** Rotates through a palette if no custom color

### Visual States

1. **Normal State**
   - Colored bar with subtle border
   - Standard shadow

2. **Hover State**
   - Slightly larger scale
   - Gold border (semi-transparent)
   - Enhanced shadow
   - Tooltip appears

3. **Selected State**
   - Gold border (solid)
   - Stronger shadow with gold glow
   - Higher z-index

### Stacking

- Markers stack vertically when overlapping
- Stack level determines Y position
- Higher stack = higher on timeline
- Visual spacing between stacked markers

---

## Testing

### Manual Testing

1. **Add Markers to Store**
   ```typescript
   const store = useAppStore.getState();
   store.addMarker({
     id: '1',
     timestamp: 10,
     label: 'Marker 1',
     color: '#DE2910'
   });
   store.addMarker({
     id: '2',
     timestamp: 15,
     label: 'Marker 2'
   });
   ```

2. **Test Overlapping Markers**
   ```typescript
   store.addMarker({
     id: '3',
     timestamp: 12, // Overlaps with Marker 1
     label: 'Marker 3'
   });
   ```

3. **Test Interactions**
   - Click a marker → Should highlight with gold border
   - Hover a marker → Should show tooltip
   - Resize window → Markers should maintain positions

### Test Checklist

- [x] Markers display as colored bars
- [x] Markers positioned correctly by timestamp
- [x] Overlapping markers stack vertically
- [x] Click marker selects it (gold border)
- [x] Hover shows tooltip with marker info
- [x] Window resize maintains positions
- [x] Empty state shows when no markers
- [x] Empty state shows when no audio loaded
- [x] Custom colors work
- [x] Auto-assigned colors work

---

## Example: Adding Test Markers

```typescript
// In browser console or test file
const store = useAppStore.getState();

// Add some test markers
store.addMarker({
  id: 'marker-1',
  timestamp: 5,
  label: 'Introduction',
  color: '#DE2910',
  notes: 'Start of introduction'
});

store.addMarker({
  id: 'marker-2',
  timestamp: 15,
  label: 'Main Topic',
  color: '#006644',
  notes: 'Main discussion begins'
});

store.addMarker({
  id: 'marker-3',
  timestamp: 12, // Overlaps with marker-2
  label: 'Side Note',
  notes: 'Important side note'
});

// Markers should appear on timeline
// marker-3 should stack above marker-2
```

---

## Responsive Behavior

The component handles window resize by:
1. Listening to `resize` events
2. Updating container width state
3. Recalculating marker positions
4. Maintaining visual consistency

---

## Performance Considerations

- Uses `useCallback` for expensive calculations
- Memoizes marker position calculations
- Efficient overlap detection algorithm
- Minimal re-renders on store updates

---

## Future Enhancements

- [ ] Drag markers to reposition
- [ ] Resize markers (change duration)
- [ ] Zoom in/out functionality
- [ ] Time scrubbing on timeline
- [ ] Marker grouping/categorization
- [ ] Export timeline as image

---

**Last Updated:** 2025-12-20  
**Maintained by:** Wilton

