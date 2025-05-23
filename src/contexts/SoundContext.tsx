import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface SoundContextType {
  isMuted: boolean;
  volume: number;
  toggleMute: () => void;
  setVolume: (volume: number) => void;
  playSound: (sound: SoundEffect) => void;
}

type SoundEffect = 'shot' | 'hit' | 'miss' | 'sunk' | 'win' | 'lose';

const SoundContext = createContext<SoundContextType | undefined>(undefined);

// Предзагрузка звуков
const sounds: Record<SoundEffect, string> = {
  shot: '/sounds/shot.mp3',
  hit: '/sounds/hit.mp3',
  miss: '/sounds/miss.mp3',
  sunk: '/sounds/sunk.mp3',
  win: '/sounds/win.mp3',
  lose: '/sounds/lose.mp3'
};

// Создаем аудио элементы для каждого звука
const audioElements: Record<SoundEffect, HTMLAudioElement> = {
  shot: new Audio(sounds.shot),
  hit: new Audio(sounds.hit),
  miss: new Audio(sounds.miss),
  sunk: new Audio(sounds.sunk),
  win: new Audio(sounds.win),
  lose: new Audio(sounds.lose)
};

export const SoundProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMuted, setIsMuted] = useState(() => {
    const savedMute = localStorage.getItem('battleship_muted');
    return savedMute ? JSON.parse(savedMute) : false;
  });

  const [volume, setVolumeState] = useState(() => {
    const savedVolume = localStorage.getItem('battleship_volume');
    return savedVolume ? JSON.parse(savedVolume) : 0.5;
  });

  // Обновляем громкость всех звуков при изменении
  useEffect(() => {
    Object.values(audioElements).forEach(audio => {
      audio.volume = isMuted ? 0 : volume;
    });
  }, [volume, isMuted]);

  // Сохраняем настройки в localStorage
  useEffect(() => {
    localStorage.setItem('battleship_muted', JSON.stringify(isMuted));
    localStorage.setItem('battleship_volume', JSON.stringify(volume));
  }, [isMuted, volume]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev: boolean) => !prev);
  }, []);

  const setVolume = useCallback((newVolume: number) => {
    setVolumeState(Math.max(0, Math.min(1, newVolume)));
  }, []);

  const playSound = useCallback((sound: SoundEffect) => {
    if (isMuted) return;

    const audio = audioElements[sound];
    audio.currentTime = 0;
    audio.play().catch(error => {
      console.error('Error playing sound:', error);
    });
  }, [isMuted]);

  return (
    <SoundContext.Provider value={{ isMuted, volume, toggleMute, setVolume, playSound }}>
      {children}
    </SoundContext.Provider>
  );
};

export const useSound = () => {
  const context = useContext(SoundContext);
  if (context === undefined) {
    throw new Error('useSound must be used within a SoundProvider');
  }
  return context;
}; 