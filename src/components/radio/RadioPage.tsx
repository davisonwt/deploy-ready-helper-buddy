import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Music, Radio, PlayCircle, MessageCircle, Disc, Sparkles, ArrowLeft, Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MusicLibrary from './MusicLibrary';
import PlaylistManager from './PlaylistManager';
import LiveStreamPlayer from './LiveStreamPlayer';
import ListenerInteractions from './ListenerInteractions';
import SessionBuilder from './SessionBuilder';
import { useAuth } from '@/hooks/useAuth';
import PageHeroBanner from '@/components/chat/PageHeroBanner';

const RadioPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="radio-surface">
        <div className="container mx-auto px-4 py-8">
          <Card className="radio-card border-radio-blue/30">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Radio className="h-16 w-16 text-radio-amber mb-4" />
              <h2 className="font-bitter text-3xl font-semibold mb-2 text-radio-mist">
                Welcome to AOD Station Radio
              </h2>
              <p className="text-radio-mist/70 text-center max-w-md">
                Please log in to access your music library, manage playlists, and tune into the live stream.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="radio-surface">
      <div className="container mx-auto px-4 py-8 space-y-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/communications-hub')}
          className="gap-2 px-0 text-radio-mist/70 hover:text-radio-amber hover:bg-transparent"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Go-Live
        </Button>
        <PageHeroBanner variant="radio" />

        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-3">
            <Radio className="h-9 w-9 text-radio-amber drop-shadow-[0_0_12px_rgba(255,180,84,0.45)]" />
            <h1 className="font-bitter text-5xl font-semibold tracking-tight bg-gradient-to-r from-radio-amber via-radio-mist to-radio-blue bg-clip-text text-transparent">
              AOD Station Radio
            </h1>
          </div>
          <p className="text-lg text-radio-mist/80 max-w-2xl mx-auto font-light">
            Your complete radio station — upload music, curate playlists, broadcast live, and tune in with listeners across the tribe.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Badge className="bg-radio-ink border border-radio-blue/40 text-radio-mist hover:bg-radio-ink/80 gap-1">
              <Music className="h-3 w-3" /> Music Library
            </Badge>
            <Badge className="bg-radio-ink border border-radio-amber/40 text-radio-mist hover:bg-radio-ink/80 gap-1">
              <PlayCircle className="h-3 w-3" /> Live Streaming
            </Badge>
            <Badge className="bg-radio-ink border border-radio-blue/40 text-radio-mist hover:bg-radio-ink/80 gap-1">
              <MessageCircle className="h-3 w-3" /> Listener Chat
            </Badge>
          </div>

          {/* Quick Access Navigation */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto mt-8">
            {[
              { icon: Disc, label: 'Radio Sessions', hint: 'Browse pre-recorded shows', to: '/radio-sessions' },
              { icon: Radio, label: 'Live Rooms', hint: 'Join live audio sessions', to: '/live-rooms' },
              { icon: Sparkles, label: 'Create Slot', hint: 'Generate your radio show', to: '/radio-generator' },
            ].map(({ icon: Icon, label, hint, to }) => (
              <Button
                key={to}
                variant="outline"
                className="h-auto py-6 flex flex-col gap-2 bg-radio-ink/60 border-radio-blue/30 text-radio-mist hover:bg-radio-ink hover:border-radio-amber/50 hover:text-radio-amber transition-colors"
                onClick={() => navigate(to)}
              >
                <Icon className="h-8 w-8" />
                <span className="font-bitter font-semibold text-base">{label}</span>
                <span className="text-xs text-radio-mist/60">{hint}</span>
              </Button>
            ))}
          </div>
        </div>

        <Tabs defaultValue="builder" className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-radio-ink/70 border border-radio-blue/25">
            <TabsTrigger
              value="builder"
              className="flex items-center gap-2 font-bitter data-[state=active]:bg-radio-blue/20 data-[state=active]:text-radio-amber"
            >
              <Layers className="h-4 w-4" /> <span>2-Hour Builder</span>
            </TabsTrigger>
            <TabsTrigger
              value="library"
              className="flex items-center gap-2 font-bitter data-[state=active]:bg-radio-blue/20 data-[state=active]:text-radio-amber"
            >
              <Music className="h-4 w-4" /> <span>Music Library</span>
            </TabsTrigger>
            <TabsTrigger
              value="playlists"
              className="flex items-center gap-2 font-bitter data-[state=active]:bg-radio-blue/20 data-[state=active]:text-radio-amber"
            >
              <PlayCircle className="h-4 w-4" /> <span>Playlists</span>
            </TabsTrigger>
            <TabsTrigger
              value="stream"
              className="flex items-center gap-2 font-bitter data-[state=active]:bg-radio-blue/20 data-[state=active]:text-radio-amber"
            >
              <Radio className="h-4 w-4" /> <span>Live Stream</span>
            </TabsTrigger>
            <TabsTrigger
              value="chat"
              className="flex items-center gap-2 font-bitter data-[state=active]:bg-radio-blue/20 data-[state=active]:text-radio-amber"
            >
              <MessageCircle className="h-4 w-4" /> <span>Live Chat</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="builder" className="mt-8">
            <SessionBuilder />
          </TabsContent>

          <TabsContent value="library" className="mt-8">
            <MusicLibrary />
          </TabsContent>

          <TabsContent value="playlists" className="mt-8">
            <PlaylistManager />
          </TabsContent>

          <TabsContent value="stream" className="mt-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <LiveStreamPlayer />
              <Card className="radio-card">
                <CardHeader>
                  <CardTitle className="font-bitter text-radio-mist flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full bg-radio-amber animate-pulse" />
                    Stream Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 rounded-lg bg-radio-bg/60 border border-radio-amber/30">
                      <div className="font-bitter text-2xl font-bold text-radio-amber tracking-wider">LIVE</div>
                      <div className="text-xs uppercase tracking-widest text-radio-mist/60 mt-1">Status</div>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-radio-bg/60 border border-radio-blue/30">
                      <div className="font-bitter text-2xl font-bold text-radio-blue tracking-wider">24/7</div>
                      <div className="text-xs uppercase tracking-widest text-radio-mist/60 mt-1">Broadcasting</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-bitter font-semibold text-radio-mist">Now Playing</h4>
                    <p className="text-sm text-radio-mist/70 leading-relaxed">
                      Tune in for continuous music from AOD Station Radio. Our DJs bring you the
                      best selection around the clock — from sunrise to the small hours.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="chat" className="mt-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <ListenerInteractions />
              <Card className="radio-card">
                <CardHeader>
                  <CardTitle className="font-bitter text-radio-mist">Chat Guidelines</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-bitter font-semibold flex items-center text-radio-amber">
                      <MessageCircle className="h-4 w-4 mr-2" /> Comments
                    </h4>
                    <p className="text-sm text-radio-mist/70">
                      Share your thoughts, reactions, and connect with other listeners during live shows.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-bitter font-semibold flex items-center text-radio-amber">
                      <Music className="h-4 w-4 mr-2" /> Song Requests
                    </h4>
                    <p className="text-sm text-radio-mist/70">
                      Request your favorites — DJs see your requests and play them when possible.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-bitter font-semibold text-radio-mist">Community Guidelines</h4>
                    <ul className="text-sm text-radio-mist/70 space-y-1">
                      <li>• Be respectful to all listeners and DJs</li>
                      <li>• Keep requests appropriate and family-friendly</li>
                      <li>• Avoid spam and repeated messages</li>
                      <li>• Enjoy the music and community</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default RadioPage;
