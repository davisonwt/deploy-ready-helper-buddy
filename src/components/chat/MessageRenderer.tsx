import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Download, 
  Image, 
  Video, 
  Music, 
  Play, 
  Pause,
  Volume2
} from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { PurchaseDeliveryMessage } from './PurchaseDeliveryMessage';

interface MessageRendererProps {
  message: any;
  senderId: string;
  currentUserId: string;
  className?: string;
}

const MessageRenderer = ({ 
  message, 
  senderId, 
  currentUserId, 
  className = "" 
}: MessageRendererProps) => {
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const { toast } = useToast();
  const isOwn = senderId === currentUserId;
  const align = isOwn ? 'ml-auto' : 'mr-auto';

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'image':
        return Image;
      case 'video':
        return Video;
      case 'audio':
        return Music;
      default:
        return FileText;
    }
  };

  const handleDownload = async (fileUrl: string, fileName: string) => {
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Download started",
        description: `${fileName} is being downloaded.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Download failed",
        description: "There was an error downloading the file.",
      });
    }
  };

  const handleAudioPlay = (audioUrl: string) => {
    if (audioPlaying && audioElement) {
      audioElement.pause();
      setAudioPlaying(false);
      return;
    }

    const audio = new Audio(audioUrl);
    audio.play();
    setAudioElement(audio);
    setAudioPlaying(true);

    audio.onended = () => {
      setAudioPlaying(false);
      setAudioElement(null);
    };
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return 'Unknown size';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // File message
  if (message.message_type === 'file' && message.file_url) {
    const FileIcon = getFileIcon(message.file_type);
    
    return (
      <Card className={`max-w-xs ${align} ${className}`}>
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <FileIcon className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{message.file_name}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {message.file_type}
                </Badge>
                {message.file_size && (
                  <span className="text-xs text-muted-foreground">
                    {formatFileSize(message.file_size)}
                  </span>
                )}
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => handleDownload(message.file_url, message.file_name)}
              className="h-8 w-8 p-0"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>

          {/* Image Preview */}
          {message.file_type === 'image' && (
            <div className="mt-3">
              <img 
                src={message.file_url}
                alt={message.file_name}
                className="w-full max-h-48 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => window.open(message.file_url, '_blank')}
              />
            </div>
          )}

          {/* Video Preview */}
          {message.file_type === 'video' && (
            <div className="mt-3">
              <video 
                src={message.file_url}
                controls
                className="w-full max-h-48 rounded-lg"
                preload="metadata"
              >
                Your browser does not support video playback.
              </video>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Voice message
  if (message.message_type === 'voice' && message.file_url) {
    return (
      <Card className={`max-w-xs ${align} ${className}`}>
...
      </Card>
    );
  }

  // Purchase delivery message
  if (message.message_type === 'purchase_delivery' && message.system_metadata) {
    return <PurchaseDeliveryMessage metadata={message.system_metadata} />;
  }

  // Regular text message
  return (
    <Card className={`max-w-md ${align} ${className}`}>
      <CardContent className="p-3">
        <p className="text-sm whitespace-pre-wrap break-words">
          {message.content}
        </p>
      </CardContent>
    </Card>
  );
};

export default MessageRenderer;