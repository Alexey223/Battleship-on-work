import React from 'react';
import { clearGameState } from '../../utils/storage';
import styles from './GameControls.module.css';

interface GameControlsProps {
  onRestart: () => void;
  onClearSave: () => void;
  gameStatus: 'setup' | 'playing' | 'finished';
}

export const GameControls: React.FC<GameControlsProps> = ({
  onRestart,
  onClearSave,
  gameStatus
}) => {
  const handleClearSave = () => {
    if (window.confirm('Are you sure you want to clear saved game?')) {
      clearGameState();
      onClearSave();
    }
  };

  return (
    <div className={styles.container}>
      <button
        className={styles.button}
        onClick={onRestart}
        title="Start a new game"
      >
        New Game
      </button>
      {gameStatus !== 'setup' && (
        <button
          className={`${styles.button} ${styles.danger}`}
          onClick={handleClearSave}
          title="Clear saved game"
        >
          Clear Save
        </button>
      )}
    </div>
  );
}; 