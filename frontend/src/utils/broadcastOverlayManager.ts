import {
  PlayerAnnotation,
  ArrowAnnotation,
  TerminologyAnnotation,
} from '../types/annotations';

/**
 * NFL Broadcast-style Overlay Manager
 * 
 * Hard limits per frame:
 * - Max 4 callouts (text labels)
 * - Max 4 arrows
 * - Max 4 circles (only key actors)
 * 
 * Prioritization:
 * - Prefer concept labels over position labels
 * - Only one micro-story per frame (top 2 annotations)
 * - Only circle key actors (ball carrier, pursuer, blocker, receiver)
 */

export const BROADCAST_CONFIG = {
  MAX_CALLOUTS: 4,
  MAX_ARROWS: 4,
  MAX_CIRCLES: 4,
  MAX_MICRO_STORIES: 2, // Top 2 annotations per frame
};

// Concept labels (preferred over position labels)
const CONCEPT_LABELS = new Set([
  'pursuit', 'downfield blocking', 'crossing route', 'pass protection',
  'blitz', 'zone coverage', 'man coverage', 'pocket', 'route',
  'formation', 'tackle', 'interception', 'fumble', 'touchdown',
  'sack', 'turnover', 'first down', 'audible', 'read option',
  'play action', 'screen pass', 'deep pass', 'short pass',
  'offside', 'holding', 'false start', 'red zone', 'end zone',
  'two-minute warning', 'timeout', 'extra point', 'two-point conversion',
  'quarterback sneak', 'draw play', 'trap play', 'sweep', 'jet sweep',
  'slant', 'out route', 'post route', 'fade route', 'comeback route',
  'seam route', 'rollout', 'scramble', 'clean pocket', 'deep safety',
  'pulling lineman', 'backside block', 'dead ball', 'single high safety',
  'defensive stance', 'collision', 'momentum', 'assist', 'tackle angle',
  'drive direction', 'vision', 'block/release', 'cover 2', 'two high',
  'line to gain', 'pre-snap motion', 'movement to play', 'coverage drop',
  'gunner', 'direction', 'downfield blocking', 'punt returner',
].map(term => term.toLowerCase()));

// Position labels (less preferred)
const POSITION_LABELS = new Set([
  'qb', 'quarterback', 'wr', 'wide receiver', 'rb', 'running back',
  'fb', 'fullback', 'te', 'tight end', 'ol', 'offensive line',
  'dl', 'defensive line', 'lb', 'linebacker', 'cb', 'cornerback',
  's', 'safety', 'st', 'special teams', 'c', 'center', 'slot receiver',
].map(term => term.toLowerCase()));

// Key actor roles (only these get circles)
// These are players directly involved in the highlighted action
const KEY_ACTOR_ROLES = new Set([
  'ball carrier', 'primary pursuer', 'key blocker', 'target receiver',
  'qb', 'quarterback', 'pursuer', 'blocker', 'receiver',
  'running back', 'rb', 'wide receiver', 'wr', 'tight end', 'te',
].map(term => term.toLowerCase()));

interface ScoredCallout {
  text: string;
  source: 'arrow' | 'terminology';
  score: number;
  isConcept: boolean;
  isPosition: boolean;
  original: ArrowAnnotation | TerminologyAnnotation;
}

interface ScoredPlayer {
  player: PlayerAnnotation;
  score: number;
  isKeyActor: boolean;
}

interface ScoredArrow {
  arrow: ArrowAnnotation;
  score: number;
  hasConceptLabel: boolean;
}

/**
 * Check if a label is a concept label
 */
function isConceptLabel(label: string): boolean {
  const normalized = label.toLowerCase().trim();
  return CONCEPT_LABELS.has(normalized) || 
         normalized.includes('pursuit') ||
         normalized.includes('blocking') ||
         normalized.includes('route') ||
         normalized.includes('coverage') ||
         normalized.includes('formation');
}

/**
 * Check if a label is a position label
 */
function isPositionLabel(label: string): boolean {
  const normalized = label.toLowerCase().trim();
  return POSITION_LABELS.has(normalized) ||
         ['qb', 'wr', 'rb', 'te', 'cb', 's', 'lb', 'dl', 'ol'].includes(normalized);
}

/**
 * Check if a player is a key actor
 * Only key actors get circles - everyone else gets no circle or subtle dot
 */
