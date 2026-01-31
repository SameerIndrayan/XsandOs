import React from 'react';
import styles from './TermsButton.module.css';

interface TermsButtonProps {
  termCount: number;
  onClick: () => void;
}

export const TermsButton: React.FC<TermsButtonProps> = ({ termCount, onClick }) => {
  return (
    <button className={styles.button} onClick={onClick} aria-label="View all terms">
      <span className={styles.icon}>📚</span>
      <span className={styles.label}>Terms</span>
      {termCount > 0 && (
        <span className={styles.badge}>{termCount}</span>
      )}
    </button>
  );
};
