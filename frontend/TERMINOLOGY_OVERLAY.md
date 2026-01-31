# Terminology Overlay Manager

## Overview

The `TerminologyOverlayManager` intelligently manages terminology popups to prevent UI clutter while keeping all terms accessible.

## Features

### 1. Hard Cap
- **MAX_TERMS_ON_SCREEN = 2** (configurable in `TERMINOLOGY_CONFIG`)
- Only 2 terminology cards visible at once on the field

### 2. Deduplication & Cooldown
- Tracks seen terms (case-insensitive)
- 6-second cooldown prevents showing the same term repeatedly
- Terms can be pinned to bypass cooldown

### 3. Priority Scoring
Each term is scored based on:
- **+10 points**: New term (not seen before)
- **+5 points**: Core football term (Shotgun, Line of Scrimmage, etc.)
- **+2 points**: Near highlighted player
- **+1 point**: In safe zone (corners/edges)
- **-5 points**: Collision with existing cards

Top N terms by score are selected (N = MAX_TERMS_ON_SCREEN).

### 4. Progressive Disclosure
- **TermsButton**: Shows term count, opens drawer
- **TermsDrawer**: Right-side drawer with all terms for current frame
- All terms remain accessible, only top N shown on field

### 5. Auto-Dismiss
- Terms auto-dismiss after 4 seconds (DISPLAY_SECONDS)
- Pinned terms stay visible until unpinned

### 6. Collision Avoidance
- Prefers safe zones (corners, edges)
- Avoids center of field action
- Calculates distance to prevent overlapping cards

## Usage

The manager is automatically integrated into `VideoPlayer`. No manual setup required.

### Configuration

Edit `frontend/src/utils/terminologyOverlayManager.ts`:

```typescript
export const TERMINOLOGY_CONFIG = {
  MAX_TERMS_ON_SCREEN: 2,        // Max cards on screen
  COOLDOWN_SECONDS: 6,           // Cooldown between same term
  DISPLAY_SECONDS: 4,             // Auto-dismiss time
  COLLISION_THRESHOLD: 0.15,      // Collision detection threshold
  HIGHLIGHTED_PLAYER_DISTANCE_THRESHOLD: 0.10, // Proximity bonus threshold
};
```

### Core Terms List

Add terms to prioritize in `CORE_TERMS` Set:

```typescript
const CORE_TERMS = new Set([
  'shotgun',
  'line of scrimmage',
  // ... add more
]);
```

## Testing

Run unit tests:

```bash
cd frontend
npm test
```

## User Experience

1. **On-field**: Only 1-2 terminology cards visible at once
2. **Terms Button**: Click to see all terms for current frame
3. **Drawer**: Scrollable list of all terms with definitions
4. **Pin/Unpin**: Click term in drawer to pin/unpin (keeps it visible)
5. **Hover**: Hover over term in drawer to highlight (future feature)

## Acceptance Criteria ✅

- ✅ Only 1-2 cards appear at once
- ✅ "Shotgun / Line of Scrimmage / Nickel Defense" don't spam every frame
- ✅ All terms accessible via Terms drawer
- ✅ No more than N cards visible simultaneously
- ✅ Cross-frame memory (seen + cooldown)
- ✅ Per-frame top-N selector
