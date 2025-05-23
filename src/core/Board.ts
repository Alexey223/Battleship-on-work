import { Board, Cell, Ship } from '../types/game';

// Размер поля по умолчанию
export const DEFAULT_BOARD_SIZE = 10;

// Инициализация пустого поля
export const createEmptyBoard = (size: number): Board => {
  const cells: Cell[][] = Array(size).fill(null).map(() =>
    Array(size).fill(null).map(() => ({
      x: 0,
      y: 0,
      state: 'empty'
    }))
  );

  // Initialize cell coordinates
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      cells[y][x] = {
        x,
        y,
        state: 'empty'
      };
    }
  }

  return {
    size,
    cells,
    ships: []
  };
};

// Проверка возможности размещения корабля
export const canPlaceShip = (
  board: Board,
  x: number,
  y: number,
  size: number,
  isHorizontal: boolean
): boolean => {
  // Check if ship is within board boundaries
  if (isHorizontal) {
    if (x + size > board.size) return false;
  } else {
    if (y + size > board.size) return false;
  }

  // Check if cells are empty and not adjacent to other ships
  for (let i = -1; i <= size; i++) {
    for (let j = -1; j <= 1; j++) {
      const checkX = isHorizontal ? x + i : x + j;
      const checkY = isHorizontal ? y + j : y + i;

      if (checkX >= 0 && checkX < board.size && checkY >= 0 && checkY < board.size) {
        if (board.cells[checkY][checkX].state === 'ship') {
          return false;
        }
      }
    }
  }

  return true;
};

// Добавление корабля на поле
export const placeShip = (board: Board, ship: Ship): Board => {
  const newBoard = {
    ...board,
    ships: [...board.ships, ship]
  };

  // Update cells with ship information
  for (let i = 0; i < ship.size; i++) {
    const x = ship.direction === 'horizontal' ? ship.x + i : ship.x;
    const y = ship.direction === 'vertical' ? ship.y + i : ship.y;
    newBoard.cells[y][x].state = 'ship';
    newBoard.cells[y][x].shipId = ship.id;
    newBoard.cells[y][x].shipColor = ship.color;
  }

  return newBoard;
};

// Обработка выстрела по клетке
export function fireAtCell(board: Board, x: number, y: number): { board: Board; hit: boolean; sunkShipObject?: Ship } {
  const cell = board.cells[y][x];
  if (cell.state === 'hit' || cell.state === 'miss') {
    return { board, hit: false };
  }
  const newBoard: Board = {
    ...board,
    cells: board.cells.map(row => row.map(cell => ({ ...cell }))),
    ships: board.ships.map(ship => ({ ...ship, hits: ship.hits })) // Убедимся, что hits копируется
  };
  const targetCell = newBoard.cells[y][x];
  if (targetCell.state === 'ship' && targetCell.shipId !== undefined) {
    targetCell.state = 'hit';
    const shipIndex = newBoard.ships.findIndex(s => s.id === targetCell.shipId);
    if (shipIndex !== -1) {
      const ship = newBoard.ships[shipIndex];
      ship.hits += 1;
      if (ship.hits >= ship.size) {
        // Корабль потоплен, возвращаем его объект
        return { board: newBoard, hit: true, sunkShipObject: { ...ship } }; // Возвращаем копию корабля
      }
      return { board: newBoard, hit: true };
    }
    // Эта ветка не должна достигаться, если shipId корректный
    return { board: newBoard, hit: true }; 
  } else {
    targetCell.state = 'miss';
    return { board: newBoard, hit: false };
  }
}

// Новая функция для пометки клеток вокруг потопленного корабля
export const markCellsAroundSunkShip = (board: Board, sunkShip: Ship): Board => {
  const newBoard: Board = {
    ...board,
    cells: board.cells.map(row => row.map(cell => ({ ...cell }))),
    // ships не меняем, так как сам корабль уже потоплен (все hits === size)
  };

  const { x: shipX, y: shipY, size: shipSize, direction } = sunkShip;

  for (let i = 0; i < shipSize; i++) {
    const currentShipCellX = direction === 'horizontal' ? shipX + i : shipX;
    const currentShipCellY = direction === 'vertical' ? shipY + i : shipY;

    // Обход 8 соседних клеток для каждой палубы корабля
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue; // Пропускаем саму клетку корабля

        const adjacentX = currentShipCellX + dx;
        const adjacentY = currentShipCellY + dy;

        // Проверяем, что соседняя клетка в пределах доски
        if (
          adjacentX >= 0 && adjacentX < newBoard.size &&
          adjacentY >= 0 && adjacentY < newBoard.size
        ) {
          // Если клетка пустая, помечаем ее как промах
          if (newBoard.cells[adjacentY][adjacentX].state === 'empty') {
            newBoard.cells[adjacentY][adjacentX].state = 'miss';
          }
        }
      }
    }
  }
  return newBoard;
}; 