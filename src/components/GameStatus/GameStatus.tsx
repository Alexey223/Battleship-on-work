import React from 'react';
import { GameState } from '../../types/game';
import styles from './GameStatus.module.css';

interface GameStatusProps {
  gameState: GameState;
}

export const GameStatus: React.FC<GameStatusProps> = ({ gameState }) => {
  const getStatusMessage = () => {
    switch (gameState.gameStatus) {
      case 'setup':
        return 'Place your ships on the board';
      case 'playing':
        const currentPlayer = gameState.players[gameState.currentPlayerIndex];
        return `${currentPlayer.name}'s turn`;
      case 'finished':
        if (gameState.winner === undefined) {
          return "It's a draw!";
        }
        return `${gameState.players[gameState.winner].name} wins!`;
      default:
        return '';
    }
  };

  const getHintMessage = () => {
    if (gameState.gameStatus !== 'playing') return '';

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const isAITurn = gameState.gameMode === 'single' && currentPlayer.name === 'AI';

    if (isAITurn) {
      return 'AI is thinking...';
    }

    return 'Click on a cell to make a shot';
  };

  return (
    <div className={styles.container}>
      <div className={styles.status}>
        <div className={styles.message}>{getStatusMessage()}</div>
        <div className={styles.hint}>{getHintMessage()}</div>
      </div>
      {gameState.gameStatus === 'playing' && (
        <div className={styles.currentPlayer}>
          <div 
            className={`
              ${styles.indicator} 
              ${gameState.currentPlayerIndex === 0 ? styles.indicatorPlayer1 : styles.indicatorPlayer2}
            `}
          />
          <span>{gameState.players[gameState.currentPlayerIndex].name}</span>
        </div>
      )}
    </div>
  );
}; 