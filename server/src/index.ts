import WebSocket, { WebSocketServer } from 'ws';
import { randomUUID } from 'crypto';
import {
    ClientMessage,
    ClientToServerMessageType,
    createMessage,
    parseMessage,
    ServerToClientMessageType,
    JoinGameClientMessage,
    MakeShotClientMessage,
    PlaceShipsClientMessage
} from './types/network';
import { 
    ServerGameState, 
    Player as ServerPlayer, 
    Board as ServerBoard, 
    Ship as ServerShip,
    BoardSize,
    Cell as ServerCell
} from './types/game'; 
import { 
    createEmptyBoard as createServerEmptyBoard, 
    fireAtCell, 
    markCellsAroundSunkShip, 
    placeShipOnBoardCells
} from './core/Board';
import { updateGameState as updateServerGameState } from './core/GameManager';

const PORT = process.env.PORT || 8080;
const DEFAULT_BOARD_SIZE: BoardSize = 10;

const wss = new WebSocketServer({ port: Number(PORT) });

interface PlayerConnection {
    ws: WebSocket;
    playerId: string;
    playerIndex: 0 | 1;
}

interface GameSession {
    gameId: string;
    players: [PlayerConnection | null, PlayerConnection | null];
    gameState: ServerGameState;
    createdAt: number;
}

const games: Record<string, GameSession> = {};

console.log(`WebSocket server started on port ${PORT}`);

// Helper function to send a message to a specific player in a game
const sendMessageToPlayer = (gameSession: GameSession, playerIndex: 0 | 1, type: ServerToClientMessageType, payload: any) => {
    const playerConnection = gameSession.players[playerIndex];
    if (playerConnection && playerConnection.ws.readyState === WebSocket.OPEN) {
        playerConnection.ws.send(createMessage(type, payload));
    } else {
        console.warn(`Cannot send message to player ${playerIndex} in game ${gameSession.gameId}: connection not open or player not found.`);
    }
};

// Helper function to send a message to both players in a game
const sendToBothPlayers = (gameSession: GameSession, type: ServerToClientMessageType, payload: any) => {
    sendMessageToPlayer(gameSession, 0, type, payload);
    sendMessageToPlayer(gameSession, 1, type, payload);
};

