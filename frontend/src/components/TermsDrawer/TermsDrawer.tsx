import React, { useState } from 'react';
import { TerminologyAnnotation, PlayerAnnotation } from '../../types/annotations';
import styles from './TermsDrawer.module.css';

interface TermsDrawerProps {
  terms: TerminologyAnnotation[];
  players?: PlayerAnnotation[]; // Optional, for future use
  isOpen: boolean;
  onClose: () => void;
  onTermHover?: (term: TerminologyAnnotation | null) => void;
  onTermClick?: (term: TerminologyAnnotation) => void;
}

export const TermsDrawer: React.FC<TermsDrawerProps> = ({
  terms,
  isOpen,
  onClose,
  onTermHover,
  onTermClick,
}) => {
  const [hoveredTerm, setHoveredTerm] = useState<TerminologyAnnotation | null>(null);

  const handleTermHover = (term: TerminologyAnnotation | null) => {
    setHoveredTerm(term);
    onTermHover?.(term);
  };

  const handleTermClick = (term: TerminologyAnnotation) => {
    onTermClick?.(term);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className={styles.backdrop} onClick={onClose} />
      
      {/* Drawer */}
      <div className={styles.drawer}>
        <div className={styles.header}>
          <h3 className={styles.title}>Terms ({terms.length})</h3>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close drawer">
            ×
          </button>
        </div>

        <div className={styles.content}>
          {terms.length === 0 ? (
            <p className={styles.empty}>No terms available for this frame</p>
          ) : (
            <ul className={styles.termList}>
              {terms.map((term, index) => (
                <li
                  key={`${term.term}-${index}`}
                  className={`${styles.termItem} ${
                    hoveredTerm?.term === term.term ? styles.termItemHovered : ''
                  }`}
                  onMouseEnter={() => handleTermHover(term)}
                  onMouseLeave={() => handleTermHover(null)}
                  onClick={() => handleTermClick(term)}
                >
                  <div className={styles.termHeader}>
                    <span className={styles.termName}>{term.term}</span>
                    <span className={styles.termPosition}>
                      ({Math.round(term.x)}, {Math.round(term.y)})
                    </span>
                  </div>
                  <p className={styles.termDefinition}>{term.definition}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
};
