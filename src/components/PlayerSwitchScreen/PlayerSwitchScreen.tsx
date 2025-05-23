import React from 'react';
import styles from './PlayerSwitchScreen.module.css';

interface PlayerSwitchScreenProps {
  nextPlayerName: string;
  onConfirm: () => void;
}

export const PlayerSwitchScreen: React.FC<PlayerSwitchScreenProps> = ({ nextPlayerName, onConfirm }) => {
  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h2>Передача хода</h2>
        <p>Ход переходит к игроку: <strong>{nextPlayerName}</strong></p>
        <p>Пожалуйста, передайте управление и убедитесь, что другой игрок не видит вашу доску.</p>
        <button onClick={onConfirm} className={styles.confirmButton}>
          Я готов, начать ход
        </button>
      </div>
    </div>
  );
}; 