# Annotation Flickering Fix

## Problem
Annotations (specifically terminology boxes and callouts) were flickering during video playback, creating a jarring user experience.

## Root Causes

### 1. Callout Issues
- Callouts weren't included in the annotation pipeline
- No time-based filtering (they have `start_time` and `end_time`)
- Missing from `InterpolatedFrame` type

### 2. Terminology Issues  
- **Missing start time check**: Only checked `currentTime <= endTime` but not `currentTime >= startTime`
- **Duration too short**: 2-second default was causing premature disappearance
- **Premature new term display**: New terms appeared at `t > 0.3` (30% through transition), causing overlaps
- **No deduplication**: Same term could be added from both "before" and "after" frames

## Solutions

### Callout Fixes
**Files Modified:**
- `frontend/src/types/annotations.ts` - Added callouts to types
- `frontend/src/utils/transformBackendData.ts` - Extract callouts from backend
- `frontend/src/utils/interpolation.ts` - Time-based filtering
- `frontend/src/hooks/useAnnotationFrames.ts` - Pass callouts through pipeline
- `frontend/src/utils/annotationFilters.ts` - Filter support
- `frontend/src/components/AnnotationCanvas/AnnotationCanvas.tsx` - Render callouts

**Implementation:**
```typescript
const filterCalloutsByTime = (
  callouts: EditorialCallout[],
  currentTime: number
): EditorialCallout[] => {
  return callouts.filter(
    callout => currentTime >= callout.start_time && currentTime <= callout.end_time
  );
};
```

### Terminology Fixes

#### Fix 1: Proper Time Window Check
**Before:**
```typescript
if (currentTime <= endTime) { // WRONG: Shows before startTime too!
  // show term
}
```

**After:**
```typescript
if (currentTime >= startTime && currentTime <= endTime) {
  // show term only within its time window
}
```

#### Fix 2: Increased Duration
**File: `frontend/src/utils/transformBackendData.ts`**
```typescript
duration: 5.0, // Increased from 2.0 seconds
```

#### Fix 3: Delayed New Term Display
**Before:**
```typescript
if (!exists && t > 0.3) { // Too early!
  result.push({ ...term, opacity: Math.min(1, (t - 0.3) / 0.3), startTime: currentTime });
}
```

**After:**
```typescript
if (t > 0.7) { // Only in last 30% of transition
  for (const term of after) {
    if (!seenTerms.has(term.term)) { // Deduplication
      const newOpacity = Math.min(1, (t - 0.7) / 0.3);
      result.push({ ...term, opacity: newOpacity, startTime: currentTime });
    }
  }
}
```

#### Fix 4: Term Deduplication
Added `seenTerms` Set to track which terms are already being shown:
```typescript
const seenTerms = new Set<string>();
// ... add terms from before frame to set ...
// Only add new terms if not already showing
if (!seenTerms.has(term.term)) {
  result.push(...);
}
```

## How It Works Now

### Terminology Timeline Example
```
Frame 1 @ 0s: "Shotgun Formation" appears
  ↓ duration = 5s
  ↓ stays visible...
  ↓ stays visible...
  ↓ stays visible...
Frame 2 @ 5s: Term expires, new term "Zone Coverage" begins
  ↓ smooth transition (no overlap)
  ↓ "Zone Coverage" visible...
```

### Before vs After

**Before (Flickering):**
- Term appears at t=0s
- Disappears at t=2s (short duration)
- New term overlaps at t=1.5s (early display)
- Flicker when switching frames
- Same term shown twice from different frames

**After (Smooth):**
- Term appears at t=0s
- Stays until t=5s (longer duration)
- New terms only appear at t>3.5s (70% through)
- No overlaps or duplicates
- Smooth fade transitions

## Technical Details

### Fade Timing
```typescript
const fadeTime = 0.3; // 300ms fade

// Fade in
if (currentTime < startTime + fadeTime) {
  opacity = (currentTime - startTime) / fadeTime;
}

// Fade out  
if (currentTime > endTime - fadeTime) {
  opacity = (endTime - currentTime) / fadeTime;
}
```

### Transition Logic
- **0% - 70% of transition**: Show only "before" frame terms (within time window)
- **70% - 100% of transition**: Fade in "after" frame terms (if not duplicates)
- This creates a clean handoff without overlaps

## Configuration

### Adjustable Parameters

**Duration** (`transformBackendData.ts`):
```typescript
duration: 5.0, // Increase for longer display, decrease for shorter
```

**Fade Time** (`interpolation.ts`):
```typescript
const fadeTime = 0.3; // Seconds for fade in/out
```

**New Term Threshold** (`interpolation.ts`):
```typescript
if (t > 0.7) { // 0.7 = 70% through transition
```

## Testing Recommendations

1. **Short Duration Test**: Temporarily set `duration: 1.0` - should see faster transitions
2. **Long Duration Test**: Set `duration: 10.0` - terms should persist much longer
3. **No Fade Test**: Set `fadeTime: 0` - instant on/off (confirms time windows work)
4. **Early Display Test**: Set `t > 0.3` back - should see overlaps return

## Performance

- **Time Complexity**: O(n + m) where n = before terms, m = after terms
- **Space Complexity**: O(k) where k = unique terms shown
- **Memoization**: Results are memoized in React hook
- **Typical Load**: 2-5 terminology items per frame

## Backward Compatibility

- ✅ Works with data that has no callouts
- ✅ Works with data that has no terminology
- ✅ Default duration applied if backend doesn't specify
- ✅ No breaking changes to existing code

## Related Files

### Modified Files
1. `frontend/src/types/annotations.ts` - Type definitions
2. `frontend/src/utils/interpolation.ts` - Core logic fix
3. `frontend/src/utils/transformBackendData.ts` - Duration increase
4. `frontend/src/hooks/useAnnotationFrames.ts` - Pipeline integration
5. `frontend/src/utils/annotationFilters.ts` - Filter support
6. `frontend/src/components/AnnotationCanvas/AnnotationCanvas.tsx` - Rendering

### Key Functions
- `selectTerminology()` - Chooses which terms to display
- `filterCalloutsByTime()` - Filters callouts by time range
- `getInterpolatedFrame()` - Main orchestration function
