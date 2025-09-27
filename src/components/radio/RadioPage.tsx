import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Music, Radio, PlayCircle, MessageCircle } from 'lucide-react';
import MusicLibrary from './MusicLibrary';
import PlaylistManager from './PlaylistManager';
import LiveStreamPlayer from './LiveStreamPlayer';
import ListenerInteractions from './ListenerInteractions';
import { useAuth } from '@/hooks/useAuth';

const RadioPage = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Radio className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Welcome to AOD Station Radio</h2>
            <p className="text-muted-foreground text-center">
              Please log in to access your music library, manage playlists, and interact with live streams.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-2">
          <Radio className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            AOD Station Radio
          </h1>
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Your complete radio station management system. Upload music, create playlists, stream live, and interact with listeners.
        </p>
        <div className="flex justify-center space-x-4">
          <Badge variant="secondary" className="flex items-center space-x-1">
            <Music className="h-3 w-3" />
            <span>Music Library</span>
          </Badge>
          <Badge variant="secondary" className="flex items-center space-x-1">
            <PlayCircle className="h-3 w-3" />
            <span>Live Streaming</span>
          </Badge>
          <Badge variant="secondary" className="flex items-center space-x-1">
            <MessageCircle className="h-3 w-3" />
            <span>Listener Chat</span>
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="library" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="library" className="flex items-center space-x-2">
            <Music className="h-4 w-4" />
            <span>Music Library</span>
          </TabsTrigger>
          <TabsTrigger value="playlists" className="flex items-center space-x-2">
            <PlayCircle className="h-4 w-4" />
            <span>Playlists</span>
          </TabsTrigger>
          <TabsTrigger value="stream" className="flex items-center space-x-2">
            <Radio className="h-4 w-4" />
            <span>Live Stream</span>
          </TabsTrigger>
          <TabsTrigger value="chat" className="flex items-center space-x-2">
            <MessageCircle className="h-4 w-4" />
            <span>Live Chat</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="mt-8">
          <MusicLibrary />
        </TabsContent>

        <TabsContent value="playlists" className="mt-8">
          <PlaylistManager />
        </TabsContent>

        <TabsContent value="stream" className="mt-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <LiveStreamPlayer />
            <Card>
              <CardHeader>
                <CardTitle>Stream Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-primary">LIVE</div>
                    <div className="text-sm text-muted-foreground">Status</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">24/7</div>
                    <div className="text-sm text-muted-foreground">Broadcasting</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Now Playing</h4>
                  <p className="text-sm text-muted-foreground">
                    Tune in to enjoy continuous music from AOD Station Radio. 
                    Our DJs bring you the best selection of music around the clock.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="chat" className="mt-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <ListenerInteractions />
            <Card>
              <CardHeader>
                <CardTitle>Chat Guidelines</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Comments
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Share your thoughts, reactions, and connect with other listeners during live shows.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center">
                    <Music className="h-4 w-4 mr-2" />
                    Song Requests
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Request your favorite songs! DJs will see your requests and play them when possible.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Community Guidelines</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Be respectful to all listeners and DJs</li>
                    <li>• Keep requests appropriate and family-friendly</li>
                    <li>• Avoid spam and repeated messages</li>
                    <li>• Enjoy the music and community!</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RadioPage;