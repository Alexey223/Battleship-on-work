import React from 'react';
import { GameBoardProps } from '../../types/game';
import { Cell } from '../Cell/Cell';
import styles from './GameBoard.module.css';

export const GameBoard: React.FC<GameBoardProps> = ({
  board,
  // isPlayerBoard, // Заголовок будет управляться из GameLayout
  onCellClick,
  // width, // Не используется напрямую для стилей div.board
  // height, // Не используется напрямую для стилей div.board
  // shipColor, // Передается через CSS custom property если нужно, или Cell сам определяет
  isCurrentPlayer,
  gameStatus,
  showShips,
  isOpponentBoard // Принимаем новый проп
}) => {
  const handleCellClick = (x: number, y: number) => {
    console.log(`[GameBoard.tsx] handleCellClick: x=${x}, y=${y}, gameStatus=${gameStatus}, isCurrentPlayer=${isCurrentPlayer}, isOpponentBoard=${isOpponentBoard}`);

    // Логика блокировки кликов
    if (gameStatus === 'finished') {
      console.log("[GameBoard.tsx] Клик заблокирован: игра завершена.");
      return;
    }

    // Блокируем клики по доске противника во время расстановки кораблей
    if (isOpponentBoard && gameStatus === 'placing_ships') {
      console.log("[GameBoard.tsx] Клик по доске противника заблокирован во время расстановки кораблей.");
      return;
    }

    // Старая логика блокировки по isCurrentPlayer - УДАЛИТЬ или ПЕРЕСМОТРЕТЬ
    // if (gameStatus === 'playing' && !isCurrentPlayer) {
    //   console.log("[GameBoard.tsx] Клик заблокирован: не ход этого игрока.");
    //   // return; // Этот return не должен быть здесь, если мы хотим, чтобы GameLayout решал, что делать
    // }

    onCellClick(x, y);
  };

  const letters = 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЭЮЯ'.split('');

  return (
    <div
      className={styles.board} // Этот div является гридом
      data-size={board.size} // Для grid-template-columns/rows: repeat(data-size, 1fr)
      data-current-player={isCurrentPlayer.toString()} // Для стилизации активной доски
      data-opponent-board={isOpponentBoard.toString()} // <--- Добавляем data-атрибут
      // shipColor тут не нужен, он используется Cell компонентом через CSS переменную или проп
      // style={{ '--ship-color': shipColor } as React.CSSProperties} // Можно так, если Cell использует CSS var
    >
      {/* Рендерим ячейки непосредственно внутри грида .board */}
      {board.cells.map((row, y) =>
        row.map((cell, x) => (
          <Cell
            key={`${x}-${y}`}
            x={x}
            y={y}
            cell={cell}
            onClick={() => handleCellClick(x, y)}
            showShipsForThisBoard={showShips} // Передаем проп в Cell
            // Передаем shipColor в Cell, если он нужен как проп
            // cell.shipColor уже есть в типе Cell, если он там устанавливается
          />
        ))
      )}
      {/* Координаты можно рендерить как оверлей поверх грида ячеек */}
      {/* Для этого им нужно абсолютное позиционирование относительно .board */}
      <div className={styles.coordinateOverlay}>
        <div className={styles.columnLabels}>
          {Array.from({ length: board.size }, (_, i) => (
            <div key={`col-${i}`} className={styles.coordinateLabel}>
              {i + 1}
            </div>
          ))}
        </div>
        <div className={styles.rowLabels}>
          {Array.from({ length: board.size }, (_, i) => (
            <div key={`row-${i}`} className={styles.coordinateLabel}>
              {letters[i % letters.length]}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}; 