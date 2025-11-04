import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Download, 
  Image, 
  FileText, 
  Video, 
  Music, 
  File,
  Eye,
  ExternalLink,
  Share2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const getFileIcon = (fileType) => {
  const icons = {
    image: Image,
    video: Video,
    audio: Music,
    document: FileText,
  };
  return icons[fileType] || File;
};

const FilePreview = ({ 
  fileUrl, 
  fileName, 
  fileType, 
  fileSize, 
  className = "",
  showPreview = true,
  compact = false 
}) => {
  const [imageError, setImageError] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();
  const FileIcon = getFileIcon(fileType);

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown size';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownload = async () => {
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
      console.error('Download failed:', error);
      toast({
        title: "Download failed",
        description: "There was an error downloading the file.",
        variant: "destructive",
      });
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: fileName,
          url: fileUrl,
        });
      } catch (error) {
        // User cancelled sharing
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(fileUrl);
        toast({
          title: "Link copied",
          description: "File link copied to clipboard.",
        });
      } catch (error) {
        toast({
          title: "Share failed",
          description: "Unable to share or copy link.",
          variant: "destructive",
        });
      }
    }
  };

  const renderPreview = () => {
    if (!showPreview) return null;

    switch (fileType) {
      case 'image':
        if (imageError) {
          return (
            <div className="w-full h-32 bg-muted rounded flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Image preview unavailable</p>
            </div>
          );
        }
        return (
          <img 
            src={fileUrl}
            alt={fileName}
            className="w-full max-h-48 object-cover rounded cursor-pointer hover:opacity-90 transition-opacity"
            onError={() => setImageError(true)}
            onClick={() => setIsModalOpen(true)}
          />
        );
      
      case 'video':
        return (
          <video 
            src={fileUrl}
            controls
            className="w-full max-h-48 rounded"
            preload="metadata"
          >
            Your browser does not support video playback.
          </video>
        );
      
      case 'audio':
        return (
          <div className="w-full">
            <audio 
              src={fileUrl}
              controls
              className="w-full"
              preload="metadata"
            >
              Your browser does not support audio playback.
            </audio>
          </div>
        );
      
      default:
        return null;
    }
  };

  const renderFullPreview = () => {
    if (fileType !== 'image' || imageError) return null;

    return (
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{fileName}</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center">
            <img 
              src={fileUrl}
              alt={fileName}
              className="max-w-full max-h-[70vh] object-contain rounded"
            />
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-2 p-2 border rounded ${className}`}>
        <FileIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{fileName}</p>
          <p className="text-xs text-muted-foreground">{formatFileSize(fileSize)}</p>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={handleDownload} className="h-6 w-6 p-0">
            <Download className="h-3 w-3" />
          </Button>
          {fileType === 'image' && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsModalOpen(true)}
              className="h-6 w-6 p-0"
            >
              <Eye className="h-3 w-3" />
            </Button>
          )}
        </div>
        {renderFullPreview()}
      </div>
    );
  }

  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardContent className="p-3">
        {/* File Info Header */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <FileIcon className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium truncate">{fileName}</p>
              <Badge variant="outline" className="text-xs">
                {fileType}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(fileSize)}
            </p>
          </div>
        </div>
        
        {/* File Preview */}
        {renderPreview()}
        
        {/* Action Buttons */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t">
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
            <Button variant="ghost" size="sm" onClick={() => window.open(fileUrl, '_blank')}>
              <ExternalLink className="h-4 w-4 mr-1" />
              Open
            </Button>
          </div>
          <Button variant="ghost" size="sm" onClick={handleShare}>
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
      
      {/* Full Image Preview Modal */}
      {renderFullPreview()}
    </Card>
  );
};

export default FilePreview;