function isKeyActor(player: PlayerAnnotation): boolean {
  const label = player.label.toLowerCase().trim();
  
  // Highlighted players are always key actors
  if (player.highlight) {
    return true;
  }
  
  // Check against key actor roles
  if (KEY_ACTOR_ROLES.has(label)) {
    return true;
  }
  
  // Check for key actor keywords in label
  const keyKeywords = ['qb', 'ball carrier', 'pursuer', 'blocker', 'receiver', 'target'];
  for (const keyword of keyKeywords) {
    if (label.includes(keyword)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Score a callout candidate
 */
function scoreCallout(
  text: string,
  source: 'arrow' | 'terminology',
  original: ArrowAnnotation | TerminologyAnnotation
): ScoredCallout {
  const isConcept = isConceptLabel(text);
  const isPosition = isPositionLabel(text);
  
  let score = 0;
  
  // Concept labels get high priority
  if (isConcept) {
    score += 10;
  }
  
  // Position labels get lower priority
  if (isPosition) {
    score += 2;
  }
  
  // Arrows with labels are more important than terminology
  if (source === 'arrow') {
    score += 5;
  }
  
  // Shorter labels are preferred (less clutter)
  if (text.length < 20) {
    score += 2;
  }
  
  return {
    text,
    source,
    score,
    isConcept,
    isPosition,
    original,
  };
}

/**
 * Score a player for circle rendering
 */
function scorePlayer(player: PlayerAnnotation): ScoredPlayer {
  const isKey = isKeyActor(player);
  
  let score = 0;
  
  if (isKey) {
    score += 10;
  }
  
  if (player.highlight) {
    score += 5;
  }
  
  return {
    player,
    score,
    isKeyActor: isKey,
  };
}

/**
 * Score an arrow
 */
function scoreArrow(arrow: ArrowAnnotation): ScoredArrow {
  const hasConceptLabel = arrow.label ? isConceptLabel(arrow.label) : false;
  
  let score = 0;
  
  if (hasConceptLabel) {
    score += 10;
  }
  
  if (arrow.label) {
    score += 5; // Arrows with labels are more important
  }
  
  return {
    arrow,
    score,
    hasConceptLabel,
  };
}

/**
 * Broadcast Overlay Manager
 * Filters and prioritizes annotations to create minimal NFL-style overlays
 */
export class BroadcastOverlayManager {
  /**
   * Filter and prioritize callouts (text labels)
   */
  selectCallouts(
    arrows: ArrowAnnotation[],
    terminology: TerminologyAnnotation[],
    learnMode: boolean = false
  ): ScoredCallout[] {
    const candidates: ScoredCallout[] = [];
    
    // Collect callouts from arrows
    for (const arrow of arrows) {
      if (arrow.label) {
        candidates.push(scoreCallout(arrow.label, 'arrow', arrow));
      }
    }
    
    // Collect callouts from terminology (only in learn mode)
    if (learnMode) {
      for (const term of terminology) {
        // Use term as callout (not definition)
        candidates.push(scoreCallout(term.term, 'terminology', term));
      }
    }
    
    // Sort by score (concept labels first, then by score)
    candidates.sort((a, b) => {
      if (a.isConcept && !b.isConcept) return -1;
      if (!a.isConcept && b.isConcept) return 1;
      return b.score - a.score;
    });
    
    // Take top N callouts
    return candidates.slice(0, BROADCAST_CONFIG.MAX_CALLOUTS);
  }
  
  /**
   * Filter and prioritize arrows
   */
  selectArrows(arrows: ArrowAnnotation[]): ArrowAnnotation[] {
    const scored = arrows.map(arrow => scoreArrow(arrow));
    
    // Sort by score (concept labels first)
    scored.sort((a, b) => {
      if (a.hasConceptLabel && !b.hasConceptLabel) return -1;
      if (!a.hasConceptLabel && b.hasConceptLabel) return 1;
      return b.score - a.score;
    });
    
    // Take top N arrows
    return scored.slice(0, BROADCAST_CONFIG.MAX_ARROWS).map(s => s.arrow);
  }
  
  /**
   * Filter and prioritize players (only key actors get circles)
   */
  selectPlayersForCircles(players: PlayerAnnotation[]): PlayerAnnotation[] {
    const scored = players.map(player => scorePlayer(player));
    
    // Filter to only key actors
    const keyActors = scored.filter(s => s.isKeyActor);
    
    // Sort by score
    keyActors.sort((a, b) => b.score - a.score);
    
    // Take top N key actors
    return keyActors.slice(0, BROADCAST_CONFIG.MAX_CIRCLES).map(s => s.player);
  }
  
  /**
   * Filter terminology (only show in learn mode, and limit to top micro-stories)
   */
  selectTerminology(
    terminology: TerminologyAnnotation[],
    learnMode: boolean
  ): TerminologyAnnotation[] {
    if (!learnMode) {
      return []; // No terminology popups unless learn mode is on
    }
    
    // Score terminology by concept vs position
    const scored = terminology.map(term => ({
      term,
      score: isConceptLabel(term.term) ? 10 : isPositionLabel(term.term) ? 2 : 5,
      isConcept: isConceptLabel(term.term),
    }));
    
    // Sort by score (concept first)
    scored.sort((a, b) => {
      if (a.isConcept && !b.isConcept) return -1;
      if (!a.isConcept && b.isConcept) return 1;
      return b.score - a.score;
    });
    
    // Take top N micro-stories
    return scored.slice(0, BROADCAST_CONFIG.MAX_MICRO_STORIES).map(s => s.term);
  }
  
  /**
   * Main method: filter a frame to create minimal broadcast overlay
   */
  filterFrame(
    players: PlayerAnnotation[],
    arrows: ArrowAnnotation[],
    terminology: TerminologyAnnotation[],
    learnMode: boolean = false
  ): {
    players: PlayerAnnotation[];
    arrows: ArrowAnnotation[];
    terminology: TerminologyAnnotation[];
    callouts: ScoredCallout[];
  } {
    // Select callouts (from arrows + terminology if learn mode)
    const callouts = this.selectCallouts(arrows, terminology, learnMode);
    
    // Filter arrows (respecting callout selection)
    const selectedArrows = this.selectArrows(arrows);
    
    // Filter players (only key actors get circles)
    const selectedPlayers = this.selectPlayersForCircles(players);
    
    // Filter terminology (only in learn mode, top micro-stories)
    const selectedTerminology = this.selectTerminology(terminology, learnMode);
    
    return {
      players: selectedPlayers,
      arrows: selectedArrows,
      terminology: selectedTerminology,
      callouts,
    };
  }
}
