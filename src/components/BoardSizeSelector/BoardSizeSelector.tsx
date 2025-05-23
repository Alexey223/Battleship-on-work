import React from 'react';
import styles from './BoardSizeSelector.module.css';
import { BoardSize } from '../../types/game';

interface BoardSizeSelectorProps {
  boardSize: BoardSize;
  onChange: (size: BoardSize) => void;
  disabled?: boolean;
}

export const BoardSizeSelector: React.FC<BoardSizeSelectorProps> = ({
  boardSize,
  onChange,
  disabled = false
}) => {
  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = parseInt(event.target.value) as BoardSize;
    onChange(newSize);
  };

  return (
    <div className={styles.container}>
      <label htmlFor="boardSize" className={styles.label}>
        Board Size
      </label>
      <select
        id="boardSize"
        value={boardSize}
        onChange={handleChange}
        disabled={disabled}
        className={styles.select}
      >
        <option value={5}>Small (5x5)</option>
        <option value={8}>Medium (8x8)</option>
        <option value={10}>Large (10x10)</option>
      </select>
    </div>
  );
}; 