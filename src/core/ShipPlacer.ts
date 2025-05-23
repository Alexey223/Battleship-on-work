import { Board, Ship } from '../types/game';
import { canPlaceShip } from './Board';

const SHIP_COLORS = [
  '#FF0000', // Red
  '#00FF00', // Green
  '#0000FF', // Blue
  '#FFFF00', // Yellow
  '#FF00FF', // Magenta
];

export const placeShipsRandomly = (board: Board): Board => {
  // Standard Battleship ship sizes: 4, 3, 3, 2, 2, 2, 1, 1, 1, 1
  const shipSizes = [4, 3, 3, 2, 2, 2, 1, 1, 1, 1];
  let newBoard = { ...board };
  let shipId = 1;

  for (const size of shipSizes) {
    let placed = false;
    let attempts = 0;
    const maxAttempts = 100;

    while (!placed && attempts < maxAttempts) {
      const x = Math.floor(Math.random() * (board.size - size + 1));
      const y = Math.floor(Math.random() * (board.size - size + 1));
      const isHorizontal = Math.random() > 0.5;

      if (canPlaceShip(newBoard, x, y, size, isHorizontal)) {
        const ship: Ship = {
          id: shipId++,
          size,
          direction: isHorizontal ? 'horizontal' : 'vertical',
          x,
          y,
          hits: 0,
          cells: [],
          color: SHIP_COLORS[shipId % SHIP_COLORS.length]
        };

        newBoard = {
          ...newBoard,
          ships: [...newBoard.ships, ship]
        };

        // Update cells with ship information
        for (let i = 0; i < size; i++) {
          const shipX = isHorizontal ? x + i : x;
          const shipY = isHorizontal ? y : y + i;
          newBoard.cells[shipY][shipX].state = 'ship';
          newBoard.cells[shipY][shipX].shipId = ship.id;
          newBoard.cells[shipY][shipX].shipColor = ship.color;
        }

        placed = true;
      }
      attempts++;
    }

    if (!placed) {
      throw new Error(`Could not place ship of size ${size} after ${maxAttempts} attempts`);
    }
  }

  return newBoard;
}; 