wss.on('connection', (ws: WebSocket) => {
    const connectionId = randomUUID(); 
    console.log(`Client connected: ${connectionId}`);

    // Attach gameId and playerId to ws object for easier context retrieval
    // These will be set upon game creation or joining
    // @ts-ignore 
    ws.gameId = null;
    // @ts-ignore 
    ws.playerId = null;
    // @ts-ignore
    ws.playerIndex = null;

    ws.on('message', (rawMessage: string) => {
        // @ts-ignore (accessing custom properties)
        const currentGId: string | null = ws.gameId;
        // @ts-ignore
        const currentPId: string | null = ws.playerId;
        // @ts-ignore
        const currentPIndex: 0 | 1 | null = ws.playerIndex;

        console.log(`[${connectionId}] (${currentGId ? 'Game: '+currentGId : 'No Game'}) Received raw message: ${rawMessage}`);
        const message = parseMessage<ClientMessage>(rawMessage);

        if (!message) {
            console.error(`[${connectionId}] Failed to parse message or message type is missing.`);
            ws.send(createMessage(ServerToClientMessageType.ERROR, { message: 'Invalid message format' }));
            return;
        }

        console.log(`[${connectionId}] Parsed message:`, message);

        switch (message.type) {
            case ClientToServerMessageType.CREATE_GAME:
                try {
                    const gameId = randomUUID();
                    const playerId = randomUUID(); 
                    const playerIndex = 0;
                    
                    const initialPlayer: ServerPlayer = {
                        id: 0, // Using numeric id for ServerPlayer as per type
                        name: `Player 1 (${playerId.substring(0,4)})`, // Simple name
                        board: createServerEmptyBoard(DEFAULT_BOARD_SIZE),
                    };

                    const initialGameState: ServerGameState = {
                        gameId,
                        players: [initialPlayer, null],
                        currentPlayerIndex: 0,
                        gameStatus: 'waiting_for_opponent',
                        boardSize: DEFAULT_BOARD_SIZE,
                    };
                    
                    const newGame: GameSession = {
                        gameId,
                        players: [null, null],
                        gameState: initialGameState,
                        createdAt: Date.now(),
                    };
                    
                    newGame.players[playerIndex] = { ws, playerId, playerIndex };
                    games[gameId] = newGame;

                    // @ts-ignore
                    ws.gameId = gameId;
                    // @ts-ignore
                    ws.playerId = playerId;
                    // @ts-ignore
                    ws.playerIndex = playerIndex;

                    console.log(`[${connectionId}] Game created: ${gameId} by player ${playerId} (Player ${playerIndex + 1})`);
                    ws.send(createMessage(ServerToClientMessageType.GAME_CREATED, {
                        gameId,
                        playerId,
                        playerIndex
                    }));
                } catch (error) {
                    const err = error as Error;
                    console.error(`[${connectionId}] Error creating game:`, err);
                    ws.send(createMessage(ServerToClientMessageType.ERROR, { message: 'Error creating game: ' + err.message }));
                }
                break;

            case ClientToServerMessageType.JOIN_GAME:
                try {
                    const joinGameMessage = message as JoinGameClientMessage;
                    const { gameId } = joinGameMessage.payload;
                    const gameToJoin = games[gameId];

                    if (!gameToJoin) {
                        ws.send(createMessage(ServerToClientMessageType.ERROR, { message: 'Game not found' }));
                        return;
                    }

                    if (gameToJoin.players[1]) {
                        ws.send(createMessage(ServerToClientMessageType.ERROR, { message: 'Game is full' }));
                        return;
                    }

                    if (gameToJoin.players[0]?.ws === ws) {
                        ws.send(createMessage(ServerToClientMessageType.ERROR, { message: 'Cannot join your own game as opponent' }));
                        return;
                    }

                    const newPlayerId = randomUUID();
                    const newPlayerIndex = 1;

                    // @ts-ignore
                    ws.gameId = gameId;
                    // @ts-ignore
                    ws.playerId = newPlayerId;
                    // @ts-ignore
                    ws.playerIndex = newPlayerIndex;
                    
                    gameToJoin.players[newPlayerIndex] = { ws, playerId: newPlayerId, playerIndex: newPlayerIndex };
                    
                    const player2ServerData: ServerPlayer = {
                        id: 1, // Numeric ID for ServerPlayer
                        name: `Player 2 (${newPlayerId.substring(0,4)})`,
                        board: createServerEmptyBoard(DEFAULT_BOARD_SIZE),
                    };
                    gameToJoin.gameState.players[newPlayerIndex] = player2ServerData;
                    gameToJoin.gameState.gameStatus = 'placing_ships'; // CHANGED: Wait for ships
                    gameToJoin.gameState.currentPlayerIndex = 0; // Player 0 starts, can be decided later
                    // Add flags to track ship placement
                    gameToJoin.gameState.player0ShipsPlaced = false;
                    gameToJoin.gameState.player1ShipsPlaced = false;


                    console.log(`[${connectionId}] Player ${newPlayerId} (Player ${newPlayerIndex + 1}) joined game ${gameId}. Game status: ${gameToJoin.gameState.gameStatus}`);

                    // Inform the joining player (Player 2) that the game is starting for them
                    sendMessageToPlayer(gameToJoin, newPlayerIndex, ServerToClientMessageType.GAME_START, {
                        playerIndex: newPlayerIndex,
                        initialGameState: gameToJoin.gameState
                    });

                    const player1Connection = gameToJoin.players[0];
                    if (player1Connection) {
                         // Inform Player 0 that Player 1 has joined
                         sendMessageToPlayer(gameToJoin, 0, ServerToClientMessageType.PLAYER_JOINED, {
                            playerIndex: newPlayerIndex, // Inform P0 about P1's index
                            // opponentName: player2ServerData.name, // Optional: send opponent's name
                            // initialGameState: gameToJoin.gameState // Optional: send updated game state
                        });

                        // CRITICAL: DO NOT send GAME_START to both players here yet.
                        // GAME_START will be sent after both players have placed their ships.
                        console.log(`[Server] Game ${gameId} is now in 'placing_ships' state. Waiting for ships from both players.`);
                    }
                } catch (error) {
                    const err = error as Error;
                    console.error(`[${connectionId}] Error joining game:`, err);
                    ws.send(createMessage(ServerToClientMessageType.ERROR, { message: 'Error joining game: ' + err.message }));
                }
                break;

            case ClientToServerMessageType.PLACE_SHIPS:
                try {
                    const gameId = (ws as any).gameId as string | null;
                    const playerId = (ws as any).playerId as string | null;
                    const playerIndex = (ws as any).playerIndex as (0 | 1 | null);

                    if (!gameId || !playerId || playerIndex === null) {
                        ws.send(createMessage(ServerToClientMessageType.ERROR, { message: 'Game/Player context not found for placing ships.' }));
                        return;
                    }
                    const gameSession = games[gameId];
                    if (!gameSession || !gameSession.gameState || !gameSession.players[playerIndex]) {
                        ws.send(createMessage(ServerToClientMessageType.ERROR, { message: 'Game session or player data not found.' }));
                        return;
                    }

                    if (gameSession.gameState.gameStatus !== 'placing_ships') {
                        ws.send(createMessage(ServerToClientMessageType.ERROR, { message: `Cannot place ships, game status is ${gameSession.gameState.gameStatus}` }));
                        return;
                    }

                    const placeShipsMessage = message as PlaceShipsClientMessage;
                    const receivedShips = placeShipsMessage.payload.ships as ServerShip[]; 

                    console.log(`[${gameId}] Player ${playerIndex} (${playerId}) is placing ${receivedShips.length} ships.`);

                    const currentServerPlayer = gameSession.gameState.players[playerIndex];
                    if (currentServerPlayer) {
                        // Validate and place ships on the server-side representation of the board
                        
                        // Create a fresh board for the player
                        let playerBoard = createServerEmptyBoard(gameSession.gameState.boardSize);
                        // Assign received ships
                        playerBoard.ships = receivedShips; 
                        
                        // Update the cell states on playerBoard based on the ship positions
                        for (const ship of playerBoard.ships) {
                            // Ensure the ship object has all necessary properties for placeServerShip
                            // and that placeServerShip correctly updates the cells.
                            // The ship objects from the client should be valid ServerShip types.
                            playerBoard = placeShipOnBoardCells(playerBoard, ship);
                        }
                        
                        // Now, assign the fully populated board (with ships and updated cells)
                        currentServerPlayer.board = playerBoard;


                        if (playerIndex === 0) {
                            gameSession.gameState.player0ShipsPlaced = true;
                        } else {
                            gameSession.gameState.player1ShipsPlaced = true;
                        }
                        console.log(`[Server] Player ${playerIndex} in game ${gameId} confirmed ship placement.`);
                        // Optionally send a confirmation to the player who just placed ships
                        // ws.send(createMessage(ServerToClientMessageType.SHIPS_ACCEPTED, { message: 'Ships accepted, waiting for opponent.' }));

                        // Check if both players have placed ships
                        if (gameSession.gameState.player0ShipsPlaced && gameSession.gameState.player1ShipsPlaced) {
                            gameSession.gameState.gameStatus = 'playing';
                            gameSession.gameState.currentPlayerIndex = 0; // Or randomly decide who starts
                            
                            console.log(`[Server] Game ${gameId} is now starting! All ships placed. Current turn: Player ${gameSession.gameState.currentPlayerIndex + 1}`);

                            // Make sure player boards sent to clients have the correct cells
                            const player0BoardWithCells = gameSession.gameState.players[0]!.board;
                            const player1BoardWithCells = gameSession.gameState.players[1]!.board;

                            gameSession.players.forEach((playerConn, idx) => {
                                if (playerConn) {
                                    const targetPlayerIndex = idx as (0 | 1);
                                    
                                    // Prepare the game state for each client
                                    // Player 0 gets their full board, and Player 1's board with hidden ships (empty cells)
                                    // Player 1 gets their full board, and Player 0's board with hidden ships (empty cells)
                                    const player0DataForClient = {
                                        id: gameSession.gameState.players[0]!.id,
                                        name: gameSession.gameState.players[0]!.name,
                                        board: {
                                            size: player0BoardWithCells.size,
                                            ships: targetPlayerIndex === 0 ? player0BoardWithCells.ships : [],
                                            cells: targetPlayerIndex === 0 ? player0BoardWithCells.cells : createServerEmptyBoard(player0BoardWithCells.size).cells,
                                        }
                                    };
                                    const player1DataForClient = {
                                        id: gameSession.gameState.players[1]!.id,
                                        name: gameSession.gameState.players[1]!.name,
                                        board: {
                                            size: player1BoardWithCells.size,
                                            ships: targetPlayerIndex === 1 ? player1BoardWithCells.ships : [],
                                            cells: targetPlayerIndex === 1 ? player1BoardWithCells.cells : createServerEmptyBoard(player1BoardWithCells.size).cells,
                                        }
                                    };

                                    sendMessageToPlayer(gameSession, targetPlayerIndex, ServerToClientMessageType.GAME_START, {
                                        initialGameState: {
                                            players: [player0DataForClient, player1DataForClient],
                                            currentPlayerIndex: gameSession.gameState.currentPlayerIndex,
                                            gameStatus: gameSession.gameState.gameStatus,
                                            boardSize: gameSession.gameState.boardSize,
                                        },
                                        playerIndex: targetPlayerIndex 
                                    });
                                }
                            });
                        } else {
                             console.log(`[Server] Game ${gameId}: Player ${playerIndex} placed ships. Waiting for other player.`);
                        }
                    } else {
                        ws.send(createMessage(ServerToClientMessageType.ERROR, { message: 'Player data not found on server for ship placement.' }));
                    }
                } catch (error) {
                    const err = error as Error;
                    console.error(`[${(ws as any).gameId}] Error placing ships:`, err);
                    ws.send(createMessage(ServerToClientMessageType.ERROR, { message: 'Error placing ships: ' + err.message }));
                }
                break;

            case ClientToServerMessageType.MAKE_SHOT:
                try {
                    const gameId = (ws as any).gameId as string | null;
                    const shootingPlayerWsId = (ws as any).playerId as string | null;

                    if (!gameId || !shootingPlayerWsId) {
                        ws.send(createMessage(ServerToClientMessageType.ERROR, { message: 'Game context not found for this connection.' }));
                        return;
                    }

                    const gameSession = games[gameId];
                    if (!gameSession || !gameSession.gameState) {
                        ws.send(createMessage(ServerToClientMessageType.ERROR, { message: 'Game session or state not found.' }));
                        return;
                    }
                    
                    const shootingPlayerConnection = gameSession.players.find(p => p?.playerId === shootingPlayerWsId);
                    if (!shootingPlayerConnection) {
                         ws.send(createMessage(ServerToClientMessageType.ERROR, { message: 'Shooter not found in game session players.' }));
                        return;
                    }
                    const shootingPlayerIndex = shootingPlayerConnection.playerIndex;

                    if (gameSession.gameState.gameStatus !== 'playing') {
                        ws.send(createMessage(ServerToClientMessageType.ERROR, { message: 'Game is not currently in playing state.' }));
                        return;
                    }
                    
                    if (gameSession.gameState.currentPlayerIndex !== shootingPlayerIndex) {
                        ws.send(createMessage(ServerToClientMessageType.ERROR, { message: 'Not your turn.' }));
                        return;
                    }

                    const { x, y } = (message as MakeShotClientMessage).payload;
                    const targetPlayerIndex = (shootingPlayerIndex + 1) % 2 as (0 | 1);
                    const targetPlayerState = gameSession.gameState.players[targetPlayerIndex];

                    if (!targetPlayerState || !targetPlayerState.board) {
                         ws.send(createMessage(ServerToClientMessageType.ERROR, { message: 'Target player or board not found.' }));
                        return;
                    }
                    
                    const targetBoardBeforeShot = JSON.parse(JSON.stringify(targetPlayerState.board)); // Клон для fireAtCell
                    const fireResult = fireAtCell(targetBoardBeforeShot, x, y);
                    
                    let finalBoardForTarget = fireResult.board;
                    let resultString: 'hit' | 'miss' | 'sunk' = fireResult.hit ? 'hit' : 'miss';

                    if (fireResult.sunkShipObject) {
                        resultString = 'sunk';
                        finalBoardForTarget = markCellsAroundSunkShip(fireResult.board, fireResult.sunkShipObject);
                    }
                    
                    // Создаем состояние, которое будет передано в updateServerGameState
                    // Оно должно содержать обновленную доску targetPlayerIndex
                    const gameStateForUpdate = JSON.parse(JSON.stringify(gameSession.gameState)); // Глубокий клон текущего состояния
                    // Обновляем доску атакованного игрока в этом временном состоянии
                    if(gameStateForUpdate.players[targetPlayerIndex]) {
                        gameStateForUpdate.players[targetPlayerIndex]!.board = finalBoardForTarget;
                    } else {
                        console.error("[Server] MAKE_SHOT: Target player state is null before updating board in gameStateForUpdate");
                        // Обработка ошибки, возможно, игра не должна продолжаться
                        return;
                    }

                    // updateServerGameState теперь отвечает за обновление currentPlayerIndex, gameStatus, winner
                    // и возвращает *полностью* новое состояние игры.
                    const updatedFullGameState = updateServerGameState(
                        gameStateForUpdate, // Передаем состояние, где доска УЖЕ обновлена последствиями выстрела
                        targetPlayerIndex,    // Индекс игрока, чья доска БЫЛА изменена (т.е. по кому стреляли)
                        finalBoardForTarget,  // Сама обновленная доска (немного избыточно, т.к. она уже в gameStateForUpdate, но updateServerGameState ее использует)
                        fireResult.hit        // Был ли выстрел удачным
                    );
                    
                    // Применяем полностью новое состояние к сессии игры
                    gameSession.gameState = updatedFullGameState;

                    console.log(`[Server] Board of player ${targetPlayerIndex} after shot & updateServerGameState:`, JSON.stringify(gameSession.gameState.players[targetPlayerIndex]?.board, null, 2)); // <--- НОВЫЙ ЛОГ

                    const shotResultPayload = {
                        shootingPlayerIndex,
                        targetPlayerIndex,
                        x,
                        y,
                        result: resultString,
                        newCellState: gameSession.gameState.players[targetPlayerIndex]!.board.cells[y][x].state, 
                        updatedTargetBoard: gameSession.gameState.players[targetPlayerIndex]!.board, 
                        nextPlayerIndex: gameSession.gameState.currentPlayerIndex,
                        sunkShip: fireResult.sunkShipObject, 
                        isGameOver: gameSession.gameState.gameStatus === 'finished',
                        winnerIndex: gameSession.gameState.winner,
                    };

                    sendToBothPlayers(gameSession, ServerToClientMessageType.SHOT_RESULT, shotResultPayload);
                    console.log(`[${gameId}] Player ${shootingPlayerIndex} shot at (${x},${y}) on Player ${targetPlayerIndex}'s board. Result: ${resultString}. Next turn: Player ${gameSession.gameState.currentPlayerIndex +1}. Game Over: ${shotResultPayload.isGameOver}`);


                    if (gameSession.gameState.gameStatus === 'finished') {
                        sendToBothPlayers(gameSession, ServerToClientMessageType.GAME_OVER, {
                            winnerPlayerIndex: gameSession.gameState.winner,
                        });
                        console.log(`[${gameId}] Game over. Winner: Player ${gameSession.gameState.winner !== undefined ? gameSession.gameState.winner + 1 : 'None'}`);
                        // Optionally, clean up the game session after a delay
                        // delete games[gameId]; 
                    }

                } catch (error) {
                    const err = error as Error;
                    console.error(`[${connectionId || 'Unknown Connection'}] Error processing MAKE_SHOT:`, err);
                     // @ts-ignore (accessing custom properties)
                    const gameId = ws.gameId as string | null;
                    if (gameId && games[gameId]) {
                        sendToBothPlayers(games[gameId], ServerToClientMessageType.ERROR, { message: 'Error processing shot: ' + err.message });
                    } else {
                         ws.send(createMessage(ServerToClientMessageType.ERROR, { message: 'Error processing shot: ' + err.message }));
                    }
                }
                break;

            default:
                // Убираем message.type из лога, так как message может быть never
                console.log(`[${connectionId}] Unknown message type received.`); 
                break;
        }
    });

    ws.on('close', () => {
        console.log(`Client disconnected: ${connectionId}`);
        // @ts-ignore
        const gameId = ws.gameId as string | null;
        // @ts-ignore
        const playerId = ws.playerId as string | null;

        if (gameId && games[gameId]) {
            const gameSession = games[gameId];
            const leavingPlayer = gameSession.players.find(p => p?.ws === ws);
            
            if (leavingPlayer) {
                console.log(`Player ${leavingPlayer.playerId} (Index ${leavingPlayer.playerIndex}) disconnected from game ${gameId}.`);
                // Notify the other player
                const otherPlayerIndex = (leavingPlayer.playerIndex + 1) % 2 as (0|1);
                sendMessageToPlayer(gameSession, otherPlayerIndex, ServerToClientMessageType.OPPONENT_DISCONNECTED, {
                    message: `Player ${leavingPlayer.playerIndex + 1} has disconnected.`
                });
                // Clean up player slot, but keep game for potential rejoin or mark as aborted
                gameSession.players[leavingPlayer.playerIndex] = null; 
                gameSession.gameState.gameStatus = 'finished'; // Or a new status like 'aborted'
                gameSession.gameState.winner = otherPlayerIndex; // Other player wins by default
                
                // If no players left, or some other condition, clean up the game.
                if (!gameSession.players[0] && !gameSession.players[1]) {
                    console.log(`Game ${gameId} has no players left, removing.`);
                    delete games[gameId];
                } else {
                     console.log(`Game ${gameId} marked as finished due to player disconnect.`);
                     // Optionally send GAME_OVER again
                     sendToBothPlayers(gameSession, ServerToClientMessageType.GAME_OVER, {
                        winnerPlayerIndex: otherPlayerIndex
                     });
                }
            }
        }
    });

    ws.on('error', (error: Error) => {
        console.error(`[${connectionId}] WebSocket error: ${error.message}`);
    });
});

wss.on('listening', () => {
    console.log(`WebSocket server is listening on port ${PORT}`);
});

wss.on('error', (error: Error) => {
    console.error(`WebSocketServer error: ${error.message}`);
}); 