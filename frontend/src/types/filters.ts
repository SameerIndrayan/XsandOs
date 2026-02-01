// Annotation filtering types

export interface AnnotationFilters {
  showPlayers: boolean;
  showArrows: boolean;
  showTerminology: boolean;
  showCallouts: boolean;
  
  // Player-specific filters
  showHighlightedPlayersOnly: boolean;
  showOffensivePlayers: boolean;
  showDefensivePlayers: boolean;
  
  // Priority-based filtering
  priorityLevel: 'all' | 'high' | 'critical';
}

export const DEFAULT_FILTERS: AnnotationFilters = {
  showPlayers: true,
  showArrows: true,
  showTerminology: true,
  showCallouts: true,
  
  showHighlightedPlayersOnly: false,
  showOffensivePlayers: true,
  showDefensivePlayers: true,
  
  priorityLevel: 'all',
};

export type FilterPreset = 'all' | 'key-players' | 'minimal' | 'custom';

export const FILTER_PRESETS: Record<FilterPreset, AnnotationFilters> = {
  all: DEFAULT_FILTERS,
  
  'key-players': {
    showPlayers: true,
    showArrows: true,
    showTerminology: false,
    showCallouts: true,
    showHighlightedPlayersOnly: true,
    showOffensivePlayers: true,
    showDefensivePlayers: true,
    priorityLevel: 'high',
  },
  
  minimal: {
    showPlayers: true,
    showArrows: false,
    showTerminology: false,
    showCallouts: true,
    showHighlightedPlayersOnly: true,
    showOffensivePlayers: true,
    showDefensivePlayers: false,
    priorityLevel: 'critical',
  },
  
  custom: DEFAULT_FILTERS,
};
