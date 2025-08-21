import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, Image, FileText, Video, Music } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const getFileIcon = (fileType) => {
  const icons = {
    image: Image,
    video: Video,
    audio: Music,
    document: FileText,
  };
  return icons[fileType] || FileText;
};

const ChatMessage = ({ message, isOwn = false }) => {
  const sender = message.profiles;
  const FileIcon = getFileIcon(message.file_type);
  
  const getSenderName = () => {
    if (!sender) return 'Unknown User';
    return sender.display_name || 
           `${sender.first_name || ''} ${sender.last_name || ''}`.trim() || 
           'Anonymous User';
  };

  return (
    <div className={`flex gap-3 mb-4 ${isOwn ? 'flex-row-reverse' : ''}`}>
      <div className="flex-shrink-0">
        <Avatar className="h-8 w-8">
          <AvatarImage src={sender?.avatar_url} />
          <AvatarFallback className="bg-primary/20 text-primary font-bold border">
            {sender?.display_name?.charAt(0) || sender?.first_name?.charAt(0) || 'U'}
          </AvatarFallback>
        </Avatar>
      </div>
      
      <div className={`flex-1 max-w-[80%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
        <div className={`flex items-center gap-2 mb-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
          <span className="text-sm font-bold text-foreground bg-background/80 px-2 py-1 rounded-md border shadow-sm">
            {getSenderName()}
          </span>
          <span className="text-xs text-muted-foreground bg-background/60 px-2 py-1 rounded-md">
            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
          </span>
          {message.is_edited && (
            <Badge variant="outline" className="text-xs">
              edited
            </Badge>
          )}
        </div>
        
        <div 
          className={`rounded-lg px-3 py-2 max-w-full ${
            isOwn 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-muted'
          }`}
        >
          {message.content && (
            <p className="text-sm whitespace-pre-wrap break-words">
              {message.content}
            </p>
          )}
          
          {message.file_url && (
            <div className="mt-2 border rounded-lg p-3 bg-background/50">
              <div className="flex items-center gap-2 mb-2">
                <FileIcon className="h-4 w-4" />
                <span className="text-sm font-medium truncate">
                  {message.file_name}
                </span>
                <Badge variant="outline" className="text-xs">
                  {message.file_type}
                </Badge>
              </div>
              
              {message.file_type === 'image' && (
                <img 
                  src={message.file_url}
                  alt={message.file_name}
                  className="max-w-full max-h-64 rounded object-cover"
                />
              )}
              
              {message.file_type === 'video' && (
                <video 
                  src={message.file_url}
                  controls
                  className="max-w-full max-h-64 rounded"
                />
              )}
              
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-muted-foreground">
                  {message.file_size && `${(message.file_size / 1024 / 1024).toFixed(2)} MB`}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(message.file_url, '_blank')}
                  className="h-6 px-2"
                >
                  <Download className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;