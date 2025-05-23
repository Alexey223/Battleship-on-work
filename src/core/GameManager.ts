import { GameState, Board } from '../types/game';

export const updateGameState = (
  prevState: GameState,
  playerIndex: number, // Индекс игрока, чья доска была обновлена (по кому стреляли)
  updatedBoard: Board,
  shotHit: boolean // Был ли выстрел удачным
): GameState => {
  const newPlayers = [...prevState.players];
  newPlayers[playerIndex] = {
    ...newPlayers[playerIndex],
    board: updatedBoard
  };

  const shootingPlayerIndex = prevState.currentPlayerIndex; // Это игрок, который стрелял

  // Проверка на потопление всех кораблей.
  // allShipsSunkForAttackedPlayer - все ли корабли потоплены у игрока, по которому стреляли.
  const allShipsSunkForAttackedPlayer = newPlayers[playerIndex].board.ships.every(ship => ship.hits === ship.size);
  
  // Эта проверка на потопление кораблей текущего стреляющего игрока здесь не нужна,
  // так как игра заканчивается, когда у АТАКОВАННОГО игрока потоплены все корабли.
  // const allShipsSunkForShootingPlayer = newPlayers[shootingPlayerIndex].board.ships.every(ship => ship.hits === ship.size);

  let newGameStatus = prevState.gameStatus;
  let newWinner = prevState.winner;
  let nextPlayerIndex = prevState.currentPlayerIndex;

  if (prevState.gameStatus === 'finished') {
    return prevState; 
  }

  if (allShipsSunkForAttackedPlayer && newPlayers[playerIndex].board.ships.length > 0) {
    newGameStatus = 'finished';
    newWinner = shootingPlayerIndex; // Победил тот, кто стрелял и потопил последний корабль
    nextPlayerIndex = shootingPlayerIndex; // Ход остается у победителя (или не важен)
  } else {
    // Если игра не закончена
    if (prevState.gameStatus === 'playing') {
      if (shotHit) {
        // Если попал, ход НЕ передается
        nextPlayerIndex = prevState.currentPlayerIndex;
        console.log(`[GameManager.ts] Игрок ${prevState.currentPlayerIndex} попал! Ход остается у него.`);
      } else {
        // Если промахнулся, ход передается
        nextPlayerIndex = (prevState.currentPlayerIndex + 1) % 2;
        console.log(`[GameManager.ts] Игрок ${prevState.currentPlayerIndex} промахнулся. Ход переходит к игроку ${nextPlayerIndex}.`);
        if (prevState.gameMode === 'multiplayer') {
          newGameStatus = 'switching_player'; // <--- НОВЫЙ СТАТУС для мультиплеера
          console.log("[GameManager.ts] Режим мультиплеера, устанавливаем статус switching_player.");
        } else {
          // В режиме single player ход передается сразу (AI)
          newGameStatus = 'playing'; 
        }
      }
    }
    // Если был 'setup', статус остается 'setup', ход не меняется (до явного старта игры)
    // Если был 'playing', статус остается 'playing'
  }

  return {
    ...prevState,
    players: newPlayers,
    gameStatus: newGameStatus,
    currentPlayerIndex: nextPlayerIndex,
    winner: newWinner
  };
}; 