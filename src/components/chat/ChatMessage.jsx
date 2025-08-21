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
  const sender = message.sender_profile;
  const FileIcon = getFileIcon(message.file_type);
  
  // Generate a consistent pastel color for each user based on their ID
  const getPastelColor = (userId) => {
    if (!userId) return { bg: 'bg-gray-200', text: 'text-gray-800', border: 'border-gray-300' };
    
    const colors = [
      { bg: 'bg-rose-300', text: 'text-rose-900', border: 'border-rose-400' },
      { bg: 'bg-blue-300', text: 'text-blue-900', border: 'border-blue-400' },
      { bg: 'bg-green-300', text: 'text-green-900', border: 'border-green-400' },
      { bg: 'bg-purple-300', text: 'text-purple-900', border: 'border-purple-400' },
      { bg: 'bg-yellow-300', text: 'text-yellow-900', border: 'border-yellow-400' },
      { bg: 'bg-pink-300', text: 'text-pink-900', border: 'border-pink-400' },
      { bg: 'bg-indigo-300', text: 'text-indigo-900', border: 'border-indigo-400' },
      { bg: 'bg-teal-300', text: 'text-teal-900', border: 'border-teal-400' },
      { bg: 'bg-orange-300', text: 'text-orange-900', border: 'border-orange-400' },
      { bg: 'bg-cyan-300', text: 'text-cyan-900', border: 'border-cyan-400' },
      { bg: 'bg-emerald-300', text: 'text-emerald-900', border: 'border-emerald-400' },
      { bg: 'bg-violet-300', text: 'text-violet-900', border: 'border-violet-400' },
    ];
    
    // Create a simple hash from the user ID to get consistent colors
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colorIndex = Math.abs(hash) % colors.length;
    console.log(`User ${userId} gets color index ${colorIndex}:`, colors[colorIndex]);
    return colors[colorIndex];
  };

  const userColor = getPastelColor(message.sender_id);
  
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
          <span className={`text-sm font-bold px-3 py-1 rounded-full border backdrop-blur-md shadow-lg ${userColor.bg} ${userColor.text} ${userColor.border}`}>
            {getSenderName()}
          </span>
          <span className="text-xs text-gray-600 bg-white/90 backdrop-blur-md px-2 py-1 rounded-full border border-white/30 shadow-md">
            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
          </span>
          {message.is_edited && (
            <Badge variant="outline" className="text-xs bg-white/90 backdrop-blur-md border border-white/50 text-gray-700">
              edited
            </Badge>
          )}
        </div>
        
        <div 
          className={`rounded-lg px-3 py-2 max-w-full backdrop-blur-md shadow-xl border ${userColor.bg} ${userColor.text} ${userColor.border}`}
        >
          {message.content && (
            <p className="text-sm whitespace-pre-wrap break-words">
              {message.content}
            </p>
          )}
          
          {message.file_url && (
            <div className="mt-2 border border-white/50 rounded-lg p-3 bg-white/95 backdrop-blur-md shadow-lg">
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