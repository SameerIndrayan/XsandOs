import { InterpolatedFrame, InterpolatedPlayer, InterpolatedArrow, InterpolatedTerminology, EditorialCallout } from '../types/annotations';
import { AnnotationFilters } from '../types/filters';

/**
 * Determine if a player is offensive based on ID pattern
 */
const isOffensivePlayer = (playerId: string): boolean => {
  return playerId.startsWith('off_');
};

/**
 * Calculate priority score for a player (higher = more important)
 */
const getPlayerPriority = (player: InterpolatedPlayer): number => {
  let priority = 0;
  
  // Highlighted players are always high priority
  if (player.highlight) {
    priority += 100;
  }
  
  // Key positions get higher priority
  const keyPositions = ['QB', 'RB', 'WR', 'TE', 'CB', 'S', 'LB'];
  if (keyPositions.includes(player.label)) {
    priority += 50;
  }
  
  // Ball carriers or key defenders
  if (['QB', 'RB'].includes(player.label)) {
    priority += 30;
  }
  
  return priority;
};

/**
 * Calculate priority score for an arrow (higher = more important)
 */
const getArrowPriority = (arrow: InterpolatedArrow): number => {
  let priority = 50; // Base priority for all arrows
  
  // Arrows with labels are more important
  if (arrow.label) {
    priority += 30;
  }
  
  // Solid arrows (not dashed) might be more critical
  if (!arrow.dashed) {
    priority += 20;
  }
  
  return priority;
};

/**
 * Calculate priority score for terminology (higher = more important)
 */
const getTerminologyPriority = (term: InterpolatedTerminology): number => {
  let priority = 40; // Base priority
  
  // Key football terms get higher priority
  const keyTerms = [
    'blitz', 'coverage', 'zone', 'man', 'route', 'pressure',
    'play action', 'screen', 'read option', 'rpo'
  ];
  
  const termLower = term.term.toLowerCase();
  if (keyTerms.some(key => termLower.includes(key))) {
    priority += 60;
  }
  
  return priority;
};

/**
 * Filter players based on settings
 */
const filterPlayers = (
  players: InterpolatedPlayer[],
  filters: AnnotationFilters
): InterpolatedPlayer[] => {
  if (!filters.showPlayers) {
    return [];
  }
  
  return players.filter(player => {
    const isOffensive = isOffensivePlayer(player.id);
    
    // Check team filters
    if (isOffensive && !filters.showOffensivePlayers) {
      return false;
    }
    if (!isOffensive && !filters.showDefensivePlayers) {
      return false;
    }
    
    // Check highlight filter
    if (filters.showHighlightedPlayersOnly && !player.highlight) {
      return false;
    }
    
    // Check priority level
    const priority = getPlayerPriority(player);
    if (filters.priorityLevel === 'high' && priority < 50) {
      return false;
    }
    if (filters.priorityLevel === 'critical' && priority < 100) {
      return false;
    }
    
    return true;
  });
};

/**
 * Filter arrows based on settings
 */
const filterArrows = (
  arrows: InterpolatedArrow[],
  filters: AnnotationFilters
): InterpolatedArrow[] => {
  if (!filters.showArrows) {
    return [];
  }
  
  return arrows.filter(arrow => {
    // Check priority level
    const priority = getArrowPriority(arrow);
    if (filters.priorityLevel === 'high' && priority < 70) {
      return false;
    }
    if (filters.priorityLevel === 'critical' && priority < 90) {
      return false;
    }
    
    return true;
  });
};

/**
 * Filter terminology based on settings
 */
const filterTerminology = (
  terminology: InterpolatedTerminology[],
  filters: AnnotationFilters
): InterpolatedTerminology[] => {
  if (!filters.showTerminology) {
    return [];
  }
  
  return terminology.filter(term => {
    // Check priority level
    const priority = getTerminologyPriority(term);
    if (filters.priorityLevel === 'high' && priority < 70) {
      return false;
    }
    if (filters.priorityLevel === 'critical') {
      return false; // No terminology in critical mode
    }
    
    return true;
  });
};

/**
 * Filter callouts based on settings
 */
const filterCallouts = (
  callouts: EditorialCallout[],
  filters: AnnotationFilters
): EditorialCallout[] => {
  if (!filters.showCallouts) {
    return [];
  }
  
  // Callouts are always high priority, so only filter them out in critical mode
  // where we show absolutely minimal annotations
  if (filters.priorityLevel === 'critical') {
    return [];
  }
  
  return callouts;
};

/**
 * Apply filters to an interpolated frame
 */
export const applyFilters = (
  frame: InterpolatedFrame,
  filters: AnnotationFilters
): InterpolatedFrame => {
  return {
    players: filterPlayers(frame.players, filters),
    arrows: filterArrows(frame.arrows, filters),
    terminology: filterTerminology(frame.terminology, filters),
    callouts: filterCallouts(frame.callouts || [], filters),
  };
};

/**
 * Get a count of how many annotations are being filtered out
 */
export const getFilterStats = (
  frame: InterpolatedFrame,
  filters: AnnotationFilters
): { total: number; shown: number; hidden: number } => {
  const total = frame.players.length + frame.arrows.length + frame.terminology.length + (frame.callouts?.length || 0);
  const filtered = applyFilters(frame, filters);
  const shown = filtered.players.length + filtered.arrows.length + filtered.terminology.length + (filtered.callouts?.length || 0);
  
  return {
    total,
    shown,
    hidden: total - shown,
  };
};
