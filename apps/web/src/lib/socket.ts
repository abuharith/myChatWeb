import { io, type Socket } from 'socket.io-client';
import { refreshSession } from './api';
import type {
  ChatClientEvents,
  ChatServerEvents,
  ConversationDTO,
  MessageDTO,
  MessageDeletedUpdate,
  PresenceClientEvents,
  PresenceServerEvents,
  PresenceUpdate,
  ReceiptUpdate,
  TypingUpdate,
} from '@voidlink/shared';

export type ChatSocket = Socket<ChatServerEvents, ChatClientEvents>;
export type PresenceSocket = Socket<PresenceServerEvents, PresenceClientEvents>;

export interface RealtimeHandlers {
  onMessage: (message: MessageDTO) => void;
  onMessageDeleted: (update: MessageDeletedUpdate) => void;
  onReceipt: (update: ReceiptUpdate) => void;
  onTyping: (update: TypingUpdate) => void;
  onConversation: (conversation: ConversationDTO) => void;
  onPresence: (update: PresenceUpdate) => void;
  onPresenceSnapshot: (entries: PresenceUpdate[]) => void;
  onConnectionChange: (online: boolean) => void;
}

let chatSocket: ChatSocket | null = null;
let presenceSocket: PresenceSocket | null = null;
let recovering = false;

export function getChatSocket(): ChatSocket | null {
  return chatSocket;
}

export function connectRealtime(token: string, handlers: RealtimeHandlers): void {
  disconnectRealtime();

  const options = {
    auth: { token },
    reconnectionDelay: 600,
    reconnectionDelayMax: 5000,
  };

  chatSocket = io('/chat', options);
  presenceSocket = io('/presence', options);

  /** Access tokens live 15 minutes; a stale one must be rotated before reconnecting. */
  const recoverToken = async () => {
    if (recovering) return;
    recovering = true;
    try {
      const session = await refreshSession();
      if (!session) return;
      for (const socket of [chatSocket, presenceSocket]) {
        if (!socket) continue;
        socket.auth = { token: session.accessToken };
        socket.connect();
      }
    } finally {
      recovering = false;
    }
  };

  const onConnectError = (error: Error) => {
    handlers.onConnectionChange(false);
    if (error.message === 'unauthorized') void recoverToken();
  };

  chatSocket.on('connect', () => handlers.onConnectionChange(true));
  chatSocket.on('disconnect', () => handlers.onConnectionChange(false));
  chatSocket.on('connect_error', onConnectError);
  presenceSocket.on('connect_error', onConnectError);
  chatSocket.on('message:new', handlers.onMessage);
  chatSocket.on('message:deleted', handlers.onMessageDeleted);
  chatSocket.on('receipt:update', handlers.onReceipt);
  chatSocket.on('typing', handlers.onTyping);
  chatSocket.on('conversation:new', handlers.onConversation);

  presenceSocket.on('presence:update', handlers.onPresence);
  presenceSocket.on('presence:snapshot', handlers.onPresenceSnapshot);
  presenceSocket.on('connect', () => handlers.onConnectionChange(true));
}

export function disconnectRealtime(): void {
  chatSocket?.removeAllListeners();
  presenceSocket?.removeAllListeners();
  chatSocket?.disconnect();
  presenceSocket?.disconnect();
  chatSocket = null;
  presenceSocket = null;
}

export function setPresenceStatus(status: 'ONLINE' | 'AWAY' | 'DND'): void {
  presenceSocket?.emit('presence:set', { status });
}
