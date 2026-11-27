import type { Namespace } from 'socket.io';
import type {
  ChatClientEvents,
  ChatServerEvents,
  ConversationDTO,
  MessageDTO,
  PresenceClientEvents,
  PresenceServerEvents,
  PresenceUpdate,
  ReceiptUpdate,
  SocketData,
  TypingUpdate,
} from '@voidlink/shared';

type ChatServer = Namespace<
  ChatClientEvents,
  ChatServerEvents,
  Record<string, never>,
  SocketData
>;
type PresenceServer = Namespace<
  PresenceClientEvents,
  PresenceServerEvents,
  Record<string, never>,
  SocketData
>;

let chatServer: ChatServer | null = null;
let presenceServer: PresenceServer | null = null;

export function registerRealtime(chat: ChatServer, presence: PresenceServer) {
  chatServer = chat;
  presenceServer = presence;
}

export const rooms = {
  conversation: (conversationId: string) => `conv:${conversationId}`,
  user: (userId: string) => `user:${userId}`,
};

/** Best-effort fan-out: REST writes still succeed when no socket server is attached (tests). */
export function emitMessage(conversationId: string, message: MessageDTO) {
  chatServer?.to(rooms.conversation(conversationId)).emit('message:new', message);
}

export function emitReceipts(update: ReceiptUpdate) {
  chatServer?.to(rooms.conversation(update.conversationId)).emit('receipt:update', update);
}

export function emitTyping(update: TypingUpdate, exceptSocketId?: string) {
  if (!chatServer) return;
  const target = chatServer.to(rooms.conversation(update.conversationId));
  if (exceptSocketId) target.except(exceptSocketId).emit('typing', update);
  else target.emit('typing', update);
}

export function emitConversationToUser(userId: string, conversation: ConversationDTO) {
  chatServer?.to(rooms.user(userId)).emit('conversation:new', conversation);
}

export function emitPresence(userIds: string[], update: PresenceUpdate) {
  if (!presenceServer) return;
  for (const userId of userIds) {
    presenceServer.to(rooms.user(userId)).emit('presence:update', update);
  }
}

export function emitPresenceSnapshot(userId: string, entries: PresenceUpdate[]) {
  presenceServer?.to(rooms.user(userId)).emit('presence:snapshot', entries);
}
