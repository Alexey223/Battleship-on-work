import { GameState, Board, Cell, AIDifficulty } from '../types/game';

/**
 * Получает список всех доступных для выстрела клеток на доске
 */
const getAvailableCells = (board: Board): { x: number; y: number }[] => {
  const availableCells: { x: number; y: number }[] = [];
  
  for (let y = 0; y < board.size; y++) {
    for (let x = 0; x < board.size; x++) {
      const cell = board.cells[y][x];
      // Добавляем только клетки, в которые еще не стреляли
      if (cell.state !== 'hit' && cell.state !== 'miss') {
        availableCells.push({ x, y });
      }
    }
  }
  
  return availableCells;
};

/**
 * Проверяет, находится ли клетка в пределах доски
 */
const isWithinBoard = (x: number, y: number, boardSize: number): boolean => {
  return x >= 0 && x < boardSize && y >= 0 && y < boardSize;
};

/**
 * Получает список соседних клеток для данной координаты
 */
const getNeighboringCells = (x: number, y: number, board: Board): { x: number; y: number }[] => {
  const neighbors: { x: number; y: number }[] = [];
  const directions = [
    { dx: 0, dy: -1 }, // вверх
    { dx: 0, dy: 1 },  // вниз
    { dx: -1, dy: 0 }, // влево
    { dx: 1, dy: 0 },  // вправо
  ];

  for (const { dx, dy } of directions) {
    const newX = x + dx;
    const newY = y + dy;

    if (isWithinBoard(newX, newY, board.size)) {
      const cell = board.cells[newY][newX];
      // Добавляем только клетки, в которые еще не стреляли
      if (cell.state !== 'hit' && cell.state !== 'miss') {
        neighbors.push({ x: newX, y: newY });
      }
    }
  }

  return neighbors;
};

/**
 * Находит последнее попадание на доске
 */
const findLastHit = (board: Board): { x: number; y: number } | null => {
  for (let y = 0; y < board.size; y++) {
    for (let x = 0; x < board.size; x++) {
      if (board.cells[y][x].state === 'hit') {
        return { x, y };
      }
    }
  }
  return null;
};

/**
 * Выбирает случайную клетку для выстрела из доступных
 */
const selectRandomCell = (availableCells: { x: number; y: number }[]): { x: number; y: number } => {
  const randomIndex = Math.floor(Math.random() * availableCells.length);
  return availableCells[randomIndex];
};

/**
 * Находит клетки с наибольшей вероятностью наличия корабля
 */
const findHighProbabilityCells = (board: Board): { x: number; y: number }[] => {
  const probabilities: { x: number; y: number; score: number }[] = [];
  
  // Проходим по всем клеткам доски
  for (let y = 0; y < board.size; y++) {
    for (let x = 0; x < board.size; x++) {
      const cell = board.cells[y][x];
      
      // Пропускаем уже обстрелянные клетки
      if (cell.state === 'hit' || cell.state === 'miss') {
        continue;
      }

      let score = 0;
      
      // Проверяем соседние клетки
      const directions = [
        { dx: 0, dy: -1 }, // вверх
        { dx: 0, dy: 1 },  // вниз
        { dx: -1, dy: 0 }, // влево
        { dx: 1, dy: 0 },  // вправо
      ];

      for (const { dx, dy } of directions) {
        const newX = x + dx;
        const newY = y + dy;

        if (isWithinBoard(newX, newY, board.size)) {
          const neighborCell = board.cells[newY][newX];
          // Увеличиваем вероятность, если рядом есть попадание
          if (neighborCell.state === 'hit') {
            score += 2;
          }
          // Уменьшаем вероятность, если рядом есть промах
          else if (neighborCell.state === 'miss') {
            score -= 1;
          }
        }
      }

      probabilities.push({ x, y, score });
    }
  }

  // Сортируем клетки по вероятности
  probabilities.sort((a, b) => b.score - a.score);

  // Возвращаем координаты клеток с наивысшей вероятностью
  return probabilities
    .filter(p => p.score === probabilities[0].score)
    .map(p => ({ x: p.x, y: p.y }));
};

/**
 * Основная функция AI для выбора клетки для выстрела
 */
export const makeAIShot = (gameState: GameState): { x: number; y: number } => {
  // Получаем доску противника (игрока)
  const targetPlayerIndex = gameState.currentPlayerIndex === 0 ? 1 : 0;
  const targetBoard = gameState.players[targetPlayerIndex].board;

  // Получаем список доступных клеток
  const availableCells = getAvailableCells(targetBoard);

  // Если нет доступных клеток (не должно происходить в нормальной игре)
  if (availableCells.length === 0) {
    throw new Error('No available cells for AI shot');
  }

  // Выбираем стратегию в зависимости от уровня сложности
  switch (gameState.aiDifficulty) {
    case 'easy':
      // Легкий уровень: просто случайный выстрел
      return selectRandomCell(availableCells);

    case 'medium': {
      // Средний уровень: стреляем по соседним клеткам после попадания
      const lastHit = findLastHit(targetBoard);
      if (lastHit) {
        const neighboringCells = getNeighboringCells(lastHit.x, lastHit.y, targetBoard);
        if (neighboringCells.length > 0) {
          return selectRandomCell(neighboringCells);
        }
      }
      return selectRandomCell(availableCells);
    }

    case 'hard': {
      // Сложный уровень: используем вероятностный подход
      const lastHit = findLastHit(targetBoard);
      if (lastHit) {
        // Если есть попадание, сначала проверяем соседние клетки
        const neighboringCells = getNeighboringCells(lastHit.x, lastHit.y, targetBoard);
        if (neighboringCells.length > 0) {
          return selectRandomCell(neighboringCells);
        }
      }

      // Ищем клетки с высокой вероятностью наличия корабля
      const highProbabilityCells = findHighProbabilityCells(targetBoard);
      if (highProbabilityCells.length > 0) {
        return selectRandomCell(highProbabilityCells);
      }

      // Если ничего не нашли, делаем случайный выстрел
      return selectRandomCell(availableCells);
    }

    default:
      return selectRandomCell(availableCells);
  }
}; 