// Типы и интерфейсы для игры "Морской Бой"

export type CellState = 'empty' | 'ship' | 'hit' | 'miss' | 'sunk_ship_segment';

export interface Cell {
  x: number;
  y: number;
  state: CellState;
  shipId?: number;
  shipColor?: string;
}

export type ShipDirection = 'horizontal' | 'vertical';

export interface Position {
  x: number;
  y: number;
}

export interface Ship {
  id: number;
  size: number;
  hits: number;
  cells: Cell[];
  color: string;
  direction: ShipDirection;
  x: number;
  y: number;
  isSunk?: boolean;
}

export interface Board {
  size: number; // обычно 10
  cells: Cell[][];
  ships: Ship[];
}

export interface Player {
  id: number; // В контексте сервера это может быть playerId (string) или числовой индекс
  name: string;
  board: Board;
  // ws?: WebSocket; // На сервере WebSocket соединение может храниться отдельно
}

export type GameStatus = 'setup' | 'waiting_for_opponent' | 'placing_ships' | 'playing' | 'finished' | 'switching_player';

export type AIDifficulty = 'easy' | 'medium' | 'hard'; // Остается для справки, если AI будет на сервере

export type GameMode = 'single' | 'multiplayer'; // На сервере всегда будет 'multiplayer' контекст

export type BoardSize = 5 | 8 | 10;

// Состояние игры, как оно может выглядеть на сервере
export interface ServerGameState {
  gameId: string;
  players: [Player | null, Player | null]; // Массив игроков, может быть null если игрок не подключен
  currentPlayerIndex: 0 | 1;
  gameStatus: GameStatus;
  winner?: 0 | 1; // Индекс победившего игрока
  boardSize: BoardSize;
  player0ShipsPlaced?: boolean;
  player1ShipsPlaced?: boolean;
  // Расстановка кораблей может управляться отдельно или быть частью Player.board
  // shipsPlaced: [boolean, boolean]; // Флаги, что оба игрока расставили корабли
  // lastShot?: { x:number, y:number, playerIndex: 0|1, result: CellState };
}

// UI Types из оригинального game.ts здесь не нужны, т.к. это серверная логика.
// Оставляем только основные типы, которые могут быть использованы для описания состояния игры на сервере. 