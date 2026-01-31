import { AnnotationData, TerminologyAnnotation } from '../types/annotations';

/**
 * Play-specific terms that are relevant to football plays
 * These are the types of terms we want to extract and show
 */
const PLAY_TERM_CATEGORIES = {
  formations: ['shotgun', 'i-formation', 'pistol', 'spread', 'trips', 'empty', 'wildcat', 'formation'],
  defensiveCoverage: ['cover 2', 'cover 3', 'cover 4', 'cover 1', 'man coverage', 'zone coverage', 'nickel', 'dime', 'cover 2 man', 'cover 3 man', 'cover 4 man', 'two high', 'deep safety', 'single high'],
  defensivePressure: ['blitz', 'zone blitz', 'corner blitz', 'safety blitz', 'all-out blitz', 'pass rush'],
  offensivePlays: ['play action', 'read option', 'screen pass', 'draw play', 'trap play', 'sweep', 'jet sweep', 'quarterback sneak'],
  routes: ['slant', 'out route', 'post route', 'fade route', 'comeback route', 'seam route', 'crossing route', 'go route', 'curl route'],
  blocking: ['pass protection', 'run blocking', 'downfield blocking', 'pulling lineman', 'backside block', 'pocket', 'clean pocket'],
  other: ['audible', 'huddle', 'snap', 'pre-snap motion', 'red zone', 'two-minute warning', 'line of scrimmage', 'line to gain'],
};

/**
 * Extract all unique play-specific terms from annotation data
 * Filters to only terms that match our play term categories
 */
export function extractPlayTerms(annotations: AnnotationData | null): TerminologyAnnotation[] {
  if (!annotations?.frames) return [];

  const termMap = new Map<string, TerminologyAnnotation>();
  
  // Collect all unique terms from all frames
  for (const frame of annotations.frames) {
    for (const term of frame.terminology) {
      const normalizedTerm = term.term.toLowerCase().trim();
      
      // Check if this term matches any of our play term categories
      // Use more flexible matching to catch variations
      const isPlayTerm = Object.values(PLAY_TERM_CATEGORIES).some(category =>
        category.some(categoryTerm => {
          const normalizedCategory = categoryTerm.toLowerCase();
          return normalizedTerm === normalizedCategory ||
                 normalizedTerm.includes(normalizedCategory) ||
                 normalizedCategory.includes(normalizedTerm) ||
                 normalizedTerm.replace(/\s+/g, '') === normalizedCategory.replace(/\s+/g, '');
        })
      );
      
      if (isPlayTerm && !termMap.has(normalizedTerm)) {
        termMap.set(normalizedTerm, term);
      }
    }
  }
  
  // Also check arrow labels for play terms
  for (const frame of annotations.frames) {
    for (const arrow of frame.arrows) {
      if (arrow.label) {
        const normalizedLabel = arrow.label.toLowerCase().trim();
        
        // Check if arrow label matches play terms
        const isPlayTerm = Object.values(PLAY_TERM_CATEGORIES).some(category =>
          category.some(categoryTerm => {
            const normalizedCategory = categoryTerm.toLowerCase();
            return normalizedLabel === normalizedCategory ||
                   normalizedLabel.includes(normalizedCategory) ||
                   normalizedCategory.includes(normalizedLabel) ||
                   normalizedLabel.replace(/\s+/g, '') === normalizedCategory.replace(/\s+/g, '');
          })
        );
        
        if (isPlayTerm && !termMap.has(normalizedLabel)) {
          // Create a terminology annotation from arrow label
          termMap.set(normalizedLabel, {
            x: (arrow.from[0] + arrow.to[0]) / 2,
            y: (arrow.from[1] + arrow.to[1]) / 2,
            term: arrow.label,
            definition: `Movement pattern: ${arrow.label}`,
          });
        }
      }
    }
  }
  
  return Array.from(termMap.values());
}

/**
 * Group play terms by category for better organization
 */
export function groupPlayTermsByCategory(terms: TerminologyAnnotation[]): Record<string, TerminologyAnnotation[]> {
  const grouped: Record<string, TerminologyAnnotation[]> = {
    formations: [],
    defensiveCoverage: [],
    defensivePressure: [],
    offensivePlays: [],
    routes: [],
    blocking: [],
    other: [],
  };
  
  for (const term of terms) {
    const normalizedTerm = term.term.toLowerCase().trim();
    
    // Check each category
    for (const [category, categoryTerms] of Object.entries(PLAY_TERM_CATEGORIES)) {
      const matches = categoryTerms.some(categoryTerm => {
        const normalizedCategory = categoryTerm.toLowerCase();
        return normalizedTerm === normalizedCategory ||
               normalizedTerm.includes(normalizedCategory) ||
               normalizedCategory.includes(normalizedTerm) ||
               normalizedTerm.replace(/\s+/g, '') === normalizedCategory.replace(/\s+/g, '');
      });
      
      if (matches) {
        if (!grouped[category]) {
          grouped[category] = [];
        }
        grouped[category].push(term);
        break; // Only add to first matching category
      }
    }
  }
  
  // Remove empty categories
  return Object.fromEntries(
    Object.entries(grouped).filter(([_, terms]) => terms.length > 0)
  );
}

/**
 * Get category display name
 */
export function getCategoryDisplayName(category: string): string {
  const displayNames: Record<string, string> = {
    formations: 'Formations',
    defensiveCoverage: 'Defensive Coverage',
    defensivePressure: 'Defensive Pressure',
    offensivePlays: 'Offensive Plays',
    routes: 'Routes',
    blocking: 'Blocking',
    other: 'Other',
  };
  return displayNames[category] || category;
}
