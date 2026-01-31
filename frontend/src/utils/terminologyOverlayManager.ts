import { TerminologyAnnotation, InterpolatedTerminology, PlayerAnnotation, CanvasDimensions } from '../types/annotations';
import { toCanvasCoords } from './coordinates';

/**
 * Configuration constants for terminology overlay management
 */
export const TERMINOLOGY_CONFIG = {
  MAX_TERMS_ON_SCREEN: 2,
  COOLDOWN_SECONDS: 6,
  DISPLAY_SECONDS: 4,
  COLLISION_THRESHOLD: 0.15, // 15% of screen width/height
  HIGHLIGHTED_PLAYER_DISTANCE_THRESHOLD: 0.10, // 10% of screen
} as const;

/**
 * Core football terms that should be prioritized
 */
const CORE_TERMS = new Set([
  'shotgun',
  'line of scrimmage',
  'nickel defense',
  'cover 2',
  'pocket',
  'man coverage',
  'crossing route',
  'pass protection',
  'zone coverage',
  'blitz',
  'formation',
  'route',
  'tackle',
  'pursuit',
  'blocking',
  'pass rush',
  'drop back',
  'snap',
  'first down',
  'third down',
]);

/**
 * Safe zones for terminology placement (corners and edges)
 * Values are percentage-based (0-100)
 */
const SAFE_ZONES = [
  { x: [5, 25], y: [5, 20] },   // Top-left
  { x: [75, 95], y: [5, 20] },  // Top-right
  { x: [5, 25], y: [80, 95] },  // Bottom-left
  { x: [75, 95], y: [80, 95] }, // Bottom-right
];

interface TermHistory {
  term: string;
  lastShown: number; // timestamp
  timesShown: number;
}

interface ScoredTerm extends TerminologyAnnotation {
  score: number;
  isNew: boolean;
  isCoreTerm: boolean;
  nearHighlightedPlayer: boolean;
  collisionPenalty: number;
}

/**
 * TerminologyOverlayManager
 * Manages terminology display with deduplication, cooldown, and priority scoring
 */
export class TerminologyOverlayManager {
  private seenTerms: Map<string, TermHistory> = new Map();
  private pinnedTerms: Set<string> = new Set();
  private currentDisplayedTerms: Map<string, number> = new Map(); // term -> display start time
  // playStartTime kept for future use (e.g., play-level analytics)
  private playStartTime: number = 0;
  
  // Getter for playStartTime (to avoid unused variable warning)
  getPlayStartTime(): number {
    return this.playStartTime;
  }

  /**
   * Reset manager for a new play
   */
  reset(_playStartTime: number = Date.now()): void {
    this.seenTerms.clear();
    this.pinnedTerms.clear();
    this.currentDisplayedTerms.clear();
    this.playStartTime = Date.now();
  }

  /**
   * Pin a term to keep it displayed
   */
  pinTerm(term: string): void {
    this.pinnedTerms.add(term.toLowerCase());
  }

  /**
   * Unpin a term
   */
  unpinTerm(term: string): void {
    this.pinnedTerms.delete(term.toLowerCase());
  }

  /**
   * Check if a term is pinned
   */
  isPinned(term: string): boolean {
    return this.pinnedTerms.has(term.toLowerCase());
  }

  /**
   * Normalize term string for deduplication (case-insensitive)
   */
  private normalizeTerm(term: string): string {
    return term.toLowerCase().trim();
  }

  /**
   * Check if term is in cooldown period
   * @param normalizedTerm - Normalized term string
   * @param currentTime - Current time in milliseconds
   */
  private isInCooldown(normalizedTerm: string, currentTime: number): boolean {
    const history = this.seenTerms.get(normalizedTerm);
    if (!history) return false;

    const timeSinceLastShown = (currentTime - history.lastShown) / 1000; // Convert to seconds
    return timeSinceLastShown < TERMINOLOGY_CONFIG.COOLDOWN_SECONDS;
  }

  /**
   * Check if term is in a safe zone
   */
  private isInSafeZone(x: number, y: number): boolean {
    return SAFE_ZONES.some(zone => {
      const inX = x >= zone.x[0] && x <= zone.x[1];
      const inY = y >= zone.y[0] && y <= zone.y[1];
      return inX && inY;
    });
  }

