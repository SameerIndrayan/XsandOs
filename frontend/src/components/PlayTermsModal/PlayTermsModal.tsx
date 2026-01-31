import React from 'react';
import { TerminologyAnnotation } from '../../types/annotations';
import { groupPlayTermsByCategory, getCategoryDisplayName } from '../../utils/playTermsExtractor';
import styles from './PlayTermsModal.module.css';

interface PlayTermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  terms: TerminologyAnnotation[];
}

export const PlayTermsModal: React.FC<PlayTermsModalProps> = ({ isOpen, onClose, terms }) => {
  if (!isOpen) return null;

  const groupedTerms = groupPlayTermsByCategory(terms);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Play Terms</h2>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        <div className={styles.content}>
          {Object.keys(groupedTerms).length === 0 ? (
            <p className={styles.noTerms}>No play-specific terms found for this play.</p>
          ) : (
            Object.entries(groupedTerms).map(([category, categoryTerms]) => (
              <div key={category} className={styles.category}>
                <h3 className={styles.categoryTitle}>
                  {getCategoryDisplayName(category)}
                </h3>
                <div className={styles.termsList}>
                  {categoryTerms.map((term, index) => (
                    <div key={index} className={styles.termCard}>
                      <div className={styles.termName}>{term.term}</div>
                      <div className={styles.termDefinition}>{term.definition}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
