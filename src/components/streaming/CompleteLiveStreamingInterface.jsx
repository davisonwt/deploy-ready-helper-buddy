import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Video, 
  Play, 
  Users, 
  Radio,
  Settings,
  Monitor,
  Camera
} from 'lucide-react';
import { LiveStreamBroadcaster } from './LiveStreamBroadcaster';
import { LiveStreamViewer } from './LiveStreamViewer';
import { LiveStreamDirectory } from './LiveStreamDirectory';
import { VideoProcessingWidget } from '../video/VideoProcessingWidget';

export const CompleteLiveStreamingInterface = ({ 
  className = "" 
}) => {
  const [activeTab, setActiveTab] = useState('directory');
  const [selectedStream, setSelectedStream] = useState(null);
  const [broadcastStream, setBroadcastStream] = useState(null);

  const handleStreamStarted = (streamData) => {
    setBroadcastStream(streamData);
    setActiveTab('broadcast');
  };

  const handleStreamEnded = () => {
    setBroadcastStream(null);
    setActiveTab('directory');
  };

  const handleStreamSelect = (stream) => {
    setSelectedStream(stream);
    setActiveTab('viewer');
  };

  const handleViewerStreamEnded = () => {
    setSelectedStream(null);
    setActiveTab('directory');
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="w-6 h-6" />
            Live Streaming Platform
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="directory" className="flex items-center gap-2">
                <Radio className="w-4 h-4" />
                Browse Streams
              </TabsTrigger>
              <TabsTrigger value="broadcast" className="flex items-center gap-2">
                <Camera className="w-4 h-4" />
                Go Live
              </TabsTrigger>
              <TabsTrigger value="viewer" disabled={!selectedStream} className="flex items-center gap-2">
                <Play className="w-4 h-4" />
                Watch Stream
              </TabsTrigger>
              <TabsTrigger value="processing" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Video Tools
              </TabsTrigger>
            </TabsList>

            {/* Browse Streams */}
            <TabsContent value="directory" className="space-y-6">
              <LiveStreamDirectory 
                onStreamSelect={handleStreamSelect}
              />
            </TabsContent>

            {/* Broadcasting Interface */}
            <TabsContent value="broadcast" className="space-y-6">
              <LiveStreamBroadcaster
                onStreamStarted={handleStreamStarted}
                onStreamEnded={handleStreamEnded}
              />
            </TabsContent>

            {/* Viewer Interface */}
            <TabsContent value="viewer" className="space-y-6">
              {selectedStream ? (
                <LiveStreamViewer
                  streamId={selectedStream.id}
                  onStreamEnded={handleViewerStreamEnded}
                  enableChat={true}
                />
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Monitor className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-medium mb-2">No stream selected</h3>
                    <p className="text-gray-600">
                      Select a stream from the directory to start watching
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Video Processing Tools */}
            <TabsContent value="processing" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <VideoProcessingWidget
                  onProcessingComplete={(results) => {
                    console.log('Video processing complete:', results);
                  }}
                />
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Stream Tools
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-sm text-gray-600">
                      <p className="mb-4">
                        Advanced tools for managing your live streams:
                      </p>
                      <ul className="space-y-2">
                        <li>• Process videos before streaming</li>
                        <li>• Generate thumbnails for stream previews</li>
                        <li>• Optimize video quality and compression</li>
                        <li>• Create highlight reels from recordings</li>
                        <li>• Auto-generate stream titles and descriptions</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};