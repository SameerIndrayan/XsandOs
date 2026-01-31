import React from 'react';
import styles from './PlayTermsButton.module.css';

interface PlayTermsButtonProps {
  onClick: () => void;
  termCount: number;
}

export const PlayTermsButton: React.FC<PlayTermsButtonProps> = ({ onClick, termCount }) => {
  return (
    <button
      className={styles.playTermsButton}
      onClick={onClick}
      title={`View play-specific terms (${termCount} terms)`}
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className={styles.icon}>
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
      </svg>
      <span className={styles.label}>Play Terms</span>
      {termCount > 0 && <span className={styles.badge}>{termCount}</span>}
    </button>
  );
};
