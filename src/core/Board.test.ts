import { Board, Ship } from '../types/game';
import {
  createEmptyBoard,
  canPlaceShip,
  placeShip,
  fireAtCell,
  DEFAULT_BOARD_SIZE,
} from './Board';

describe('Board', () => {
  let board: Board;

  beforeEach(() => {
    board = createEmptyBoard(10);
  });

  describe('createEmptyBoard', () => {
    it('should create a board with the specified size', () => {
      expect(board.size).toBe(10);
      expect(board.cells.length).toBe(10);
      expect(board.cells[0].length).toBe(10);
    });

    it('should initialize all cells as empty', () => {
      for (let y = 0; y < board.size; y++) {
        for (let x = 0; x < board.size; x++) {
          expect(board.cells[y][x].state).toBe('empty');
        }
      }
    });
  });

  describe('placeShip', () => {
    it('should place a horizontal ship correctly', () => {
      const ship1: Ship = {
        id: 1,
        size: 3,
        direction: 'horizontal',
        x: 0,
        y: 0,
        hits: 0,
        cells: [],
        color: '#FF0000'
      };
      board = placeShip(board, ship1);

      expect(board.cells[0][0].state).toBe('ship');
      expect(board.cells[0][1].state).toBe('ship');
      expect(board.cells[0][2].state).toBe('ship');
      expect(board.cells[0][3].state).toBe('empty');
    });

    it('should place a vertical ship correctly', () => {
      const ship: Ship = {
        id: 2,
        size: 2,
        direction: 'vertical',
        x: 5,
        y: 5,
        hits: 0,
        cells: [],
        color: '#00FF00'
      };
      board = placeShip(board, ship);

      expect(board.cells[5][5].state).toBe('ship');
      expect(board.cells[6][5].state).toBe('ship');
      expect(board.cells[7][5].state).toBe('empty');
    });

    it('should not allow ships to overlap', () => {
      const ship1: Ship = {
        id: 1,
        size: 3,
        direction: 'horizontal',
        x: 0,
        y: 0,
        hits: 0,
        cells: [],
        color: '#FF0000'
      };
      board = placeShip(board, ship1);

      const ship2: Ship = {
        id: 2,
        size: 2,
        direction: 'vertical',
        x: 1,
        y: 1,
        hits: 0,
        cells: [],
        color: '#00FF00'
      };
      board = placeShip(board, ship2);

      expect(board.cells[1][1].state).toBe('ship');
    });
  });

  describe('canPlaceShip', () => {
    it('should allow placing a ship within board boundaries', () => {
      expect(canPlaceShip(board, 0, 0, 3, true)).toBe(true);
      expect(canPlaceShip(board, 0, 0, 3, false)).toBe(true);
    });

    it('should not allow placing a ship outside board boundaries', () => {
      expect(canPlaceShip(board, 8, 8, 3, true)).toBe(false);
      expect(canPlaceShip(board, 8, 8, 3, false)).toBe(false);
    });

    it('should not allow placing ships adjacent to each other', () => {
      const ship: Ship = {
        id: 1,
        size: 1,
        direction: 'horizontal',
        x: 2,
        y: 2,
        hits: 0,
        cells: [],
        color: '#FF0000'
      };
      board = placeShip(board, ship);

      expect(canPlaceShip(board, 1, 1, 1, true)).toBe(false);
      expect(canPlaceShip(board, 2, 1, 1, true)).toBe(false);
      expect(canPlaceShip(board, 3, 1, 1, true)).toBe(false);
    });
  });

  describe('fireAtCell', () => {
    it('should handle firing at empty cell (miss)', () => {
      const board = createEmptyBoard(10);
      const { board: newBoard, hit } = fireAtCell(board, 0, 0);
      expect(hit).toBe(false);
      expect(newBoard.cells[0][0].state).toBe('miss');
    });

    it('should handle firing at ship (hit and sink)', () => {
      let board = createEmptyBoard(10);
      const ship: Ship = {
        id: 1,
        size: 1,
        direction: 'horizontal',
        x: 2,
        y: 2,
        hits: 0,
        cells: [],
        color: '#FF0000'
      };
      board = placeShip(board, ship);
      const { board: newBoard, hit, sunkShipObject } = fireAtCell(board, 2, 2);
      expect(hit).toBe(true);
      expect(sunkShipObject).toBeDefined();
      expect(sunkShipObject?.id).toBe(ship.id);
      expect(newBoard.cells[2][2].state).toBe('hit');
      const updatedShip = newBoard.ships.find(s => s.id === ship.id);
      expect(updatedShip?.hits).toBe(1);
    });
  });
}); 