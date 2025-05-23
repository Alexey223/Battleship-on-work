import { ServerGameState, Board as ServerBoard, Ship as ServerShip } from './game';

// Типы сообщений от клиента к серверу
export enum ClientToServerMessageType {
  CREATE_GAME = 'CREATE_GAME',
  JOIN_GAME = 'JOIN_GAME',
  PLACE_SHIPS = 'PLACE_SHIPS',
  MAKE_SHOT = 'MAKE_SHOT',
  // CHAT_MESSAGE = 'CHAT_MESSAGE', // Возможно в будущем
}

export interface CreateGameClientMessage {
  type: ClientToServerMessageType.CREATE_GAME;
  // payload: {}; // Пока нет данных для CREATE_GAME, сервер просто создает игру
}

export interface JoinGameClientMessage {
  type: ClientToServerMessageType.JOIN_GAME;
  payload: {
    gameId: string;
  };
}

export interface PlaceShipsClientMessage {
  type: ClientToServerMessageType.PLACE_SHIPS;
  payload: {
    ships: ServerShip[]; // Полная конфигурация кораблей игрока
    // gameId: string; // gameId будет известен на сервере через WebSocket сессию/контекст
  };
}

export interface MakeShotClientMessage {
  type: ClientToServerMessageType.MAKE_SHOT;
  payload: {
    x: number;
    y: number;
    // gameId: string; // gameId будет известен на сервере
  };
}

export type ClientMessage = 
  | CreateGameClientMessage 
  | JoinGameClientMessage 
  | PlaceShipsClientMessage 
  | MakeShotClientMessage;

// Типы сообщений от сервера к клиенту
export enum ServerToClientMessageType {
  GAME_CREATED = 'GAME_CREATED',
  PLAYER_JOINED = 'PLAYER_JOINED', // Уведомление другому игроку
  GAME_START = 'GAME_START',
  GAME_UPDATE = 'GAME_UPDATE',
  SHOT_RESULT = 'SHOT_RESULT',
  GAME_OVER = 'GAME_OVER',
  ERROR = 'ERROR',
  OPPONENT_DISCONNECTED = 'OPPONENT_DISCONNECTED',
  // CHAT_MESSAGE = 'CHAT_MESSAGE', // Возможно в будущем
}

export interface GameCreatedServerMessage {
  type: ServerToClientMessageType.GAME_CREATED;
  payload: {
    gameId: string;
    playerId: string; // ID этого игрока на сервере
    playerIndex: 0 | 1; // Индекс игрока в массиве игроков (0 или 1)
  };
}

export interface PlayerJoinedServerMessage {
  type: ServerToClientMessageType.PLAYER_JOINED;
  payload: {
    opponentName?: string; // Имя присоединившегося оппонента (если есть)
    playerIndex: 0 | 1; // Индекс игрока, который присоединился
    // gameId: string; // Для подтверждения, что это касается текущей игры
  };
}

export interface GameStartServerMessage {
  type: ServerToClientMessageType.GAME_START;
  payload: {
    initialGameState: Partial<ServerGameState>; // Начальное состояние игры (доски, текущий игрок)
                                     // Сервер может не отправлять доски с кораблями оппонента сразу
    playerIndex: 0 | 1; // Индекс этого клиента
  };
}

export interface GameUpdateServerMessage {
  type: ServerToClientMessageType.GAME_UPDATE;
  payload: {
    updatedBoard: ServerBoard; // Обновленная доска игрока, по которому стреляли
    playerIndexOfBoard: 0 | 1; // Чья доска была обновлена
    currentPlayerIndex: 0 | 1;
    gameStatus: ServerGameState['gameStatus'];
    // Можно добавить сюда информацию о последнем выстреле, если не использовать отдельное SHOT_RESULT
  };
}

export interface ShotResultServerMessage {
  type: ServerToClientMessageType.SHOT_RESULT;
  payload: {
    shootingPlayerIndex: 0 | 1; // Индекс игрока, который сделал выстрел
    targetPlayerIndex: 0 | 1;   // Индекс игрока, по которому стреляли (onBoardOfPlayerIndex)
    x: number;
    y: number;
    result: 'hit' | 'miss' | 'sunk'; // 'sunk' может быть основным результатом, а shipId и isSunkShipMarked - деталями
    newCellState: string; // Точное новое состояние ячейки (например, 'hit', 'miss', 'sunk_ship_segment')
    updatedTargetBoard: ServerBoard; // Обновленная доска атакованного игрока (используем ServerBoard)
    nextPlayerIndex: 0 | 1;    // Чей ход следующий
    sunkShip?: ServerShip;             // Информация о потопленном корабле, если есть (используем ServerShip)
    isGameOver: boolean;
    winnerIndex?: 0 | 1 | null; // null для ничьи, undefined если игра не окончена
  };
}

export interface GameOverServerMessage {
  type: ServerToClientMessageType.GAME_OVER;
  payload: {
    winnerId?: string; // ID победившего игрока (если есть)
    winnerPlayerIndex?: 0 | 1;
  };
}

export interface ErrorServerMessage {
  type: ServerToClientMessageType.ERROR;
  payload: {
    message: string;
    code?: string; // Опциональный код ошибки
  };
}

export interface OpponentDisconnectedServerMessage {
  type: ServerToClientMessageType.OPPONENT_DISCONNECTED;
  payload: {
    message: string;
  };
}

export type ServerMessage = 
  | GameCreatedServerMessage
  | PlayerJoinedServerMessage
  | GameStartServerMessage
  | GameUpdateServerMessage
  | ShotResultServerMessage
  | GameOverServerMessage
  | ErrorServerMessage
  | OpponentDisconnectedServerMessage;

// Helper functions for creating typed messages (optional, but good practice)
export const createMessage = <T extends ClientMessage | ServerMessage>(
  type: T['type'], 
  payload?: T extends { payload: any } ? T['payload'] : undefined
): string => {
  const messageObject: { type: T['type'], payload?: any } = { type };
  if (payload !== undefined) {
    messageObject.payload = payload;
  }
  return JSON.stringify(messageObject);
};

export const parseMessage = <T extends ClientMessage | ServerMessage>(data: string): T | null => {
  try {
    const parsed = JSON.parse(data);
    // Basic validation: check if type exists
    if (parsed && parsed.type) {
      return parsed as T;
    }
    console.error('Parsed message does not have a type:', parsed);
    return null;
  } catch (error) {
    console.error('Error parsing message:', error, 'Raw data:', data);
    return null;
  }
}; 