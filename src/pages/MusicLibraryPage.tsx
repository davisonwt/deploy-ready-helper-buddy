import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PublicMusicLibrary from '@/components/radio/PublicMusicLibrary';
import { useAuth } from '@/hooks/useAuth';

export default function MusicLibraryPage() {
  const { user } = useAuth();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Music Library</h1>
          <p className="text-muted-foreground">
            Browse music for your marketing videos, voice overs, and radio shows
          </p>
        </div>

        <PublicMusicLibrary />
      </div>
    </div>
  );
}