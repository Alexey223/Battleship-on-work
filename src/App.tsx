import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { GameLayout } from './components/GameLayout/GameLayout';
import { GameState, Board, AIDifficulty, GameMode, GameStatus } from './types/game';
import { createEmptyBoard } from './core/Board';
import { updateGameState } from './core/GameManager';
import { DifficultySelector } from './components/DifficultySelector/DifficultySelector';
import { GameModeSelector } from './components/GameModeSelector/GameModeSelector';
import { SoundControls } from './components/SoundControls/SoundControls';
import { SoundProvider } from './contexts/SoundContext';
import { PlayerSwitchScreen } from './components/PlayerSwitchScreen/PlayerSwitchScreen';
import { useWebSocket, WebSocketHookOptions } from './hooks/useWebSocket';
import { ClientToServerMessageType, ServerMessage, ServerToClientMessageType } from './types/network';
import styles from './App.module.css';

const BOARD_SIZE = 10;

const createInitialGameState = (): GameState => ({
  gameStatus: 'setup',
  currentPlayerIndex: 0,
  players: [
    {
      id: 1,
      name: 'Player 1',
      board: createEmptyBoard(BOARD_SIZE),
    },
    {
      id: 2,
      name: 'Player 2',
      board: createEmptyBoard(BOARD_SIZE),
    },
  ],
  aiDifficulty: 'medium',
  gameMode: 'single',
  boardSize: BOARD_SIZE
});

