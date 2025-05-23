import React, { useEffect, useState } from 'react';
import { GameState, Board } from '../../types/game';
import styles from './GameLayout.module.css';
import { GameBoard } from '../GameBoard/GameBoard';
import { GameStatus } from '../GameStatus/GameStatus';
import { placeShipsRandomly } from '../../core/ShipPlacer';
import { createEmptyBoard, fireAtCell, markCellsAroundSunkShip } from '../../core/Board';
import { makeAIShot } from '../../core/AIPlayer';
import { useSound } from '../../contexts/SoundContext';
import { ClientToServerMessageType } from '../../types/network';
import '../../App.css'; // Ensure global animation styles are available

interface GameLayoutProps {
  gameState: GameState;
  onBoardUpdate: (playerIndex: number, board: Board, shotHit: boolean) => void;
  onStartGameIfNeeded: () => void;
  sendMessage: (type: ClientToServerMessageType, payload?: any) => void;
  clientPlayerIndex: number | null; 
}

export const GameLayout: React.FC<GameLayoutProps> = ({
  gameState,
  onBoardUpdate,
  onStartGameIfNeeded,
  sendMessage,
  clientPlayerIndex 
}) => {
  // 1. ALL HOOKS AT THE VERY TOP, UNCONDITIONALLY
  const { playSound } = useSound();
  const [myBoardAnimation, setMyBoardAnimation] = useState('');
  const [opponentBoardAnimation, setOpponentBoardAnimation] = useState('');
  const [myShipsSentToServer, setMyShipsSentToServer] = useState(false);

  // 2. DERIVED STATE & CONSTANTS (calculated after hooks)
  const myBoardIndex = clientPlayerIndex !== null ? clientPlayerIndex : -1;
  const opponentBoardIndex = clientPlayerIndex !== null ? (clientPlayerIndex + 1) % 2 : -1;

  const myPlayerActual = myBoardIndex !== -1 && gameState.players[myBoardIndex] ? gameState.players[myBoardIndex] : null;
  const opponentPlayerActual = opponentBoardIndex !== -1 && gameState.players[opponentBoardIndex] ? gameState.players[opponentBoardIndex] : null;

  const isMyTurn = clientPlayerIndex !== null && gameState.currentPlayerIndex === myBoardIndex;
  const isOpponentTurn = clientPlayerIndex !== null && gameState.currentPlayerIndex === opponentBoardIndex;

  // 3. EFFECT HOOKS (unconditionally defined)
  useEffect(() => {
    if (clientPlayerIndex === null) return; // Internal guard for effect logic
    let myTimer: NodeJS.Timeout | undefined;
    let oppTimer: NodeJS.Timeout | undefined;
    if (gameState.gameStatus === 'playing' || gameState.gameStatus === 'switching_player') {
      if (isMyTurn) {
        setMyBoardAnimation('turn-change-animation');
        setOpponentBoardAnimation('');
        myTimer = setTimeout(() => setMyBoardAnimation(''), 1000);
      } else if (isOpponentTurn) {
        setOpponentBoardAnimation('turn-change-animation');
        setMyBoardAnimation('');
        oppTimer = setTimeout(() => setOpponentBoardAnimation(''), 1000);
      } else {
        setMyBoardAnimation('');
        setOpponentBoardAnimation('');
      }
    }
    return () => {
      if (myTimer) clearTimeout(myTimer);
      if (oppTimer) clearTimeout(oppTimer);
    };
  }, [isMyTurn, isOpponentTurn, gameState.gameStatus, clientPlayerIndex]);

  // THIS ENTIRE useEffect BLOCK (Ship placement/setup logic) IS BEING REPLACED
  useEffect(() => {
    // Corrected Guard Condition:
    // In single-player mode, always proceed if it's the setup phase.
    // In multiplayer mode, only proceed if clientPlayerIndex is known (not null).
    if (gameState.gameMode === 'multiplayer' && clientPlayerIndex === null) {
      return; // Not ready for multiplayer ship logic yet
    }
    // For single player, if it's not setup, we also don't need to do anything here.
    if (gameState.gameMode === 'single' && gameState.gameStatus !== 'setup') {
        return;
    }

    // Logic for single-player setup
    if (gameState.gameMode === 'single' && gameState.gameStatus === 'setup') {
      const player0Index = 0; // Human player is always 0 in single player
      const player0Data = gameState.players[player0Index];
      
      // Place ships for Player 0 (Human) if not already placed
      if (player0Data && (!player0Data.board.ships || player0Data.board.ships.length === 0)) {
        console.log("[GameLayout.tsx] Single-player setup: Placing ships for Player 0 (Human).");
        const player0Board = placeShipsRandomly(createEmptyBoard(gameState.boardSize));
        onBoardUpdate(player0Index, player0Board, false);
      }

      const player1Index = 1; // AI player is always 1
      const player1Data = gameState.players[player1Index];
      // Place ships for Player 1 (AI) if not already placed
      if (player1Data && (!player1Data.board.ships || player1Data.board.ships.length === 0)) {
        console.log("[GameLayout.tsx] Single-player setup: Placing ships for Player 1 (AI).");
        const player1Board = placeShipsRandomly(createEmptyBoard(gameState.boardSize));
        onBoardUpdate(player1Index, player1Board, false);
      }
    } 
    // Logic for multiplayer ship auto-placement phase (if ships are missing for THIS client)
    else if (gameState.gameMode === 'multiplayer' && gameState.gameStatus === 'placing_ships') {
      if (clientPlayerIndex !== null && myPlayerActual && (!myPlayerActual.board.ships || myPlayerActual.board.ships.length === 0)) {
        // This client (could be player 0 or player 1) needs ships placed locally.
        console.log(`[GameLayout.tsx] Multiplayer 'placing_ships': Auto-placing ships for client ${clientPlayerIndex} as they are missing.`);
        const myNewBoard = placeShipsRandomly(createEmptyBoard(gameState.boardSize));
        onBoardUpdate(clientPlayerIndex, myNewBoard, false); // Update the board for THIS client
      }
    }
    // NOTE: Automatic sending of ships to the server from this useEffect has been removed.
    // Ship sending in multiplayer 'placing_ships' is now SOLELY handled by onCellClick on "Your Board".

  }, [
    gameState.gameMode,
    gameState.gameStatus,
    gameState.boardSize,
    clientPlayerIndex, // Important for multiplayer logic
    myPlayerActual,    // Used to check if this client's ships are placed in multiplayer
    // opponentPlayerActual and myBoardIndex/opponentBoardIndex might not be strictly needed if we use gameState.players directly for single player
    gameState.players, // Added to re-run if player objects themselves change (e.g. initially null)
    onBoardUpdate
    // sendMessage and myShipsSentToServer are correctly removed as this hook no longer sends messages.
  ]);

  useEffect(() => {
    if (clientPlayerIndex === null) return; // Internal guard
    if (gameState.gameMode === 'single' && clientPlayerIndex === 0 && gameState.currentPlayerIndex === 1 && gameState.gameStatus === 'playing') {
      const shot = makeAIShot(gameState);
      const targetBoard = gameState.players[0].board;
      const { board: boardAfterShot, hit, sunkShipObject } = fireAtCell(targetBoard, shot.x, shot.y);
      let finalBoard = boardAfterShot;
      if (hit) {
        if (sunkShipObject) { playSound('sunk'); finalBoard = markCellsAroundSunkShip(boardAfterShot, sunkShipObject); }
        else { playSound('hit'); }
      } else { playSound('miss'); }
      onBoardUpdate(0, finalBoard, hit);
    }
  }, [gameState, onBoardUpdate, playSound, clientPlayerIndex]);

  // 4. HANDLERS (defined after hooks and derived state)
  const handleShot = (x: number, y: number, targetPlayerActualIndex: number) => {
    if (clientPlayerIndex === null || !isMyTurn || targetPlayerActualIndex === -1) return;
    if (gameState.gameStatus === 'setup') { onStartGameIfNeeded(); return; }

    if (gameState.gameMode === 'multiplayer') {
      sendMessage(ClientToServerMessageType.MAKE_SHOT, { x, y, targetPlayerIndex: targetPlayerActualIndex });
    } else if (gameState.gameMode === 'single') {
      if (targetPlayerActualIndex === 1 && clientPlayerIndex === 0) { 
        const targetBoardData = opponentPlayerActual?.board; // Use opponentPlayerActual which can be null
        if (!targetBoardData) return; // Guard if opponent data not ready
        const { board: boardAfterShot, hit, sunkShipObject } = fireAtCell(targetBoardData, x, y);
        let finalBoard = boardAfterShot;
        if (hit) {
          if (sunkShipObject) { playSound('sunk'); finalBoard = markCellsAroundSunkShip(boardAfterShot, sunkShipObject); }
          else { playSound('hit'); }
        } else { playSound('miss'); }
        onBoardUpdate(targetPlayerActualIndex, finalBoard, hit);
      }
    }
  };

  // 5. CONDITIONAL RENDERING (now safe, as all hooks are processed)
  if (clientPlayerIndex === null && 
      (gameState.gameStatus === 'playing' || 
       gameState.gameStatus === 'switching_player' ||
       gameState.gameStatus === 'waiting_for_opponent' ||
       gameState.gameStatus === 'placing_ships')
     ) {
    return (
      <div className={styles.container}>
        <GameStatus gameState={gameState} />
        <div>Waiting for player assignment...</div>
      </div>
    );
  }

  if (!myPlayerActual || !opponentPlayerActual) {
    return (
        <div className={styles.container}>
          <GameStatus gameState={gameState} />
          <div>Loading player data or game not fully initialized...</div>
        </div>
      );
  }

  const showMyPlayerShips = true;
  const showOpponentPlayerShips = gameState.gameStatus === 'finished';
  const opponentBoardTitle = gameState.gameMode === 'single' ? 'AI Board' : 'Opponent Board';

  return (
    <div className={styles.container}>
      <GameStatus gameState={gameState} />
      <div className={styles.boards}>
        <div className={`${styles.boardContainer} ${isMyTurn ? 'activePlayerBoard' : ''} ${myBoardAnimation}`}>
          <h2 className={styles.boardTitle}>Your Board ({myPlayerActual.name})</h2>
          <GameBoard
            board={myPlayerActual.board} // myPlayerActual is confirmed not null here
            onCellClick={(x, y) => {
              if (gameState.gameStatus === 'setup' && gameState.gameMode === 'single') {
                onStartGameIfNeeded();
              } else if (
                gameState.gameMode === 'multiplayer' &&
                gameState.gameStatus === 'placing_ships' &&
                clientPlayerIndex !== null && // Make sure we know who the client is
                myPlayerActual && // Make sure player data is available
                myPlayerActual.board.ships && myPlayerActual.board.ships.length > 0 && // Ensure ships are on the board
                !myShipsSentToServer // Only send if not already sent
              ) {
                console.log(`[GameLayout.tsx] Click on own board during multiplayer 'placing_ships'. Sending ships for player ${clientPlayerIndex}.`);
                sendMessage(ClientToServerMessageType.PLACE_SHIPS, { ships: myPlayerActual.board.ships });
                setMyShipsSentToServer(true); // Mark as sent to prevent re-sending
              }
              // Clicks on one's own board during 'playing' or other states
              // currently do nothing beyond this, which is generally fine.
            }}
            isCurrentPlayer={isMyTurn} 
            gameStatus={gameState.gameStatus}
            showShips={showMyPlayerShips}
            isOpponentBoard={false}
          />
        </div>
        <div className={`${styles.boardContainer} ${isOpponentTurn ? 'activePlayerBoard' : ''} ${opponentBoardAnimation}`}>
          <h2 className={styles.boardTitle}>{opponentBoardTitle} ({opponentPlayerActual.name})</h2>
          <GameBoard
            board={opponentPlayerActual.board} // opponentPlayerActual is confirmed not null here
            onCellClick={(x, y) => {
              if (isMyTurn && gameState.gameStatus === 'playing') {
                handleShot(x, y, opponentBoardIndex);
              }
            }}
            isCurrentPlayer={isOpponentTurn}
            gameStatus={gameState.gameStatus}
            showShips={showOpponentPlayerShips}
            isOpponentBoard={true}
          />
        </div>
      </div>
    </div>
  );
}; 