import React from 'react';
import { PlayerIndicatorProps } from '../../types/game';
import styles from './PlayerIndicator.module.css';

export const PlayerIndicator: React.FC<PlayerIndicatorProps> = ({ currentPlayer }) => {
  return (
    <div className={styles.indicator}>
      <h2>Ход игрока: {currentPlayer.name}</h2>
    </div>
  );
}; 