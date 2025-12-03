/**
 * Chat Components - Unified exports
 * WhatsApp-style unified communication experience
 */

// Main ChatApp (WhatsApp-style unified hub)
export { ChatApp } from './ChatApp';

// Core conversation components
export { UnifiedConversation } from './UnifiedConversation';
export { ConversationHeader } from './ConversationHeader';
export { MessageInput } from './MessageInput';
export { ChatRoom } from './ChatRoom';

// Call components
export { ActiveCallBar } from './ActiveCallBar';
export { CallEventBubble, createCallEventMessage } from './CallEventBubble';

// Status indicators
export { OnlineIndicator } from './OnlineIndicator';

// List views
export { ChatListView } from './ChatListView';

// Legacy components (maintained for backwards compatibility)
export { default as ChatMessage } from './ChatMessage';
export { CircleMembersList } from './CircleMembersList';
