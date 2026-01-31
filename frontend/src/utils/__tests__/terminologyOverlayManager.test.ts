import { describe, it, expect, beforeEach } from 'vitest';
import { TerminologyOverlayManager, TERMINOLOGY_CONFIG } from '../terminologyOverlayManager';
import { TerminologyAnnotation, PlayerAnnotation, CanvasDimensions } from '../../types/annotations';

describe('TerminologyOverlayManager', () => {
  let manager: TerminologyOverlayManager;
  const mockDimensions: CanvasDimensions = {
    width: 1920,
    height: 1080,
    offsetX: 0,
    offsetY: 0,
    scale: 1,
  };

  const mockPlayers: PlayerAnnotation[] = [
    { id: 'qb1', x: 50, y: 50, label: 'QB', highlight: true, color: '#FFFFFF' },
    { id: 'wr1', x: 20, y: 30, label: 'WR', highlight: false, color: '#FFFFFF' },
  ];

  beforeEach(() => {
    manager = new TerminologyOverlayManager();
    manager.reset(Date.now());
  });

  describe('Hard cap: MAX_TERMS_ON_SCREEN', () => {
    it('should limit displayed terms to MAX_TERMS_ON_SCREEN', () => {
      const terms: TerminologyAnnotation[] = [
        { x: 10, y: 10, term: 'Term 1', definition: 'Def 1', duration: 4 },
        { x: 20, y: 20, term: 'Term 2', definition: 'Def 2', duration: 4 },
        { x: 30, y: 30, term: 'Term 3', definition: 'Def 3', duration: 4 },
        { x: 40, y: 40, term: 'Term 4', definition: 'Def 4', duration: 4 },
      ];

      const selected = manager.selectTermsToDisplay(
        terms,
        mockPlayers,
        mockDimensions,
        Date.now()
      );

      expect(selected.length).toBeLessThanOrEqual(TERMINOLOGY_CONFIG.MAX_TERMS_ON_SCREEN);
    });
  });

  describe('Deduplication and cooldown', () => {
    it('should not show the same term twice in cooldown period', () => {
      const term: TerminologyAnnotation = {
        x: 10,
        y: 10,
        term: 'Shotgun',
        definition: 'Formation',
        duration: 4,
      };

      const time1 = Date.now();
      const selected1 = manager.selectTermsToDisplay(
        [term],
        mockPlayers,
        mockDimensions,
        time1
      );

      expect(selected1.length).toBe(1);
      expect(selected1[0].term).toBe('Shotgun');

      // Try to show same term within cooldown period
      const time2 = time1 + (TERMINOLOGY_CONFIG.COOLDOWN_SECONDS - 1) * 1000;
      const selected2 = manager.selectTermsToDisplay(
        [term],
        mockPlayers,
        mockDimensions,
        time2
      );

      // Should not show the term again (cooldown active)
      expect(selected2.length).toBe(0);
    });

    it('should allow showing term again after cooldown period', () => {
      const term: TerminologyAnnotation = {
        x: 10,
        y: 10,
        term: 'Shotgun',
        definition: 'Formation',
        duration: 4,
      };

      const time1 = Date.now();
      manager.selectTermsToDisplay([term], mockPlayers, mockDimensions, time1);

      // After cooldown period
      const time2 = time1 + (TERMINOLOGY_CONFIG.COOLDOWN_SECONDS + 1) * 1000;
      const selected2 = manager.selectTermsToDisplay(
        [term],
        mockPlayers,
        mockDimensions,
        time2
      );

      // Should be able to show again (cooldown expired)
      expect(selected2.length).toBeGreaterThan(0);
    });

    it('should prefer new terms over seen terms', () => {
      const seenTerm: TerminologyAnnotation = {
        x: 10,
        y: 10,
        term: 'Seen Term',
        definition: 'Def',
        duration: 4,
      };

      const newTerm: TerminologyAnnotation = {
        x: 20,
        y: 20,
        term: 'New Term',
        definition: 'Def',
        duration: 4,
      };

      // Show seen term first
      const time1 = Date.now();
      manager.selectTermsToDisplay([seenTerm], mockPlayers, mockDimensions, time1);

      // Both terms available, should prefer new term
      const time2 = time1 + 1000; // 1 second later (within cooldown for seen term)
      const selected = manager.selectTermsToDisplay(
        [seenTerm, newTerm],
        mockPlayers,
        mockDimensions,
        time2
      );

      // Should select new term (higher score)
      expect(selected.length).toBeGreaterThan(0);
      expect(selected[0].term).toBe('New Term');
    });
  });

  describe('Priority scoring', () => {
    it('should prioritize core terms', () => {
      const coreTerm: TerminologyAnnotation = {
        x: 10,
        y: 10,
        term: 'Shotgun',
        definition: 'Formation',
        duration: 4,
      };

      const regularTerm: TerminologyAnnotation = {
        x: 20,
        y: 20,
        term: 'Random Term',
        definition: 'Def',
        duration: 4,
      };

      const selected = manager.selectTermsToDisplay(
        [regularTerm, coreTerm],
        mockPlayers,
        mockDimensions,
        Date.now()
      );

      // Core term should be selected first
      expect(selected.length).toBeGreaterThan(0);
      expect(selected[0].term).toBe('Shotgun');
    });

    it('should prioritize terms near highlighted players', () => {
      const termNearPlayer: TerminologyAnnotation = {
        x: 52, // Close to QB at (50, 50)
        y: 52,
        term: 'Near Player',
        definition: 'Def',
        duration: 4,
      };

      const termFarFromPlayer: TerminologyAnnotation = {
        x: 80,
        y: 80,
        term: 'Far From Player',
        definition: 'Def',
        duration: 4,
      };

      const selected = manager.selectTermsToDisplay(
        [termFarFromPlayer, termNearPlayer],
        mockPlayers,
        mockDimensions,
        Date.now()
      );

      // Term near highlighted player should be preferred
      expect(selected.length).toBeGreaterThan(0);
      // Should prefer term near player (higher score)
      const selectedTerm = selected[0];
      expect(selectedTerm.x).toBeCloseTo(52, 0);
      expect(selectedTerm.y).toBeCloseTo(52, 0);
    });
  });

  describe('Pinning', () => {
    it('should keep pinned terms displayed', () => {
      const term: TerminologyAnnotation = {
        x: 10,
        y: 10,
        term: 'Pinned Term',
        definition: 'Def',
        duration: 4,
      };

      const time1 = Date.now();
      manager.selectTermsToDisplay([term], mockPlayers, mockDimensions, time1);
      manager.pinTerm('Pinned Term');

      // Try to show again within cooldown (should still show if pinned)
      const time2 = time1 + 1000;
      const selected = manager.selectTermsToDisplay(
        [term],
        mockPlayers,
        mockDimensions,
        time2
      );

      // Pinned term should still be displayed
      expect(selected.length).toBeGreaterThan(0);
      expect(selected.some(t => t.term === 'Pinned Term')).toBe(true);
    });

    it('should allow unpinning terms', () => {
      manager.pinTerm('Term');
      expect(manager.isPinned('Term')).toBe(true);

      manager.unpinTerm('Term');
      expect(manager.isPinned('Term')).toBe(false);
    });
  });

  describe('Auto-dismiss', () => {
    it('should auto-dismiss terms after DISPLAY_SECONDS', () => {
      const term: TerminologyAnnotation = {
        x: 10,
        y: 10,
        term: 'Auto Dismiss',
        definition: 'Def',
        duration: 4,
      };

      // Suppress unused variable warning
      void term;

      const time1 = Date.now();
      const selected1 = manager.selectTermsToDisplay(
        [term],
        mockPlayers,
        mockDimensions,
        time1
      );

      expect(selected1.length).toBeGreaterThan(0);

      // After DISPLAY_SECONDS, term should be dismissed (unless pinned)
      // Note: Auto-dismiss is handled by clearing currentDisplayedTerms
      // The term will still be in cooldown, so it won't show again
      const time2 = time1 + (TERMINOLOGY_CONFIG.DISPLAY_SECONDS + 1) * 1000;
      manager.clearDisplayedTerms(); // Simulate auto-dismiss
      const selected2 = manager.selectTermsToDisplay(
        [term],
        mockPlayers,
        mockDimensions,
        time2
      );

      // Should not show again (in cooldown period)
      expect(selected2.length).toBe(0);
    });
  });

  describe('Reset', () => {
    it('should reset seen terms history', () => {
      const term: TerminologyAnnotation = {
        x: 10,
        y: 10,
        term: 'Term',
        definition: 'Def',
        duration: 4,
      };

      manager.selectTermsToDisplay([term], mockPlayers, mockDimensions, Date.now());
      expect(manager.getSeenTerms().size).toBeGreaterThan(0);

      manager.reset(Date.now());
      expect(manager.getSeenTerms().size).toBe(0);
    });
  });
});
