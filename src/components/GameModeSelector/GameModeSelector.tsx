import React from 'react';
import styles from './GameModeSelector.module.css';
import { GameMode } from '../../types/game';

interface GameModeSelectorProps {
  gameMode: GameMode;
  onChange: (mode: GameMode) => void;
  disabled: boolean;
}

export const GameModeSelector: React.FC<GameModeSelectorProps> = ({
  gameMode,
  onChange,
  disabled
}) => {
  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(event.target.value as GameMode);
  };

  return (
    <div className={styles.container}>
      <label htmlFor="gameMode" className={styles.label}>
        Game Mode
      </label>
      <select
        id="gameMode"
        value={gameMode}
        onChange={handleChange}
        disabled={disabled}
        className={styles.select}
      >
        <option value="single">Single Player</option>
        <option value="multiplayer">Two Players</option>
      </select>
    </div>
  );
}; 