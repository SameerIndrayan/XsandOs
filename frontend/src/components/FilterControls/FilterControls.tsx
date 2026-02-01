import { useState } from 'react';
import { AnnotationFilters, FilterPreset, FILTER_PRESETS } from '../../types/filters';
import { InterpolatedFrame } from '../../types/annotations';
import { getFilterStats } from '../../utils/annotationFilters';
import styles from './FilterControls.module.css';

interface FilterControlsProps {
  filters: AnnotationFilters;
  onFiltersChange: (filters: AnnotationFilters) => void;
  currentFrame: InterpolatedFrame | null;
}

export const FilterControls: React.FC<FilterControlsProps> = ({
  filters,
  onFiltersChange,
  currentFrame,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activePreset, setActivePreset] = useState<FilterPreset>('all');

  const handlePresetChange = (preset: FilterPreset) => {
    setActivePreset(preset);
    onFiltersChange(FILTER_PRESETS[preset]);
  };

  const handleFilterChange = (key: keyof AnnotationFilters, value: any) => {
    setActivePreset('custom');
    onFiltersChange({ ...filters, [key]: value });
  };

  const stats = currentFrame ? getFilterStats(currentFrame, filters) : null;

  if (!isOpen) {
    return (
      <button
        className={styles.toggleButton}
        onClick={() => setIsOpen(true)}
        title="Filter Annotations"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
        </svg>
        Filters
      </button>
    );
  }

  return (
    <div className={styles.filterControls}>
      <div className={styles.header}>
        <div className={styles.title}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
          </svg>
          Annotation Filters
        </div>
        <button
          className={styles.closeButton}
          onClick={() => setIsOpen(false)}
          title="Close"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Presets */}
      <div className={styles.presets}>
        <button
          className={`${styles.presetButton} ${activePreset === 'all' ? styles.active : ''}`}
          onClick={() => handlePresetChange('all')}
        >
          All
        </button>
        <button
          className={`${styles.presetButton} ${activePreset === 'key-players' ? styles.active : ''}`}
          onClick={() => handlePresetChange('key-players')}
        >
          Key
        </button>
        <button
          className={`${styles.presetButton} ${activePreset === 'minimal' ? styles.active : ''}`}
          onClick={() => handlePresetChange('minimal')}
        >
          Minimal
        </button>
      </div>

      {/* Annotation Types */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Annotation Types</div>
        <div className={styles.checkboxGroup}>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={filters.showPlayers}
              onChange={(e) => handleFilterChange('showPlayers', e.target.checked)}
            />
            <span className={styles.checkboxLabel}>Players</span>
          </label>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={filters.showArrows}
              onChange={(e) => handleFilterChange('showArrows', e.target.checked)}
            />
            <span className={styles.checkboxLabel}>Arrows</span>
          </label>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={filters.showTerminology}
              onChange={(e) => handleFilterChange('showTerminology', e.target.checked)}
            />
            <span className={styles.checkboxLabel}>Terminology</span>
          </label>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={filters.showCallouts}
              onChange={(e) => handleFilterChange('showCallouts', e.target.checked)}
            />
            <span className={styles.checkboxLabel}>Callouts</span>
          </label>
        </div>
      </div>

      {/* Player Filters */}
      {filters.showPlayers && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Player Filters</div>
          <div className={styles.checkboxGroup}>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={filters.showHighlightedPlayersOnly}
                onChange={(e) => handleFilterChange('showHighlightedPlayersOnly', e.target.checked)}
              />
              <span className={styles.checkboxLabel}>Highlighted Only</span>
            </label>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={filters.showOffensivePlayers}
                onChange={(e) => handleFilterChange('showOffensivePlayers', e.target.checked)}
              />
              <span className={styles.checkboxLabel}>Offensive</span>
            </label>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={filters.showDefensivePlayers}
                onChange={(e) => handleFilterChange('showDefensivePlayers', e.target.checked)}
              />
              <span className={styles.checkboxLabel}>Defensive</span>
            </label>
          </div>
        </div>
      )}

      {/* Priority Level */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Priority Level</div>
        <div className={styles.checkboxGroup}>
          <label className={styles.checkbox}>
            <input
              type="radio"
              name="priority"
              checked={filters.priorityLevel === 'all'}
              onChange={() => handleFilterChange('priorityLevel', 'all')}
            />
            <span className={styles.checkboxLabel}>All Annotations</span>
          </label>
          <label className={styles.checkbox}>
            <input
              type="radio"
              name="priority"
              checked={filters.priorityLevel === 'high'}
              onChange={() => handleFilterChange('priorityLevel', 'high')}
            />
            <span className={styles.checkboxLabel}>High Priority</span>
          </label>
          <label className={styles.checkbox}>
            <input
              type="radio"
              name="priority"
              checked={filters.priorityLevel === 'critical'}
              onChange={() => handleFilterChange('priorityLevel', 'critical')}
            />
            <span className={styles.checkboxLabel}>Critical Only</span>
          </label>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className={styles.stats}>
          <div className={styles.statItem}>
            <div className={styles.statValue}>{stats.shown}</div>
            <div className={styles.statLabel}>Shown</div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statValue}>{stats.hidden}</div>
            <div className={styles.statLabel}>Hidden</div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statValue}>{stats.total}</div>
            <div className={styles.statLabel}>Total</div>
          </div>
        </div>
      )}
    </div>
  );
};
