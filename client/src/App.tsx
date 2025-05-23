import React, { useEffect, useRef } from 'react';

// ... existing code ...

const BOARD_SIZE = 10;

const createInitialGameState = (): GameState => ({
  gameStatus: 'menu', // Changed from 'setup'
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
  gameMode: null, // Changed from 'single'
  boardSize: BOARD_SIZE
});

function App() {
// ... existing code ...

            setMyPlayerIndex(clientPlayerActualIndex); // Store this client's determined index
            console.log(`[App.tsx] Client is Player Index: ${clientPlayerActualIndex}`);

            const serverPlayers = payload.initialGameState.players;

            // Ensure serverPlayers are treated as potentially partial ServerPlayer representations
            const localPlayer0 = transformServerPlayerToClientPlayer(serverPlayers[0] as ServerPlayer | null, 0, clientPlayerActualIndex);
            console.log(`[App.tsx] Constructed localPlayer0 for game state:`, JSON.parse(JSON.stringify(localPlayer0)));

            const localPlayer1 = serverPlayers[1] ? transformServerPlayerToClientPlayer(serverPlayers[1] as ServerPlayer | null, 1, clientPlayerActualIndex) : createInitialPlayer(1, "Player 2");
            console.log(`[App.tsx] Constructed localPlayer1 for game state:`, JSON.parse(JSON.stringify(localPlayer1)));
            
            setGameState(prev => {
                const newStatusFromServer = payload.initialGameState.gameStatus;
                console.log(`[App.tsx] GAME_START setGameState: prev.gameStatus='${prev.gameStatus}', newStatusFromServer='${newStatusFromServer}'`);
                
                const newState = {
                    ...prev,
                    gameId: payload.initialGameState.gameId || prev.gameId,
                    gameStatus: newStatusFromServer, // Directly use the status from server
                    currentPlayerIndex: payload.initialGameState.currentPlayerIndex,
                    players: [localPlayer0, localPlayer1] as [Player, Player], // Ensure type
                    boardSize: payload.initialGameState.boardSize,
                    // gameMode will be 'multiplayer' already
                };
                console.log(`[App.tsx] GAME_START setGameState: computed newState.gameStatus='${newState.gameStatus}', gameId='${newState.gameId}'`);
                return newState;
            });
        } else {
// ... existing code ...
// General useEffect for logging gameState changes and handling AI turns
useEffect(() => {
    console.log(`[App.tsx] gameState изменился (общий лог):`, JSON.parse(JSON.stringify(gameState)));

    if (gameState.gameMode === 'single' && gameState.gameStatus === 'playing' && gameState.players[gameState.currentPlayerIndex]?.name === 'AI') {
        // AI move logic
        // Ensure AI only moves if it's AI's turn and game is playing
        const aiPlayer = gameState.players[gameState.currentPlayerIndex];
        if (aiPlayer && !shotTimeoutRef.current) { // Check if a shot is not already in progress
            console.log(`[App.tsx] AI's turn (Player ${gameState.currentPlayerIndex}). Making a move.`);
            shotTimeoutRef.current = setTimeout(() => {
                const opponentBoard = gameState.players[(gameState.currentPlayerIndex + 1) % 2].board;
                const { x, y } = makeAIMove(opponentBoard, gameState.aiDifficulty);
                console.log(`[App.tsx] AI shooting at (${x}, ${y})`);
                
                // Simulate local shot result for UI update, server will confirm
                // This part might be tricky if we want to avoid complex local simulation
                // For now, let AI just send the shot to itself (if server is not involved in single player)
                // Or, if single player has a mock server/direct logic:
                // handleMakeShot(x,y); // This would be a local handler for single player

                // For now, let's assume single player shots are handled by clicking, AI is a placeholder idea
                // Or if there's a specific function for AI to take its turn:
                // takeAITurn(); 

                shotTimeoutRef.current = null; // Clear the timeout reference
            }, 1000); // 1-second delay for AI move
        }
    }

    // Cleanup timeout on unmount or if game state changes to prevent multiple AI moves
    return () => {
        if (shotTimeoutRef.current) {
            clearTimeout(shotTimeoutRef.current);
            shotTimeoutRef.current = null;
        }
    };
}, [gameState]); // Removed setGameState from dependency array

// WebSocket setup using the custom hook
// ... existing code ... 