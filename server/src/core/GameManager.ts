import { ServerGameState as GameState, Board, Ship, Player } from '../types/game';

export const updateGameState = (
  prevState: GameState,
  playerIndex: 0 | 1, // Индекс игрока, чья доска была обновлена (по кому стреляли)
  updatedBoard: Board,
  shotHit: boolean // Был ли выстрел удачным
): GameState => {
  const playersCopy = [...prevState.players] as [Player | null, Player | null];
  const attackedPlayer = playersCopy[playerIndex];

  if (!attackedPlayer) {
    console.error(`[GameManager.ts] Error: Attacked player at index ${playerIndex} is null.`);
    return prevState; // Should not happen if logic is correct
  }

  playersCopy[playerIndex] = {
    ...attackedPlayer,
    board: updatedBoard
  };

  const shootingPlayerIndex = prevState.currentPlayerIndex; // Это игрок, который стрелял

  // Проверка на потопление всех кораблей.
  const allShipsSunkForAttackedPlayer = attackedPlayer.board.ships.every((ship: Ship) => ship.hits === ship.size);
  
  // Эта проверка на потопление кораблей текущего стреляющего игрока здесь не нужна,
  // так как игра заканчивается, когда у АТАКОВАННОГО игрока потоплены все корабли.
  // const allShipsSunkForShootingPlayer = newPlayers[shootingPlayerIndex].board.ships.every(ship => ship.hits === ship.size);

  let newGameStatus = prevState.gameStatus;
  let newWinner = prevState.winner;
  let nextPlayerIndex = prevState.currentPlayerIndex;

  if (prevState.gameStatus === 'finished') {
    return prevState; 
  }

  if (allShipsSunkForAttackedPlayer && attackedPlayer.board.ships.length > 0) {
    newGameStatus = 'finished';
    newWinner = shootingPlayerIndex as (0 | 1); // Победил тот, кто стрелял
    nextPlayerIndex = shootingPlayerIndex; 
  } else {
    if (prevState.gameStatus === 'playing') {
      if (shotHit) {
        nextPlayerIndex = prevState.currentPlayerIndex;
        console.log(`[GameManager.ts] Player ${prevState.currentPlayerIndex} hit! Turn remains.`);
      } else {
        nextPlayerIndex = (prevState.currentPlayerIndex + 1) % 2 as (0 | 1);
        console.log(`[GameManager.ts] Player ${prevState.currentPlayerIndex} missed. Turn passes to player ${nextPlayerIndex}.`);
        // Server doesn't use 'switching_player', it just changes the active player.
        newGameStatus = 'playing'; 
      }
    }
    // Если был 'setup', статус остается 'setup', ход не меняется (до явного старта игры)
    // Если был 'playing', статус остается 'playing' или переходит в 'finished'
  }

  return {
    ...prevState,
    players: playersCopy,
    gameStatus: newGameStatus,
    currentPlayerIndex: nextPlayerIndex,
    winner: newWinner
  };
}; 