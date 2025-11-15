import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface PlaylistTrack {
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

interface LiveSessionPlaylistContextType {
  selectedTracks: PlaylistTrack[];
  addTrack: (track: PlaylistTrack) => void;
  removeTrack: (trackId: string) => void;
  clearPlaylist: () => void;
  isTrackSelected: (trackId: string) => boolean;
  reorderTracks: (startIndex: number, endIndex: number) => void;
}

const LiveSessionPlaylistContext = createContext<LiveSessionPlaylistContextType | undefined>(undefined);

export function LiveSessionPlaylistProvider({ children }: { children: ReactNode }) {
  const [selectedTracks, setSelectedTracks] = useState<PlaylistTrack[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('liveSessionPlaylist');
    if (saved) {
      try {
        setSelectedTracks(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading live session playlist:', error);
      }
    }
  }, []);

  // Save to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('liveSessionPlaylist', JSON.stringify(selectedTracks));
  }, [selectedTracks]);

  const addTrack = (track: PlaylistTrack) => {
    setSelectedTracks((prev) => {
      const exists = prev.find((t) => t.id === track.id);
      if (exists) return prev;
      return [...prev, track];
    });
  };

  const removeTrack = (trackId: string) => {
    setSelectedTracks((prev) => prev.filter((t) => t.id !== trackId));
  };

  const clearPlaylist = () => {
    setSelectedTracks([]);
  };

  const isTrackSelected = (trackId: string) => {
    return selectedTracks.some((t) => t.id === trackId);
  };

  const reorderTracks = (startIndex: number, endIndex: number) => {
    setSelectedTracks((prev) => {
      const result = Array.from(prev);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return result;
    });
  };

  return (
    <LiveSessionPlaylistContext.Provider
      value={{
        selectedTracks,
        addTrack,
        removeTrack,
        clearPlaylist,
        isTrackSelected,
        reorderTracks
      }}
    >
      {children}
    </LiveSessionPlaylistContext.Provider>
  );
}

export function useLiveSessionPlaylist() {
  const context = useContext(LiveSessionPlaylistContext);
  if (!context) {
    throw new Error('useLiveSessionPlaylist must be used within LiveSessionPlaylistProvider');
  }
  return context;
}
