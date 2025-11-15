import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AlbumTrack {
  id: string;
  track_title: string;
  artist_name: string | null;
  duration_seconds: number | null;
  file_url: string;
  profiles?: {
    username: string | null;
    avatar_url: string | null;
  };
}

interface AlbumBuilderContextType {
  selectedTracks: AlbumTrack[];
  addTrack: (track: AlbumTrack) => void;
  removeTrack: (trackId: string) => void;
  clearAlbum: () => void;
  isTrackSelected: (trackId: string) => boolean;
  canAddMore: boolean;
  albumPrice: number;
}

const AlbumBuilderContext = createContext<AlbumBuilderContextType | undefined>(undefined);

const ALBUM_SIZE = 10;
const ALBUM_PRICE = 20; // $20 including tithing and admin

export function AlbumBuilderProvider({ children }: { children: ReactNode }) {
  const [selectedTracks, setSelectedTracks] = useState<AlbumTrack[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('albumBuilder');
    if (saved) {
      try {
        setSelectedTracks(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading album:', error);
      }
    }
  }, []);

  // Save to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('albumBuilder', JSON.stringify(selectedTracks));
  }, [selectedTracks]);

  const addTrack = (track: AlbumTrack) => {
    setSelectedTracks((prev) => {
      if (prev.length >= ALBUM_SIZE) return prev;
      const exists = prev.find((t) => t.id === track.id);
      if (exists) return prev;
      return [...prev, track];
    });
  };

  const removeTrack = (trackId: string) => {
    setSelectedTracks((prev) => prev.filter((t) => t.id !== trackId));
  };

  const clearAlbum = () => {
    setSelectedTracks([]);
  };

  const isTrackSelected = (trackId: string) => {
    return selectedTracks.some((t) => t.id === trackId);
  };

  const canAddMore = selectedTracks.length < ALBUM_SIZE;

  return (
    <AlbumBuilderContext.Provider
      value={{
        selectedTracks,
        addTrack,
        removeTrack,
        clearAlbum,
        isTrackSelected,
        canAddMore,
        albumPrice: ALBUM_PRICE
      }}
    >
      {children}
    </AlbumBuilderContext.Provider>
  );
}

export function useAlbumBuilder() {
  const context = useContext(AlbumBuilderContext);
  if (!context) {
    throw new Error('useAlbumBuilder must be used within AlbumBuilderProvider');
  }
  return context;
}
