import React, { useState, useEffect } from 'react';
import { CellProps } from '../../types/game';
// Удаляем импорт useSound, если playSound не используется
// import { useSound } from '../../contexts/SoundContext'; 
import styles from './Cell.module.css';
import '../../App.css'; // Ensure global animation styles are available

export const Cell: React.FC<CellProps> = ({ x, y, cell, onClick, showShipsForThisBoard }) => {
  // Удаляем извлечение playSound
  // const { playSound } = useSound(); 
  const [animationClass, setAnimationClass] = useState('');
  const [isHitAnimating, setIsHitAnimating] = useState(false);

  useEffect(() => {
    let timerId: NodeJS.Timeout;
    if (cell.state === 'hit') {
      setAnimationClass('hit-animation'); // This is the global fire animation
      setIsHitAnimating(true); // Used to make local background transparent
      timerId = setTimeout(() => {
        setAnimationClass('');
        setIsHitAnimating(false);
      }, 500); // Duration of hit animation (from App.css)
    } else if (cell.state === 'miss') {
      setAnimationClass('miss-animation'); // Global miss animation
      timerId = setTimeout(() => setAnimationClass(''), 700); // Duration of miss animation (from App.css)
    } else {
      // If cell state changes to something else (e.g. empty after a reset), clear animations
      setAnimationClass('');
      setIsHitAnimating(false);
    }
    return () => clearTimeout(timerId);
  }, [cell.state]);

  const handleClick = () => {
    console.log(`[Cell.tsx] handleClick: x=${x}, y=${y}, cellState=${cell.state}`);
    // Звук выстрела теперь проигрывается в GameLayout, здесь не нужно
    // if (cell.state === 'empty' || cell.state === 'ship') {
    //   playSound('shot'); 
    // }
    onClick();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
  };

  const getCellClassName = () => {
    const classNames = [styles.cell];
    
    if (cell.state === 'sunk_ship_segment') {
      classNames.push(styles.sunk_ship_segment);
    } else if (cell.state === 'hit') {
      classNames.push(styles.hit);
      if (isHitAnimating) {
        classNames.push(styles.hitWhileAnimating); // Add modifier for transparent background
      }
    } else if (cell.state === 'miss') {
      classNames.push(styles.miss);
    } else if (cell.state === 'ship') {
      if (showShipsForThisBoard) { 
        classNames.push(styles.ship);
      } 
    } 
    
    if (animationClass && !(cell.state === 'hit' && isHitAnimating)) {
      // Apply global animation class if it's set, 
      // but don't apply .hit-animation if we are already handling it via .hitWhileAnimating
      // This primarily applies to .miss-animation or other future global animations
      classNames.push(animationClass);
    } else if (animationClass && cell.state === 'hit' && isHitAnimating) {
      // If it is a hit and is animating, the hit-animation class (from App.css for fire effect)
      // should be applied directly for the background animation.
      classNames.push('hit-animation'); 
    }

    return classNames.join(' ');
  };

  // Стиль для цвета корабля, если он видим и НЕ потоплен
  const cellStyle: React.CSSProperties = {};
  if (cell.state === 'ship' && showShipsForThisBoard && cell.shipColor) {
    cellStyle.backgroundColor = cell.shipColor;
  } else if (cell.state === 'ship' && showShipsForThisBoard) {
    // Если shipColor не задан, но корабль должен быть виден, можно использовать CSS переменную
    // cellStyle['--ship-color'] = '#дефолтный_цвет_если_надо'; // Пример
  }


  return (
    <div
      className={getCellClassName()}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Cell at ${String.fromCharCode(65 + y)}${x + 1}`}
      style={cellStyle}
    />
  );
}; 