import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Paperclip, Mic, Loader2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ChatInputProps {
  roomId: string;
  onSendMessage: (msg: any) => void;
}

const ChatInput = ({ roomId, onSendMessage }: ChatInputProps) => {
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File): Promise<string> => {
    if (!file) return '';
    setUploading(true);
    setError('');
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}-${Date.now()}.${fileExt}`;
      const filePath = `${user?.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-files')
        .upload(filePath, file, { upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-files')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (err: any) {
      setError(err.message);
      toast({ 
        variant: 'destructive', 
        title: 'Upload failed', 
        description: err.message 
      });
      return '';
    } finally {
      setUploading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const fileUrl = await uploadFile(
          new File([audioBlob], `voice-${Date.now()}.webm`, { type: 'audio/webm' })
        );
        
        if (fileUrl) {
          onSendMessage({ 
            content: '[Voice Message]', 
            message_type: 'voice',
            file_url: fileUrl,
            file_name: `voice-${Date.now()}.webm`,
            file_type: 'audio'
          });
        }
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setRecording(true);
      
      toast({
        title: 'Recording started',
        description: 'Speak now, click again to stop'
      });
    } catch (err: any) {
      setError('Failed to access microphone');
      toast({ 
        variant: 'destructive', 
        title: 'Error', 
        description: 'Failed to access microphone. Please check permissions.' 
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      toast({
        title: 'Recording stopped',
        description: 'Processing voice message...'
      });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      console.error('No file selected');
      return;
    }
    
    const file = files[0];
    if (!file) {
      console.error('No file in files array');
      return;
    }
    
    // Check if file is empty
    if (file.size === 0) {
      console.error('Empty file detected:', file.name);
      toast({
        variant: 'destructive',
        title: 'Empty File',
        description: `File "${file.name}" is empty. Please select a valid file.`
      });
      return;
    }
    
    // Check file size (limit to 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      toast({
        variant: 'destructive',
        title: 'File too large',
        description: 'Please select a file smaller than 10MB'
      });
      return;
    }
    
    console.log('File selected:', { name: file.name, size: file.size, type: file.type });
    setSelectedFile(file);
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = async () => {
    if ((!message.trim() && !selectedFile) || uploading || recording) return;

    try {
      // Import sanitization utility
      const { sanitizeInput } = await import('@/utils/inputSanitization');
      
      let fileData = null;
      
      if (selectedFile) {
        const fileUrl = await uploadFile(selectedFile);
        if (fileUrl) {
          // Determine file type
          let fileType = 'document';
          if (selectedFile.type.startsWith('image/')) fileType = 'image';
          else if (selectedFile.type.startsWith('video/')) fileType = 'video';
          else if (selectedFile.type.startsWith('audio/')) fileType = 'audio';

          fileData = {
            file_url: fileUrl,
            file_name: sanitizeInput.filename(selectedFile.name),
            file_type: fileType,
            file_size: selectedFile.size
          };
        }
      }

      // Sanitize message content (max 5000 chars)
      const sanitizedContent = message.trim() 
        ? sanitizeInput.text(message.trim(), 5000) 
        : (fileData ? '[File]' : '');

      await onSendMessage({ 
        content: sanitizedContent,
        message_type: fileData ? 'file' : 'text',
        ...fileData
      });

      setMessage('');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      setError(err.message);
      toast({
        variant: 'destructive',
        title: 'Send failed',
        description: err.message
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-2">
      {/* Selected File Preview */}
      {selectedFile && (
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            <Paperclip className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={removeSelectedFile}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Input Row */}
      <div className="flex items-center gap-2 p-4 border-t bg-background/95 backdrop-blur-sm">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={recording ? "Recording..." : "Type a message..."}
          onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          className="flex-1"
          disabled={recording || uploading}
        />
        
        {/* File Upload Button */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || recording}
          className="px-3"
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileUpload}
          className="hidden"
          accept="image/*,video/*,audio/*,application/pdf,.doc,.docx,.txt,.zip"
        />

        {/* Voice Recording Button */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={recording ? stopRecording : startRecording}
          disabled={uploading}
          className={`px-3 ${recording ? 'text-red-500 animate-pulse' : ''}`}
        >
          <Mic className="h-4 w-4" />
        </Button>

        {/* Send Button */}
        <Button 
          onClick={handleSend} 
          disabled={(!message.trim() && !selectedFile) || uploading || recording}
          size="sm"
          className="px-4"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Recording Status */}
      {recording && (
        <div className="flex items-center justify-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg">
          <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-sm text-red-700 font-medium">Recording voice message...</span>
        </div>
      )}
    </div>
  );
};

export default ChatInput;