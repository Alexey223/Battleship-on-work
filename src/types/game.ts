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
  id: number;
  name: string;
  board: Board;
}

export type GameStatus = 'setup' | 'waiting_for_opponent' | 'placing_ships' | 'playing' | 'finished' | 'switching_player';

export type AIDifficulty = 'easy' | 'medium' | 'hard';

export type GameMode = 'single' | 'multiplayer';

export type BoardSize = 5 | 8 | 10;

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  gameStatus: GameStatus;
  winner?: number; // undefined - игра не закончена, -1 - ничья, 0 или 1 - индекс победителя
  aiDifficulty: AIDifficulty;
  gameMode: GameMode;
  boardSize: BoardSize;
}

// UI Types
export interface GameLayoutProps {
  gameState: GameState;
  onCellClick: (x: number, y: number, playerIndex: number) => void;
  onBoardUpdate: (playerIndex: number, board: Board) => void;
}

export interface GameBoardProps {
  board: Board;
  onCellClick: (x: number, y: number) => void;
  isCurrentPlayer: boolean;
  gameStatus: GameStatus;
  showShips: boolean;
  isOpponentBoard: boolean;
}

export interface CellProps {
  x: number;
  y: number;
  cell: Cell;
  onClick: () => void;
  showShipsForThisBoard: boolean;
}

export interface PlayerIndicatorProps {
  currentPlayer: Player;
}

export interface DifficultySelectorProps {
  difficulty: AIDifficulty;
  onChange: (difficulty: AIDifficulty) => void;
  disabled: boolean;
}

export interface GameModeSelectorProps {
  gameMode: GameMode;
  onChange: (mode: GameMode) => void;
  disabled: boolean;
}

export interface BoardSizeSelectorProps {
  boardSize: BoardSize;
  onChange: (size: BoardSize) => void;
  disabled?: boolean;
} 