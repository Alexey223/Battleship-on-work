import React from 'react';
import { DifficultySelectorProps } from '../../types/game';
import styles from './DifficultySelector.module.css';

export const DifficultySelector: React.FC<DifficultySelectorProps> = ({
  difficulty,
  onChange,
  disabled,
}) => {
  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(event.target.value as 'easy' | 'medium' | 'hard');
  };

  return (
    <div className={styles.container}>
      <label htmlFor="difficulty" className={styles.label}>
        AI Difficulty:
      </label>
      <select
        id="difficulty"
        value={difficulty}
        onChange={handleChange}
        disabled={disabled}
        className={styles.select}
      >
        <option value="easy">Easy</option>
        <option value="medium">Medium</option>
        <option value="hard">Hard</option>
      </select>
    </div>
  );
}; 