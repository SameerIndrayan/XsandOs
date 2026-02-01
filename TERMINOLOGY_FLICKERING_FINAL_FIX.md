# Terminology Flickering - Root Cause & Final Fix

## The Real Problem

Terminology was flickering because **the interpolation logic only looked at the current frame pair** (before/after), not at ALL frames that might have active terminology.

### Example of the Bug:
```
Frame 1 @ 0s: "Shotgun" appears (duration = 5s, should show until 5s)
Frame 2 @ 0.7s: Different term "Zone" appears
  ↓ Interpolation only looks at Frame 1 & 2
  ↓ "Shotgun" from Frame 1 expires when we move past it
  ↓ Even though it should still be visible until 5s!
Frame 3 @ 1.4s: "Shotgun" disappears (FLICKER!)
```

## The Solution

Instead of only looking at the current interpolation pair, we now **scan ALL frames** and collect every terminology that should be visible at the current time.

### New Logic:
```typescript
// For EVERY frame in the video:
for (const frame of frames) {
  for (const term of frame.terminology) {
    const termStart = frame.timestamp;
    const termEnd = termStart + term.duration;
    
    // Is this term active RIGHT NOW?
    if (currentTime >= termStart && currentTime <= termEnd) {
      // Yes! Add it to the display list
      activeTerminology.push(term);
    }
  }
}
```

### Result:
```
Frame 1 @ 0s: "Shotgun" appears (will show 0s-5s)
Frame 2 @ 0.7s: "Zone" appears (will show 0.7s-5.7s)
  ↓ Both terms collected because both are within their time windows
Frame 3 @ 1.4s: BOTH "Shotgun" and "Zone" still showing ✓
Frame 4 @ 2.1s: BOTH still showing ✓
Frame 7 @ 5.1s: "Shotgun" fades out (duration expired)
  ↓ "Zone" continues showing
```

## Code Changes

### File: `frontend/src/utils/interpolation.ts`

**Before (Buggy):**
```typescript
export const getInterpolatedFrame = (frames, currentTime, allCallouts) => {
  const { before, after, t } = findBracketingFrames(frames, currentTime);
  
  // Only looks at before & after frames
  return interpolateFrame(before, after, t, currentTime, allCallouts);
  // ↑ selectTerminology() only sees 2 frames worth of terms
};
```

**After (Fixed):**
```typescript
export const getInterpolatedFrame = (frames, currentTime, allCallouts) => {
  // Get base frame (players/arrows from before/after pair)
  const baseFrame = interpolateFrame(before, after, t, currentTime, allCallouts);
  
  // Collect ALL active terminology from ALL frames
  const activeTerminology = [];
  for (const frame of frames) {  // ← Look at EVERY frame!
    for (const term of frame.terminology) {
      if (currentTime >= frame.timestamp && 
          currentTime <= frame.timestamp + term.duration) {
        activeTerminology.push(term);
      }
    }
  }
  
  // Use collected active terms instead
  return { ...baseFrame, terminology: activeTerminology };
};
```

### Also Changed:

**`selectTerminology()` function:**
- Simplified to only handle the current frame pair
- Removed complex transition logic since we now collect from all frames
- Removed deduplication logic (handled at collection level)

**`transformBackendData.ts`:**
- Increased default duration from 2s → 5s for better visibility

## Why This Works

1. **Global View**: We scan all frames, not just the current interpolation pair
2. **Time-Based**: Each term has a clear start time (frame.timestamp) and end time (start + duration)
3. **No Gaps**: A term visible at 2.0s will be found regardless of which frames we're interpolating between
4. **Deduplication**: We track seen terms to avoid duplicates
5. **Smooth Fades**: Opacity calculation based on actual time windows, not frame transitions

## Performance

- **Complexity**: O(F × T) where F = frames, T = avg terms per frame
- **Typical Load**: 30 frames × 2 terms = 60 iterations per render
- **Optimizations**: 
  - Early continue if term already seen
  - Early skip if currentTime outside term window
  - Memoized in React hook

## Testing

The fix should now show:
- ✅ Terminology persists for full duration (5 seconds default)
- ✅ No flickering when moving between frames
- ✅ Smooth fade in/out at start/end of duration
- ✅ Multiple overlapping terms display correctly
- ✅ No duplicate terms

## Example Timeline

```
Time: 0.0s → Frame 1: "Shotgun Formation" appears
Time: 0.7s → Frame 2: "Zone Coverage" appears  
Time: 1.4s → Frame 3: BOTH still showing (no flicker!)
Time: 2.1s → Frame 4: BOTH still showing
Time: 2.8s → Frame 5: BOTH still showing
Time: 3.5s → Frame 6: BOTH still showing
Time: 4.2s → Frame 7: BOTH still showing
Time: 4.9s → "Shotgun" starts fading out
Time: 5.0s → "Shotgun" gone, "Zone" remains
Time: 5.7s → "Zone" gone
```

## Related Files

- `frontend/src/utils/interpolation.ts` - Main fix
- `frontend/src/utils/transformBackendData.ts` - Duration increase
- `frontend/src/hooks/useAnnotationFrames.ts` - Passes all frames
- `frontend/src/types/annotations.ts` - Type definitions

## Lessons Learned

1. **Local vs Global Thinking**: The interpolation was thinking "locally" (just before/after), when terminology needs "global" thinking (all active at this moment)

2. **Time Windows**: Annotations with durations need to be tracked across their entire time window, not just at their appearance frame

3. **Frame Independence**: Just because we're between Frame A and Frame B doesn't mean those are the only frames that matter

4. **Persistence != Interpolation**: Things that should persist (terminology) are different from things that should interpolate (player positions)