function App() {
  const [gameState, setGameState] = useState<GameState>(createInitialGameState);
  const [onlineGameId, setOnlineGameId] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [onlinePlayerId, setOnlinePlayerId] = useState<string | null>(null);
  const [playerIndexInGame, setPlayerIndexInGame] = useState<0 | 1 | null>(null);
  const [serverMessageLog, setServerMessageLog] = useState<string[]>([]);
  const [gameIdToJoin, setGameIdToJoin] = useState<string>("");
  const [opponentJoined, setOpponentJoined] = useState<boolean>(false);

  const handleServerMessage = useCallback((message: ServerMessage) => {
    console.log('[App.tsx] Received typed message from server:', message);
    setServerMessageLog(prev => [...prev.slice(-5), JSON.stringify(message, null, 2)]);

    switch (message.type) {
      case ServerToClientMessageType.GAME_CREATED:
        setOnlineGameId(message.payload.gameId);
        setOnlinePlayerId(message.payload.playerId);
        setPlayerIndexInGame(message.payload.playerIndex);
        setGameState(prev => ({ ...prev, gameMode: 'multiplayer', gameStatus: 'waiting_for_opponent' }));
        setOpponentJoined(message.payload.playerIndex === 1);
        if (message.payload.playerIndex === 0) {
            console.log(`[App.tsx] Game Created! Game ID: ${message.payload.gameId}. Waiting for opponent.`);
        } else {
            console.log(`[App.tsx] Successfully joined game ${message.payload.gameId}. You are Player ${message.payload.playerIndex + 1}.`);
        }
        break;
      case ServerToClientMessageType.PLAYER_JOINED:
        console.log(`[App.tsx] Opponent (Player ${message.payload.playerIndex + 1}) has joined the game!`);
        setOpponentJoined(true);
        setGameState(prev => ({
          ...prev,
          gameStatus: 'placing_ships' 
        }));
        break;
      case ServerToClientMessageType.GAME_START:
        console.log("[App.tsx] Game Start message received:", JSON.stringify(message.payload, null, 2));
        const clientAssignedPlayerIndex = message.payload.playerIndex;
        setPlayerIndexInGame(clientAssignedPlayerIndex);
        setOpponentJoined(true); 

        setGameState(prev => {
          const initialGsFromServer = message.payload.initialGameState;
          console.log("[App.tsx] initialGameState from server:", JSON.stringify(initialGsFromServer, null, 2));

          const serverPlayer0 = initialGsFromServer.players?.[0];
          const serverPlayer1 = initialGsFromServer.players?.[1];

          if (!serverPlayer0 || !serverPlayer1) {
            console.error("[App.tsx] GAME_START: Server did not provide two players in initialGameState. Using defaults.");
            const defaultP0 = { ...prev.players[0], id: 0, name: 'Player 1', board: createEmptyBoard(BOARD_SIZE) };
            const defaultP1 = { ...prev.players[1], id: 1, name: 'Player 2', board: createEmptyBoard(BOARD_SIZE) };
            return {
              ...prev,
              gameMode: 'multiplayer',
              players: [defaultP0, defaultP1],
              currentPlayerIndex: initialGsFromServer.currentPlayerIndex ?? 0,
              gameStatus: initialGsFromServer.gameStatus ?? 'playing',
              boardSize: initialGsFromServer.boardSize || BOARD_SIZE,
              winner: undefined,
            };
          }

          const boardForPlayer = (serverBoardData: any, fallbackBoard: Board): Board => {
            if (serverBoardData && typeof serverBoardData.size === 'number') {
              let newBoard = createEmptyBoard(serverBoardData.size); // Always create a base empty board

              // If server sends ships, use them
              if (serverBoardData.ships && Array.isArray(serverBoardData.ships)) {
                newBoard.ships = serverBoardData.ships;
              } else {
                newBoard.ships = []; // Default to empty ships
              }

              // If server sends valid cells, use them. Otherwise, cells from createEmptyBoard remain.
              if (serverBoardData.cells && Array.isArray(serverBoardData.cells) &&
                  serverBoardData.cells.length === serverBoardData.size &&
                  serverBoardData.cells[0] && Array.isArray(serverBoardData.cells[0]) &&
                  serverBoardData.cells[0].length === serverBoardData.size) {
                newBoard.cells = serverBoardData.cells;
              }
              return newBoard;
            }
            // Fallback if serverBoardData is entirely missing or invalid (should ideally not happen with robust server)
            console.warn("[App.tsx] GAME_START: serverBoardData missing or invalid, using fallbackBoard for a player.");
            return fallbackBoard; 
          };
          
          const localPlayer0 = {
            ...prev.players[0], 
            id: serverPlayer0.id, 
            name: serverPlayer0.name || 'Player 1',
            board: boardForPlayer(serverPlayer0.board, prev.players[0].board),
          };
          const localPlayer1 = {
            ...prev.players[1],
            id: serverPlayer1.id,
            name: serverPlayer1.name || 'Player 2',
            board: boardForPlayer(serverPlayer1.board, prev.players[1].board),
          };
          
          console.log(`[App.tsx] Client is Player Index: ${clientAssignedPlayerIndex}`);
          console.log("[App.tsx] Constructed localPlayer0 for game state:", JSON.stringify(localPlayer0, (k,v) => k === 'ships' ? '[ships_data]' : v, 2));
          console.log("[App.tsx] Constructed localPlayer1 for game state:", JSON.stringify(localPlayer1, (k,v) => k === 'ships' ? '[ships_data]' : v, 2));

          return {
            ...prev,
            gameMode: 'multiplayer',
            players: [localPlayer0, localPlayer1], // P0 at index 0, P1 at index 1
            currentPlayerIndex: initialGsFromServer.currentPlayerIndex ?? 0,
            gameStatus: initialGsFromServer.gameStatus ?? 'playing',
            boardSize: initialGsFromServer.boardSize || BOARD_SIZE,
            winner: undefined, 
          };
        });
        break;
      case ServerToClientMessageType.SHOT_RESULT:
        console.log("[App.tsx] Shot Result message received. Payload:", JSON.stringify(message.payload, null, 2));
        setGameState(prev => {
          if (prev.gameStatus === 'finished') return prev; 

          const { 
            targetPlayerIndex, 
            updatedTargetBoard, 
            nextPlayerIndex, 
            isGameOver, 
            winnerIndex 
          } = message.payload;
          
          console.log(`[App.tsx] SHOT_RESULT: Board of player ${targetPlayerIndex} BEFORE update (cell[${message.payload.y}][${message.payload.x}] state):`, JSON.stringify(prev.players[targetPlayerIndex].board.cells[message.payload.y][message.payload.x]?.state));
          console.log(`[App.tsx] SHOT_RESULT: updatedTargetBoard from server (cell[${message.payload.y}][${message.payload.x}] state):`, JSON.stringify((updatedTargetBoard as Board).cells[message.payload.y][message.payload.x]?.state));

          const newPlayers = [...prev.players];
          newPlayers[targetPlayerIndex] = {
            ...newPlayers[targetPlayerIndex],
            board: updatedTargetBoard as Board, 
          };
          
          const finalNextPlayerIndex = typeof nextPlayerIndex === 'number' ? nextPlayerIndex : prev.currentPlayerIndex;
          const finalWinner = winnerIndex === null || winnerIndex === undefined ? undefined : winnerIndex;

          let newGameStatus: GameStatus = prev.gameStatus;
          if (isGameOver) {
            newGameStatus = 'finished';
          } else if (prev.gameStatus === 'switching_player') {
            newGameStatus = 'playing';
          }

          const newState = {
            ...prev,
            players: newPlayers,
            currentPlayerIndex: finalNextPlayerIndex,
            gameStatus: newGameStatus, 
            winner: finalWinner,
          };
          console.log(`[App.tsx] SHOT_RESULT: Board of player ${targetPlayerIndex} AFTER update (cell[${message.payload.y}][${message.payload.x}] state):`, JSON.stringify(newState.players[targetPlayerIndex].board.cells[message.payload.y][message.payload.x]?.state));
          return newState;
        });
        break;
      case ServerToClientMessageType.GAME_OVER:
        console.log("[App.tsx] Game Over message received:", message.payload);
        setGameState(prev => {
          const finalWinner = message.payload.winnerPlayerIndex === null || message.payload.winnerPlayerIndex === undefined 
            ? undefined 
            : message.payload.winnerPlayerIndex;
          return {
            ...prev,
            gameStatus: 'finished',
            winner: finalWinner
          };
        });
        break;
      case ServerToClientMessageType.OPPONENT_DISCONNECTED:
        console.warn("[App.tsx] Opponent disconnected:", message.payload.message);
        alert(`Opponent disconnected: ${message.payload.message}. You win!`);
        setGameState(prev => ({
          ...prev,
          gameStatus: 'finished',
          winner: playerIndexInGame !== null ? playerIndexInGame : undefined
        }));
        setOnlineGameId(null);
        setOpponentJoined(false);
        break;
      case ServerToClientMessageType.ERROR:
        console.error('[App.tsx] Server Error:', message.payload.message);
        alert(`Server Error: ${message.payload.message}`);
        break;
      default:
        console.warn('[App.tsx] Unhandled server message type:', message.type);
    }
  }, [playerIndexInGame]);

  const wsOptions: WebSocketHookOptions = {
    onOpen: () => console.log('[App.tsx] WebSocket connection opened.'),
    onClose: () => {
        console.log('[App.tsx] WebSocket connection closed.');
        setOnlineGameId(null);
        setOnlinePlayerId(null);
        setPlayerIndexInGame(null);
        setOpponentJoined(false);
        setGameState(prev => ({ ...prev, gameStatus: 'setup'}));
    },
    onError: (event) => console.error('[App.tsx] WebSocket error:', event),
    onMessage: handleServerMessage,
  };

  // Refs for stable callbacks
  const onOpenRef = useRef(wsOptions.onOpen);
  const onCloseRef = useRef(wsOptions.onClose);
  const onErrorRef = useRef(wsOptions.onError);
  const onMessageRef = useRef(handleServerMessage);

  // Update refs when the actual callbacks change
  useEffect(() => { onOpenRef.current = wsOptions.onOpen; }, [wsOptions.onOpen]);
  useEffect(() => { onCloseRef.current = wsOptions.onClose; }, [wsOptions.onClose]);
  useEffect(() => { onErrorRef.current = wsOptions.onError; }, [wsOptions.onError]);
  useEffect(() => { onMessageRef.current = handleServerMessage; }, [handleServerMessage]);

  const stableWsOptions = useMemo(() => ({
    onOpen: (event?: Event) => onOpenRef.current?.(event as Event),
    onClose: (event?: CloseEvent) => onCloseRef.current?.(event as CloseEvent),
    onError: (event: Event) => onErrorRef.current?.(event),
    onMessage: (message: ServerMessage) => onMessageRef.current?.(message),
  }), []);

  const { isConnected, sendMessage } = useWebSocket(stableWsOptions);

  useEffect(() => {
    console.log("[App.tsx] gameState изменился (общий лог):", JSON.stringify(gameState));
  }, [gameState]);

  const handleBoardUpdate = useCallback((playerIndex: number, updatedBoard: Board, shotHit: boolean) => {
    console.log(`[App.tsx] handleBoardUpdate вызван для игрока ${playerIndex}, shotHit: ${shotHit}`);
    setGameState(prevState => {
      const newState = updateGameState(prevState, playerIndex, updatedBoard, shotHit);
      return newState;
    });
  }, []);

  const handleStartGameIfNeeded = useCallback(() => {
    console.log("[App.tsx] handleStartGameIfNeeded вызван. Текущий gameState.gameStatus:", gameState.gameStatus);
    setGameState(prevGameState => {
      if (prevGameState.gameStatus === 'setup') {
        return {
          ...prevGameState,
          gameStatus: 'playing',
          currentPlayerIndex: 0,
        };
      }
      return prevGameState;
    });
  }, [gameState.gameStatus]);

  const handleConfirmSwitchPlayer = useCallback(() => {
    if (gameState.gameStatus === 'switching_player') {
      setGameState(prev => ({ ...prev, gameStatus: 'playing' }));
    }
  }, [gameState.gameStatus]);

  const handleRestart = () => {
    setGameState(createInitialGameState());
    setOnlineGameId(null);
    setOnlinePlayerId(null);
    setPlayerIndexInGame(null);
    setServerMessageLog([]);
    setGameIdToJoin("");
    setOpponentJoined(false);
  };

  const handleDifficultyChange = (difficulty: AIDifficulty) => {
    setGameState(prev => ({ ...prev, aiDifficulty: difficulty }));
  };

  const handleGameModeChange = (mode: GameMode) => {
    setGameState(prev => ({ ...prev, gameMode: mode }));
    if (mode === 'single' || !isConnected) {
        setOnlineGameId(null);
        setOnlinePlayerId(null);
        setPlayerIndexInGame(null);
        setOpponentJoined(false);
        setGameIdToJoin("");
    }
  };

  const handleCreateOnlineGame = () => {
    if (isConnected) {
      sendMessage(ClientToServerMessageType.CREATE_GAME);
    } else {
      alert('Not connected to server. Please wait or check connection.');
    }
  };

  const handleJoinOnlineGame = () => {
    if (isConnected && gameIdToJoin.trim() !== "") {
      sendMessage(ClientToServerMessageType.JOIN_GAME, { gameId: gameIdToJoin.trim() });
    } else if (!isConnected) {
      alert('Not connected to server. Please wait or check connection.');
    } else {
      alert('Please enter a Game ID to join.');
    }
  };

  // Determine if GameLayout should render based on player data availability
  const effectivePlayerIndexInGame = gameState.gameMode === 'single' && playerIndexInGame === null ? 0 : playerIndexInGame;

  const canRenderGameLayout = 
    effectivePlayerIndexInGame !== null &&
    gameState.players && 
    gameState.players.length === 2 && 
    gameState.players[effectivePlayerIndexInGame] && 
    gameState.players[(effectivePlayerIndexInGame + 1) % 2] &&
    (gameState.gameStatus === 'playing' || gameState.gameStatus === 'setup' || gameState.gameStatus === 'finished' || gameState.gameStatus === 'waiting_for_opponent' || gameState.gameStatus === 'switching_player' || gameState.gameStatus === 'placing_ships');

  // Determine clientPlayerIndex to pass to GameLayout
  // For single player, if playerIndexInGame is null, default to 0. Otherwise, use playerIndexInGame.
  const clientPlayerIndexForLayout = gameState.gameMode === 'single' 
    ? (playerIndexInGame === null ? 0 : playerIndexInGame) 
    : playerIndexInGame;

  return (
    <SoundProvider>
      <div className={styles.app}>
        <h1 className={styles.title}>Battleship</h1>
        
        <div className={styles.wsInfo}>
          <p>WebSocket Connected: {isConnected ? 'Yes' : 'No'}</p>
          
          {gameState.gameMode === 'multiplayer' && !onlineGameId && isConnected && (
            <div className={styles.onlineSetupContainer}>
              <button onClick={handleCreateOnlineGame} disabled={!!onlineGameId}>
                Create Online Game
              </button>
              <div className={styles.joinGameContainer}>
                <input 
                  type="text" 
                  placeholder="Enter Game ID to Join" 
                  value={gameIdToJoin} 
                  onChange={(e) => setGameIdToJoin(e.target.value)} 
                  disabled={!!onlineGameId}
                  className={styles.gameIdInput}
                />
                <button onClick={handleJoinOnlineGame} disabled={!!onlineGameId || !gameIdToJoin.trim()}>
                  Join Game
                </button>
              </div>
            </div>
          )}

          {onlineGameId && (
            <div className={styles.onlineGameInfo}>
              <p>Online Game ID: <strong>{onlineGameId}</strong></p>
              <p>You are: Player {playerIndexInGame !== null ? playerIndexInGame + 1 : 'N/A'}</p>
              {playerIndexInGame === 0 && !opponentJoined && <p className={styles.waitingMessage}>Waiting for opponent to join...</p>}
              {opponentJoined && <p className={styles.opponentJoinedMessage}>Opponent has joined! Ready for next step.</p>}
            </div>
          )}

          {serverMessageLog.length > 0 && (
            <div className={styles.messageLog}>
              <p>Recent Server Messages:</p>
              {serverMessageLog.map((msg, index) => <pre key={index}>{msg}</pre>)}
            </div>
          )}
        </div>

        <div className={styles.settingsContainer}>
          <GameModeSelector
            gameMode={gameState.gameMode}
            onChange={handleGameModeChange}
            disabled={(gameState.gameStatus !== 'setup' && gameState.gameStatus !== 'waiting_for_opponent') || !!onlineGameId}
          />
          {gameState.gameMode === 'single' && (
            <DifficultySelector
              difficulty={gameState.aiDifficulty}
              onChange={handleDifficultyChange}
              disabled={gameState.gameStatus !== 'setup'}
            />
          )}
          <SoundControls />
        </div>
        {canRenderGameLayout ? (
          <GameLayout
            gameState={gameState}
            onBoardUpdate={handleBoardUpdate}
            onStartGameIfNeeded={handleStartGameIfNeeded}
            sendMessage={sendMessage}
            clientPlayerIndex={clientPlayerIndexForLayout}
          />
        ) : (
          <div className={styles.loadingMessage}>
            {/* Specific messages based on state */}
            {gameState.gameMode === 'multiplayer' && onlineGameId && playerIndexInGame === null && "Assigning player identity for online game..."}
            {gameState.gameMode === 'multiplayer' && onlineGameId && playerIndexInGame !== null && !gameState.players[playerIndexInGame] && "Initializing your player data..."}
            {gameState.gameMode === 'multiplayer' && onlineGameId && gameState.gameStatus === 'waiting_for_opponent' && "Waiting for opponent..."}
            {gameState.gameMode === 'single' && (gameState.gameStatus === 'setup' || gameState.gameStatus === 'playing') && effectivePlayerIndexInGame === null && "Initializing single player game..."} 
            {/* Default messages based on general state */}
            {(!onlineGameId && gameState.gameStatus === 'setup') && "Select game mode to start." } 
            {(onlineGameId && playerIndexInGame === null && gameState.gameStatus !== 'waiting_for_opponent') && "Connecting to online game..."}
            {/* More generic fallback if specific conditions above aren't met but layout can't render */}
            {!(gameState.gameStatus === 'setup' && !onlineGameId) && 
             ! (gameState.gameMode === 'multiplayer' && onlineGameId && playerIndexInGame === null) &&
             ! (gameState.gameMode === 'multiplayer' && onlineGameId && gameState.gameStatus === 'waiting_for_opponent') &&
             "Loading game or initializing..."}
          </div>
        )}
        {gameState.gameStatus === 'finished' && (
          <div className={styles.gameOver}>
            <h2>Game Over!</h2>
            <p>
              {gameState.winner === undefined 
                ? "It's a draw!"
                : `Winner: ${gameState.players[gameState.winner].name}`}
            </p>
            <button onClick={handleRestart}>Play Again</button>
          </div>
        )}
        {gameState.gameMode === 'multiplayer' && gameState.gameStatus === 'switching_player' && !onlineGameId && (
          <PlayerSwitchScreen 
            nextPlayerName={gameState.players[gameState.currentPlayerIndex].name}
            onConfirm={handleConfirmSwitchPlayer}
          />
        )}
      </div>
    </SoundProvider>
  );
}

export default App;
