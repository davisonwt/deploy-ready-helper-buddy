/**
 * MessageInput - WhatsApp-style message input with voice recording
 * Supports text, voice memos, file attachments, and emoji
 */
import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Mic, 
  Paperclip, 
  Camera, 
  Image as ImageIcon,
  FileText,
  X,
  StopCircle,
  Smile
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  onSendVoice?: (blob: Blob, duration: number) => void;
  onSendFile?: (file: File) => void;
  onTyping?: () => void;
  replyingTo?: { id: string; content: string; senderName: string } | null;
  onCancelReply?: () => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onSendVoice,
  onSendFile,
  onTyping,
  replyingTo,
  onCancelReply,
  disabled = false,
  placeholder = "Type a message...",
  className,
}) => {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const handleSend = useCallback(() => {
    if (!message.trim() || disabled) return;
    onSendMessage(message.trim());
    setMessage('');
  }, [message, disabled, onSendMessage]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        onSendVoice?.(audioBlob, recordingDuration);
        stream.getTracks().forEach(track => track.stop());
        setRecordingDuration(0);
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      setRecordingDuration(0);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach(file => onSendFile?.(file));
    }
    e.target.value = '';
  };

  return (
    <div className={cn("border-t bg-card", className)}>
      {/* Reply Preview */}
      <AnimatePresence>
        {replyingTo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 pt-3 overflow-hidden"
          >
            <div className="flex items-center justify-between bg-muted/50 rounded-lg p-2 border-l-4 border-primary">
              <div className="min-w-0">
                <p className="text-xs font-medium text-primary">{replyingTo.senderName}</p>
                <p className="text-xs text-muted-foreground truncate">{replyingTo.content}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onCancelReply}
                className="h-6 w-6 shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <div className="p-3">
        <AnimatePresence mode="wait">
          {isRecording ? (
            <motion.div
              key="recording"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex items-center gap-3 bg-red-500/10 rounded-full px-4 py-2"
            >
              {/* Recording indicator */}
              <motion.div
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="h-3 w-3 bg-red-500 rounded-full"
              />
              
              {/* Waveform visualization */}
              <div className="flex items-center gap-0.5 flex-1">
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-1 bg-red-500 rounded-full"
                    animate={{
                      height: [8, Math.random() * 24 + 8, 8],
                    }}
                    transition={{
                      duration: 0.5,
                      repeat: Infinity,
                      delay: i * 0.05,
                    }}
                  />
                ))}
              </div>

              <span className="text-sm font-medium text-red-500 min-w-[50px]">
                {formatDuration(recordingDuration)}
              </span>

              {/* Cancel */}
              <Button
                variant="ghost"
                size="icon"
                onClick={cancelRecording}
                className="h-10 w-10 rounded-full hover:bg-red-500/20"
              >
                <X className="h-5 w-5 text-red-500" />
              </Button>

              {/* Send */}
              <Button
                size="icon"
                onClick={stopRecording}
                className="h-10 w-10 rounded-full bg-red-500 hover:bg-red-600"
              >
                <Send className="h-5 w-5" />
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="input"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex items-center gap-2"
            >
              {/* Attachment Button */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-full shrink-0"
                    disabled={disabled}
                  >
                    <Paperclip className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                    <ImageIcon className="h-4 w-4 mr-2 text-purple-500" />
                    Photo & Video
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                    <FileText className="h-4 w-4 mr-2 text-blue-500" />
                    Document
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                    <Camera className="h-4 w-4 mr-2 text-pink-500" />
                    Camera
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                multiple
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
                onChange={handleFileSelect}
              />

              {/* Text Input */}
              <div className="flex-1 relative">
                <Input
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    onTyping?.();
                  }}
                  onKeyPress={handleKeyPress}
                  placeholder={replyingTo ? "Type your reply..." : placeholder}
                  disabled={disabled}
                  className="pr-10 rounded-full bg-muted/50 border-0 focus-visible:ring-1"
                />
                {/* Emoji Picker */}
                {showEmojiPicker && (
                  <div ref={emojiPickerRef} className="absolute bottom-12 right-0 z-50 bg-card border rounded-lg shadow-lg p-2 w-64 max-h-48 overflow-y-auto">
                    <div className="grid grid-cols-8 gap-1">
                      {['😀','😂','🥹','😍','🤩','😎','🥳','😇','🙏','❤️','🔥','👏','💯','✨','🎉','👍','👋','💪','😢','😤','🤔','😏','🫶','💀','👀','🙌','💕','😊','🤗','😌','🥰','😘','💖','⭐','🌟','💫','🎶','🫡','✅','❌'].map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          className="text-xl hover:bg-muted rounded p-1 cursor-pointer"
                          onClick={() => {
                            setMessage(prev => prev + emoji);
                            setShowEmojiPicker(false);
                          }}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full"
                  disabled={disabled}
                  onClick={() => setShowEmojiPicker(prev => !prev)}
                >
                  <Smile className="h-5 w-5 text-muted-foreground" />
                </Button>
              </div>

              {/* Send or Voice Button */}
              <AnimatePresence mode="wait">
                {message.trim() ? (
                  <motion.div
                    key="send"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                  >
                    <Button
                      size="icon"
                      onClick={handleSend}
                      disabled={disabled}
                      className="h-10 w-10 rounded-full bg-primary hover:bg-primary/90"
                    >
                      <Send className="h-5 w-5" />
                    </Button>
                  </motion.div>
                ) : onSendVoice ? (
                  <motion.div
                    key="mic"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={startRecording}
                      disabled={disabled}
                      className="h-10 w-10 rounded-full hover:bg-primary/10"
                    >
                      <Mic className="h-5 w-5" />
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="send-disabled"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                  >
                    <Button
                      size="icon"
                      disabled
                      className="h-10 w-10 rounded-full"
                    >
                      <Send className="h-5 w-5" />
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
