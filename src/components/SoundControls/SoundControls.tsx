import React from 'react';
import { useSound } from '../../contexts/SoundContext';
import styles from './SoundControls.module.css';

export const SoundControls: React.FC = () => {
  const { isMuted, volume, toggleMute, setVolume } = useSound();

  const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(event.target.value));
  };

  return (
    <div className={styles.container}>
      <button
        className={`${styles.muteButton} ${isMuted ? styles.muted : ''}`}
        onClick={toggleMute}
        title={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? '🔇' : '🔊'}
      </button>
      <input
        type="range"
        min="0"
        max="1"
        step="0.1"
        value={volume}
        onChange={handleVolumeChange}
        className={styles.volumeSlider}
        disabled={isMuted}
      />
    </div>
  );
}; 