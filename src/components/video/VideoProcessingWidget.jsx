import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Video, 
  Image, 
  Settings, 
  Download, 
  Play, 
  Pause,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useVideoProcessor } from '@/hooks/useVideoProcessor';

export const VideoProcessingWidget = ({ 
  file, 
  onProcessingComplete, 
  onThumbnailSelect,
  className = ""
}) => {
  const [results, setResults] = useState(null);
  const [selectedThumbnail, setSelectedThumbnail] = useState(null);
  const [compressionSettings, setCompressionSettings] = useState({
    quality: 'medium',
    maxSizeMB: 50,
    targetWidth: null,
    targetHeight: null
  });
  const [thumbnailSettings, setThumbnailSettings] = useState({
    interval: 10,
    maxThumbnails: 6,
    width: 320,
    height: 180
  });

  const { processing, progress, progressMessage, error, processVideoFile, getVideoMetadata } = useVideoProcessor();

  const handleProcess = async () => {
    try {
      const result = await processVideoFile(file, {
        compress: true,
        generateThumbnails: true,
        compressionOptions: compressionSettings,
        thumbnailOptions: thumbnailSettings
      });

      setResults(result);
      onProcessingComplete?.(result);
    } catch (err) {
      console.error('Processing failed:', err);
    }
  };

  const handleThumbnailSelect = (thumbnail) => {
    setSelectedThumbnail(thumbnail);
    onThumbnailSelect?.(thumbnail);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (!file) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-48">
          <div className="text-center">
            <Video className="w-12 h-12 mx-auto text-gray-400 mb-2" />
            <p className="text-gray-500">Select a video file to process</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="w-5 h-5" />
          Video Processing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File Info */}
        <div className="space-y-2">
          <h3 className="font-medium">File Information</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <p><strong>Name:</strong> {file.name}</p>
            <p><strong>Size:</strong> {formatFileSize(file.size)}</p>
            <p><strong>Type:</strong> {file.type}</p>
          </div>
        </div>

        <Tabs defaultValue="settings" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="preview" disabled={!results}>Preview</TabsTrigger>
            <TabsTrigger value="thumbnails" disabled={!results}>Thumbnails</TabsTrigger>
          </TabsList>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            {/* Compression Settings */}
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Compression Settings
              </h4>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Quality</Label>
                  <Select 
                    value={compressionSettings.quality} 
                    onValueChange={(value) => setCompressionSettings(prev => ({ ...prev, quality: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High (2 Mbps)</SelectItem>
                      <SelectItem value="medium">Medium (1 Mbps)</SelectItem>
                      <SelectItem value="low">Low (0.5 Mbps)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Max Size (MB)</Label>
                  <div className="px-3">
                    <Slider
                      value={[compressionSettings.maxSizeMB]}
                      onValueChange={([value]) => setCompressionSettings(prev => ({ ...prev, maxSizeMB: value }))}
                      max={100}
                      min={10}
                      step={5}
                      className="w-full"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      {compressionSettings.maxSizeMB} MB
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Thumbnail Settings */}
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Image className="w-4 h-4" />
                Thumbnail Settings
              </h4>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Interval (seconds)</Label>
                  <div className="px-3">
                    <Slider
                      value={[thumbnailSettings.interval]}
                      onValueChange={([value]) => setThumbnailSettings(prev => ({ ...prev, interval: value }))}
                      max={30}
                      min={5}
                      step={5}
                      className="w-full"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      Every {thumbnailSettings.interval} seconds
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Max Thumbnails</Label>
                  <div className="px-3">
                    <Slider
                      value={[thumbnailSettings.maxThumbnails]}
                      onValueChange={([value]) => setThumbnailSettings(prev => ({ ...prev, maxThumbnails: value }))}
                      max={20}
                      min={3}
                      step={1}
                      className="w-full"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      {thumbnailSettings.maxThumbnails} thumbnails
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Process Button */}
            <Button 
              onClick={handleProcess} 
              disabled={processing}
              className="w-full"
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Video className="w-4 h-4 mr-2" />
                  Process Video
                </>
              )}
            </Button>
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview" className="space-y-4">
            {results && (
              <div className="space-y-4">
                {/* Compression Results */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Original</h4>
                    <div className="text-sm text-gray-600">
                      <p>Size: {formatFileSize(results.originalFile.size)}</p>
                      <p>Duration: {formatDuration(results.metadata.duration)}</p>
                      <p>Resolution: {results.metadata.width}×{results.metadata.height}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Compressed</h4>
                    <div className="text-sm text-gray-600">
                      <p>Size: {formatFileSize(results.compressedFile.size)}</p>
                      <p>Ratio: {results.compressionRatio.toFixed(1)}×</p>
                      <Badge variant="secondary">
                        {((1 - results.compressedFile.size / results.originalFile.size) * 100).toFixed(1)}% smaller
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Download Button */}
                <Button 
                  variant="outline" 
                  onClick={() => {
                    const url = URL.createObjectURL(results.compressedFile);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = results.compressedFile.name;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="w-full"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Compressed Video
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Thumbnails Tab */}
          <TabsContent value="thumbnails" className="space-y-4">
            {results?.thumbnails && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Generated Thumbnails</h4>
                  <Badge variant="outline">
                    {results.thumbnails.length} thumbnails
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  {results.thumbnails.map((thumbnail, index) => (
                    <div
                      key={index}
                      className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-colors ${
                        selectedThumbnail === thumbnail 
                          ? 'border-primary' 
                          : 'border-transparent hover:border-gray-300'
                      }`}
                      onClick={() => handleThumbnailSelect(thumbnail)}
                    >
                      <img
                        src={thumbnail.url}
                        alt={`Thumbnail at ${formatDuration(thumbnail.timestamp)}`}
                        className="w-full h-20 object-cover"
                      />
                      <div className="absolute bottom-1 left-1 bg-black bg-opacity-75 text-white text-xs px-1 rounded">
                        {formatDuration(thumbnail.timestamp)}
                      </div>
                      {selectedThumbnail === thumbnail && (
                        <div className="absolute top-1 right-1">
                          <CheckCircle className="w-4 h-4 text-primary" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {selectedThumbnail && (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      const url = selectedThumbnail.url;
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `thumbnail_${formatDuration(selectedThumbnail.timestamp)}.jpg`;
                      a.click();
                    }}
                    className="w-full"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Selected Thumbnail
                  </Button>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Progress Bar */}
        {processing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>{progressMessage}</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};