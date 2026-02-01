# Annotation Filtering Feature

## Overview

The annotation filtering system allows users to selectively control which AI-generated annotations are displayed on the video, reducing clutter and focusing on the most important information.

## Features

### 1. **Quick Presets**
Three one-click presets for common viewing modes:
- **All**: Shows all annotations (default)
- **Key**: Shows only high-priority annotations and highlighted players
- **Minimal**: Shows only critical annotations (highlighted offensive players and callouts)

### 2. **Annotation Type Toggles**
Control which categories of annotations to show:
- **Players**: Player position markers
- **Arrows**: Movement and route indicators
- **Terminology**: Football term definitions
- **Callouts**: Editorial highlights and commentary

### 3. **Player-Specific Filters**
Fine-tune which players are displayed:
- **Highlighted Only**: Show only players marked as important by the AI
- **Offensive**: Toggle offensive players
- **Defensive**: Toggle defensive players

### 4. **Priority Levels**
Three priority levels based on annotation importance:
- **All Annotations**: Shows everything (no filtering)
- **High Priority**: Shows key players, labeled arrows, and important terms
- **Critical Only**: Shows only highlighted players and callouts

### 5. **Real-time Stats**
See how many annotations are shown vs. hidden at any moment

## How It Works

### Priority Scoring System

Each annotation is automatically scored based on importance:

**Players:**
- Highlighted players: +100 priority
- Key positions (QB, RB, WR, TE, CB, S, LB): +50 priority
- Ball carriers (QB, RB): +30 additional priority

**Arrows:**
- Base priority: 50
- With label: +30 priority
- Solid (not dashed): +20 priority

**Terminology:**
- Base priority: 40
- Key terms (blitz, coverage, zone, man, route, pressure, etc.): +60 priority

## Usage

1. Click the **"Filters"** button in the top-right corner while watching a video
2. Choose a preset or customize your own settings
3. Annotations update in real-time as you adjust filters
4. Stats show how many annotations are currently shown/hidden

## Keyboard Shortcuts

All existing video player shortcuts still work:
- `Space/K`: Play/Pause
- `J/L`: Skip backward/forward 5s
- `A`: Toggle all annotations on/off
- `Shift+L`: Toggle learn mode
- `F`: Fullscreen

## Implementation Details

### Files Created/Modified

**New Files:**
- `frontend/src/types/filters.ts` - Filter type definitions and presets
- `frontend/src/utils/annotationFilters.ts` - Filtering logic and priority scoring
- `frontend/src/components/FilterControls/FilterControls.tsx` - UI component
- `frontend/src/components/FilterControls/FilterControls.module.css` - Styles
- `frontend/src/components/FilterControls/index.ts` - Export

**Modified Files:**
- `frontend/src/components/VideoPlayer/VideoPlayer.tsx` - Integrated filtering system

### Architecture

The filtering system uses a pipeline approach:
1. Raw annotations are fetched from the backend
2. Interpolation is applied for smooth transitions
3. User filters are applied based on priority scores
4. Filtered annotations are rendered on the canvas

This keeps the filtering logic separate from rendering and allows for easy customization.

## Future Enhancements

Possible improvements for the future:
- Save filter preferences per user
- Custom filter presets
- Time-based filtering (e.g., show more details during key moments)
- AI-suggested optimal filters based on play type
- Filter by specific player positions or roles
- Export filtered view as a separate video

## Benefits

1. **Reduced Clutter**: Focus on what matters without visual overload
2. **Better Learning**: Students can start with minimal annotations and gradually increase complexity
3. **Coaching Tools**: Coaches can highlight specific aspects (e.g., only defensive players)
4. **Broadcast-Style**: "Minimal" preset mimics professional broadcast annotations
5. **Customizable**: Power users can create their perfect viewing experience
