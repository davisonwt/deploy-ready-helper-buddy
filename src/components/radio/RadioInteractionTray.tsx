import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Music, Users, Plus, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

type TabKey = 'chat' | 'queue' | 'people';

interface ChatMessage {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  avatar?: string | null;
}

interface QueueItem {
  id: string;
  title: string;
  artist: string;
  requestedBy?: string;
  isNowPlaying?: boolean;
}

interface Listener {
  id: string;
  name: string;
  avatar?: string | null;
  isHost?: boolean;
  isRaisedHand?: boolean;
}

interface RadioInteractionTrayProps {
  messages?: ChatMessage[];
  queue?: QueueItem[];
  listeners?: Listener[];
  onSendMessage?: (message: string) => void;
  onRequestSong?: () => void;
  onRaiseHand?: () => void;
}

const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'chat', label: 'Chat', icon: <MessageSquare className="w-4 h-4" /> },
  { key: 'queue', label: 'Queue', icon: <Music className="w-4 h-4" /> },
  { key: 'people', label: 'People', icon: <Users className="w-4 h-4" /> },
];

export const RadioInteractionTray: React.FC<RadioInteractionTrayProps> = ({
  messages = [],
  queue = [],
  listeners = [],
  onSendMessage,
  onRequestSong,
  onRaiseHand,
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('chat');
  const [chatInput, setChatInput] = useState('');

  const handleSend = () => {
    if (chatInput.trim() && onSendMessage) {
      onSendMessage(chatInput.trim());
      setChatInput('');
    }
  };

  return (
    <div
      className="rounded-2xl border border-border/20 overflow-hidden"
      style={{ backgroundColor: 'hsl(210 67% 12% / 0.8)' }}
    >
      {/* Tab bar */}
      <div className="flex border-b border-border/20">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-all',
              activeTab === tab.key
                ? 'text-primary border-b-2 border-primary bg-primary/5'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.key === 'chat' && messages.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary/20 text-primary text-[10px]">
                {messages.length}
              </span>
            )}
            {tab.key === 'people' && listeners.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px]">
                {listeners.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
          className="h-64 overflow-y-auto"
        >
          {/* Chat Tab */}
          {activeTab === 'chat' && (
            <div className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-xs text-muted-foreground">No messages yet — start the conversation!</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className="flex items-start gap-2">
                      <Avatar className="w-6 h-6 shrink-0">
                        <AvatarImage src={msg.avatar || undefined} />
                        <AvatarFallback className="text-[10px] bg-primary/20">{msg.sender.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <span className="text-[10px] font-bold text-primary">{msg.sender}</span>
                        <p className="text-xs text-foreground/90">{msg.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="p-2 border-t border-border/20 flex gap-2">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Say something..."
                  className="text-xs h-8 bg-background/30 border-border/30"
                />
                <Button size="icon" className="h-8 w-8 shrink-0" onClick={handleSend}>
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}

          {/* Queue Tab */}
          {activeTab === 'queue' && (
            <div className="p-3 space-y-2">
              {queue.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 gap-2">
                  <Music className="w-8 h-8 text-muted-foreground/50" />
                  <p className="text-xs text-muted-foreground">No tracks queued</p>
                </div>
              ) : (
                queue.map((item, i) => (
                  <div
                    key={item.id}
                    className={cn(
                      'flex items-center gap-3 p-2 rounded-xl transition-colors',
                      item.isNowPlaying ? 'bg-primary/10 border border-primary/20' : 'hover:bg-card/30'
                    )}
                  >
                    <span className="text-xs text-muted-foreground w-5 text-center">
                      {item.isNowPlaying ? '▶' : i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{item.title}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{item.artist}</p>
                    </div>
                    {item.requestedBy && (
                      <span className="text-[10px] text-muted-foreground/70 shrink-0">by {item.requestedBy}</span>
                    )}
                  </div>
                ))
              )}
              {onRequestSong && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2 gap-1.5 text-xs rounded-full border-dashed"
                  onClick={onRequestSong}
                >
                  <Plus className="w-3.5 h-3.5" /> Request a Song
                </Button>
              )}
            </div>
          )}

          {/* People Tab */}
          {activeTab === 'people' && (
            <div className="p-3 space-y-2">
              {listeners.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 gap-2">
                  <Users className="w-8 h-8 text-muted-foreground/50" />
                  <p className="text-xs text-muted-foreground">No one here yet</p>
                </div>
              ) : (
                listeners.map((listener) => (
                  <div key={listener.id} className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-card/30 transition-colors">
                    <div className="relative">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={listener.avatar || undefined} />
                        <AvatarFallback className="text-xs bg-primary/20">{listener.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      {listener.isHost && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-primary flex items-center justify-center text-[8px]">
                          🎙
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">
                        {listener.name}
                        {listener.isHost && <span className="ml-1 text-primary text-[10px]">Host</span>}
                      </p>
                    </div>
                    {listener.isRaisedHand && (
                      <span className="text-sm">✋</span>
                    )}
                  </div>
                ))
              )}
              {onRaiseHand && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2 gap-1.5 text-xs rounded-full"
                  onClick={onRaiseHand}
                >
                  ✋ Raise Hand
                </Button>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
