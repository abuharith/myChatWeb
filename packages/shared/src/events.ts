import type { SendMessageInput } from './schemas';

export type Presence = 'ONLINE' | 'AWAY' | 'DND' | 'OFFLINE';
export type ReceiptState = 'SENT' | 'DELIVERED' | 'READ';
export type MessageType =
  | 'TEXT'
  | 'IMAGE'
  | 'VIDEO'
  | 'AUDIO'
  | 'VOICE'
  | 'FILE'
  | 'SYSTEM'
  | 'CALL'
  | 'STORY_REPLY';

export interface UserSummaryDTO {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  presence: Presence;
  lastSeenAt: string | null;
}

export interface AuthUserDTO {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
}

export interface AuthResponse {
  user: AuthUserDTO;
  accessToken: string;
}

export interface ReceiptDTO {
  userId: string;
  state: ReceiptState;
}

export type AttachmentKind = 'IMAGE' | 'VIDEO' | 'AUDIO' | 'VOICE' | 'FILE';

export interface AttachmentDTO {
  id: string;
  kind: AttachmentKind;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  durationMs: number | null;
  blurhash: string | null;
  waveform: number[] | null;
  /** Signed, time-limited media URL. Null for view-once media until it is opened. */
  url: string | null;
  thumbnailUrl: string | null;
  viewOnce: boolean;
  openedAt: string | null;
}

export interface PresignedUploadDTO {
  uploadId: string;
  key: string;
  url: string;
  expiresIn: number;
  headers: Record<string, string>;
}

export interface CompletedUploadDTO {
  uploadId: string;
  attachment: AttachmentDTO;
}

export interface OpenViewOnceDTO {
  url: string;
  expiresAt: string;
}

export interface MessageDTO {
  id: string;
  clientId: string;
  conversationId: string;
  seq: string;
  type: MessageType;
  body: string | null;
  encrypted: boolean;
  sender: UserSummaryDTO | null;
  replyToId: string | null;
  createdAt: string;
  editedAt: string | null;
  deletedForEveryone: boolean;
  receipts: ReceiptDTO[];
  attachments: AttachmentDTO[];
  viewOnce: boolean;
  viewedAt: string | null;
  /** Convenience aggregate for own messages: the weakest recipient state. */
  status: 'SENT' | 'DELIVERED' | 'READ' | null;
}

export interface ConversationDTO {
  id: string;
  type: 'DIRECT' | 'GROUP';
  title: string | null;
  avatarUrl: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  participants: UserSummaryDTO[];
  /** The other participant in a DIRECT conversation. */
  peer: UserSummaryDTO | null;
  lastMessage: {
    body: string | null;
    type: MessageType;
    senderId: string | null;
    createdAt: string;
  } | null;
}

export interface ReceiptUpdate {
  conversationId: string;
  userId: string;
  messageIds: string[];
  state: ReceiptState;
}

export interface TypingUpdate {
  conversationId: string;
  userId: string;
  displayName: string;
  until: number;
}

export interface PresenceUpdate {
  userId: string;
  presence: Presence;
  lastSeenAt: string | null;
}

export interface MessagePage {
  messages: MessageDTO[];
  hasMore: boolean;
}

export interface SendAck {
  ok: boolean;
  message?: MessageDTO;
  error?: string;
}

/** /chat namespace */
export interface ChatServerEvents {
  'message:new': (message: MessageDTO) => void;
  'receipt:update': (update: ReceiptUpdate) => void;
  typing: (update: TypingUpdate) => void;
  'conversation:new': (conversation: ConversationDTO) => void;
}

export interface ChatClientEvents {
  'message:send': (input: SendMessageInput, ack: (result: SendAck) => void) => void;
  'message:delivered': (input: { conversationId: string; messageIds: string[] }) => void;
  'message:read': (input: { conversationId: string; messageIds?: string[] }) => void;
  'typing:start': (input: { conversationId: string }) => void;
  'typing:stop': (input: { conversationId: string }) => void;
  'conversation:join': (input: { conversationId: string }) => void;
}

/** /presence namespace */
export interface PresenceServerEvents {
  'presence:snapshot': (entries: PresenceUpdate[]) => void;
  'presence:update': (update: PresenceUpdate) => void;
}

export interface PresenceClientEvents {
  'presence:set': (input: { status: 'ONLINE' | 'AWAY' | 'DND' }) => void;
}

/** Inter-server socket data attached after handshake authentication. */
export interface SocketData {
  userId: string;
  username: string;
  displayName: string;
}