  /**
   * Calculate distance between two points (percentage-based)
   */
  private distance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  }

  /**
   * Check if term is near a highlighted player
   */
  private isNearHighlightedPlayer(
    term: TerminologyAnnotation,
    players: PlayerAnnotation[]
  ): boolean {
    const highlightedPlayers = players.filter(p => p.highlight);
    if (highlightedPlayers.length === 0) return false;

    return highlightedPlayers.some(player => {
      const dist = this.distance(term.x, term.y, player.x, player.y);
      return dist <= TERMINOLOGY_CONFIG.HIGHLIGHTED_PLAYER_DISTANCE_THRESHOLD * 100;
    });
  }

  /**
   * Calculate collision penalty with existing displayed terms
   */
  private calculateCollisionPenalty(
    term: TerminologyAnnotation,
    displayedTerms: ScoredTerm[],
    dimensions: CanvasDimensions
  ): number {
    if (displayedTerms.length === 0) return 0;

    const termPos = toCanvasCoords({ x: term.x, y: term.y }, dimensions);
    const threshold = Math.min(
      dimensions.width * TERMINOLOGY_CONFIG.COLLISION_THRESHOLD,
      dimensions.height * TERMINOLOGY_CONFIG.COLLISION_THRESHOLD
    );

    let penalty = 0;
    for (const displayed of displayedTerms) {
      const displayedPos = toCanvasCoords({ x: displayed.x, y: displayed.y }, dimensions);
      const dist = this.distance(termPos.x, termPos.y, displayedPos.x, displayedPos.y);
      
      if (dist < threshold) {
        penalty += 5; // Penalty for each collision
      }
    }

    return penalty;
  }

  /**
   * Score a term candidate
   */
  private scoreTerm(
    term: TerminologyAnnotation,
    players: PlayerAnnotation[],
    displayedTerms: ScoredTerm[],
    dimensions: CanvasDimensions,
    _currentTime: number
  ): ScoredTerm {
    const normalizedTerm = this.normalizeTerm(term.term);
    const isNew = !this.seenTerms.has(normalizedTerm);
    const isCoreTerm = CORE_TERMS.has(normalizedTerm);
    const nearHighlightedPlayer = this.isNearHighlightedPlayer(term, players);
    const inSafeZone = this.isInSafeZone(term.x, term.y);
    const collisionPenalty = this.calculateCollisionPenalty(term, displayedTerms, dimensions);

    let score = 0;

    // Priority bonuses
    if (isNew) score += 10;
    if (isCoreTerm) score += 5;
    if (nearHighlightedPlayer) score += 2;
    if (inSafeZone) score += 1;

    // Penalties
    score -= collisionPenalty;

    return {
      ...term,
      score,
      isNew,
      isCoreTerm,
      nearHighlightedPlayer,
      collisionPenalty,
    };
  }

  /**
   * Select top N terms to display based on scoring
   */
  selectTermsToDisplay(
    candidates: TerminologyAnnotation[],
    players: PlayerAnnotation[],
    dimensions: CanvasDimensions,
    currentTime: number
  ): InterpolatedTerminology[] {
    const normalizedTime = currentTime;
    const displayedTerms: ScoredTerm[] = [];

    // Filter out terms in cooldown (unless pinned)
    const eligibleCandidates = candidates.filter(term => {
      const normalizedTerm = this.normalizeTerm(term.term);
      const isPinned = this.isPinned(term.term);
      
      if (isPinned) return true;
      if (this.isInCooldown(normalizedTerm, normalizedTime)) return false;
      return true;
    });

    // Score all eligible candidates
    const scoredTerms = eligibleCandidates.map(term => 
      this.scoreTerm(term, players, displayedTerms, dimensions, normalizedTime)
    );

    // Sort by score (descending)
    scoredTerms.sort((a, b) => b.score - a.score);

    // Select top N terms
    const selectedTerms = scoredTerms.slice(0, TERMINOLOGY_CONFIG.MAX_TERMS_ON_SCREEN);

    // Update history and create interpolated terms
    const result: InterpolatedTerminology[] = [];
    
    for (const term of selectedTerms) {
      const normalizedTerm = this.normalizeTerm(term.term);
      
      // Update history
      const history = this.seenTerms.get(normalizedTerm);
      if (history) {
        history.lastShown = normalizedTime;
        history.timesShown += 1;
      } else {
        this.seenTerms.set(normalizedTerm, {
          term: term.term,
          lastShown: normalizedTime,
          timesShown: 1,
        });
      }

      // Track displayed terms
      if (!this.currentDisplayedTerms.has(normalizedTerm)) {
        this.currentDisplayedTerms.set(normalizedTerm, normalizedTime);
      }

      // Create interpolated term with opacity
      // startTime should be in seconds (matching InterpolatedTerminology interface)
      result.push({
        ...term,
        opacity: 1,
        startTime: normalizedTime / 1000, // Convert milliseconds to seconds
        duration: term.duration || TERMINOLOGY_CONFIG.DISPLAY_SECONDS,
      });
    }

    // Auto-dismiss terms that have been displayed for DISPLAY_SECONDS (unless pinned)
    const now = normalizedTime;
    for (const [term, startTime] of this.currentDisplayedTerms.entries()) {
      const elapsed = (now - startTime) / 1000; // Convert to seconds
      if (elapsed >= TERMINOLOGY_CONFIG.DISPLAY_SECONDS && !this.isPinned(term)) {
        this.currentDisplayedTerms.delete(term);
      }
    }

    return result;
  }

  /**
   * Get all terms for a frame (for drawer display)
   */
  getAllTermsForFrame(terminology: TerminologyAnnotation[]): TerminologyAnnotation[] {
    return terminology;
  }

  /**
   * Get seen terms history (for debugging/testing)
   */
  getSeenTerms(): Map<string, TermHistory> {
    return new Map(this.seenTerms);
  }

  /**
   * Clear displayed terms (for testing)
   */
  clearDisplayedTerms(): void {
    this.currentDisplayedTerms.clear();
  }
}
