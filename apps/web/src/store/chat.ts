import { create } from 'zustand';
import type {
  ConversationDTO,
  MessageDTO,
  MessagePage,
  PresenceUpdate,
  ReceiptState,
  ReceiptUpdate,
  SendAck,
  SendMessageInput,
  TypingUpdate,
} from '@voidlink/shared';
import { api } from '../lib/api';
import { connectRealtime, disconnectRealtime, getChatSocket } from '../lib/socket';
import { nextUnread, replayUnread, type UnreadEvent } from '../lib/unread';

interface QueueItem {
  conversationId: string;
  clientId: string;
  body: string;
  queuedAt: number;
}

interface ChatState {
  userId: string | null;
  conversations: ConversationDTO[];
  messages: Record<string, MessageDTO[]>;
  hasMore: Record<string, boolean>;
  loaded: Record<string, boolean>;
  activeId: string | null;
  presence: Record<string, PresenceUpdate>;
  typing: Record<string, TypingUpdate[]>;
  online: boolean;
  loadingConversations: boolean;
  loadingMessages: boolean;
  error: string | null;
  sendErrors: Record<string, string>;
  queue: QueueItem[];

  startSession: (userId: string, token: string) => void;
  reset: () => void;
  loadConversations: () => Promise<void>;
  select: (conversationId: string) => void;
  closeActive: () => void;
  loadMessages: (conversationId: string, before?: string) => Promise<void>;
  send: (body: string) => Promise<void>;
  retry: (clientId: string) => void;
  markRead: (conversationId: string) => void;
  receive: (message: MessageDTO) => void;
  applyReceipt: (update: ReceiptUpdate) => void;
  applyTyping: (update: TypingUpdate) => void;
  applyPresence: (update: PresenceUpdate) => void;
  addConversation: (conversation: ConversationDTO) => void;
  clearError: () => void;
}

const typingTimers = new Map<string, ReturnType<typeof setTimeout>>();
const MAX_SEEN_MESSAGES = 5000;

/** Message ids already accounted for, so a replayed socket event cannot double-count. */
const seenMessageIds = new Set<string>();
const seenMessageOrder: string[] = [];

/** Local unread transitions kept only until the next server reconciliation. */
let unreadEpoch = 0;
let unreadLog: UnreadEvent[] = [];

let visibilityHandler: (() => void) | null = null;

const queueKey = (userId: string) => `voidlink:queue:${userId}`;

function rememberMessage(id: string): void {
  if (seenMessageIds.has(id)) return;
  seenMessageIds.add(id);
  seenMessageOrder.push(id);
  if (seenMessageOrder.length > MAX_SEEN_MESSAGES) {
    const oldest = seenMessageOrder.shift();
    if (oldest) seenMessageIds.delete(oldest);
  }
}

function logUnread(conversationId: string, kind: UnreadEvent['kind']): void {
  unreadEpoch += 1;
  unreadLog.push({ conversationId, epoch: unreadEpoch, kind });
}

function resetUnreadTracking(): void {
  unreadEpoch = 0;
  unreadLog = [];
  seenMessageIds.clear();
  seenMessageOrder.length = 0;
}

function detachVisibilityHandler(): void {
  if (!visibilityHandler) return;
  document.removeEventListener('visibilitychange', visibilityHandler);
  visibilityHandler = null;
}

function loadQueue(userId: string): QueueItem[] {
  try {
    const raw = localStorage.getItem(queueKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QueueItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistQueue(userId: string | null, queue: QueueItem[]): void {
  if (!userId) return;
  try {
    if (queue.length === 0) localStorage.removeItem(queueKey(userId));
    else localStorage.setItem(queueKey(userId), JSON.stringify(queue));
  } catch {
    // storage may be unavailable (private mode); the in-memory queue still works
  }
}

function sortMessages(messages: MessageDTO[]): MessageDTO[] {
  return [...messages].sort((a, b) => {
    const delta = Date.parse(a.createdAt) - Date.parse(b.createdAt);
    return delta !== 0 ? delta : a.id.localeCompare(b.id);
  });
}

function upsert(list: MessageDTO[] | undefined, message: MessageDTO): MessageDTO[] {
  const current = list ?? [];
  return sortMessages([
    ...current.filter((item) => item.id !== message.id && item.clientId !== message.clientId),
    message,
  ]);
}

function statusFromReceipts(receipts: MessageDTO['receipts']): MessageDTO['status'] {
  if (receipts.length === 0) return 'SENT';
  if (receipts.every((receipt) => receipt.state === 'READ')) return 'READ';
  if (receipts.every((receipt) => receipt.state !== 'SENT')) return 'DELIVERED';
  return 'SENT';
}

function sortConversations(conversations: ConversationDTO[]): ConversationDTO[] {
  return [...conversations].sort((a, b) => {
    const aTime = a.lastMessageAt ? Date.parse(a.lastMessageAt) : 0;
    const bTime = b.lastMessageAt ? Date.parse(b.lastMessageAt) : 0;
    return bTime - aTime;
  });
}

export const useChatStore = create<ChatState>((set, get) => ({
  userId: null,
  conversations: [],
  messages: {},
  hasMore: {},
  loaded: {},
  activeId: null,
  presence: {},
  typing: {},
  online: false,
  loadingConversations: false,
  loadingMessages: false,
  error: null,
  sendErrors: {},
  queue: [],

  startSession: (userId, token) => {
    disconnectRealtime();
    detachVisibilityHandler();
    resetUnreadTracking();
    const queue = loadQueue(userId);
    set({
      userId,
      queue,
      conversations: [],
      messages: {},
      hasMore: {},
      loaded: {},
      activeId: null,
      presence: {},
      typing: {},
      sendErrors: {},
      error: null,
    });

    connectRealtime(token, {
      onMessage: (message) => get().receive(message),
      onReceipt: (update) => get().applyReceipt(update),
      onTyping: (update) => get().applyTyping(update),
      onConversation: (conversation) => get().addConversation(conversation),
      onPresence: (update) => get().applyPresence(update),
      onPresenceSnapshot: (entries) => {
        set((state) => {
          const presence = { ...state.presence };
          for (const entry of entries) presence[entry.userId] = entry;
          return { presence };
        });
      },
      onConnectionChange: (online) => {
        if (get().online === online) return;
        set({ online });
        if (online) {
          void get().loadConversations();
          void flushQueue(set, get);
          const activeId = get().activeId;
          if (activeId) get().markRead(activeId);
        }
      },
    });

    // Returning to a hidden tab while a conversation is open counts as reading it.
    visibilityHandler = () => {
      if (document.visibilityState !== 'visible') return;
      const activeId = get().activeId;
      if (activeId) get().markRead(activeId);
    };
    document.addEventListener('visibilitychange', visibilityHandler);

    void get().loadConversations();
  },

  reset: () => {
    disconnectRealtime();
    detachVisibilityHandler();
    resetUnreadTracking();
    for (const timer of typingTimers.values()) clearTimeout(timer);
    typingTimers.clear();
    set({
      userId: null,
      conversations: [],
      messages: {},
      loaded: {},
      activeId: null,
      presence: {},
      typing: {},
      online: false,
      queue: [],
      sendErrors: {},
    });
  },

  loadConversations: async () => {
    if (!get().userId) return;
    set({ loadingConversations: true });
    const requestEpoch = unreadEpoch;
    try {
      const data = await api.get<{ conversations: ConversationDTO[] }>('/v1/conversations');

      // The server owns the totals for everything that happened before this
      // request; replay anything that landed while it was in flight.
      const serverCounts = Object.fromEntries(
        data.conversations.map((conversation) => [conversation.id, conversation.unreadCount]),
      );
      const counts = replayUnread(serverCounts, unreadLog, requestEpoch);
      unreadLog = unreadLog.filter((event) => event.epoch > requestEpoch);

      set({
        conversations: sortConversations(
          data.conversations.map((conversation) => ({
            ...conversation,
            unreadCount: counts[conversation.id] ?? conversation.unreadCount,
          })),
        ),
        loadingConversations: false,
      });
    } catch {
      set({ loadingConversations: false, error: 'Could not load your conversations' });
    }
  },

  closeActive: () => set({ activeId: null }),

  select: (conversationId) => {
    getChatSocket()?.emit('conversation:join', { conversationId });
    set({ activeId: conversationId });
    if (!get().loaded[conversationId]) void get().loadMessages(conversationId);
    else get().markRead(conversationId);
  },

  loadMessages: async (conversationId, before) => {
    set({ loadingMessages: true });
    try {
      const query = before ? `?before=${encodeURIComponent(before)}` : '';
      const page = await api.get<MessagePage>(
        `/v1/conversations/${conversationId}/messages${query}`,
      );
      set((state) => ({
        messages: {
          ...state.messages,
          [conversationId]: before
            ? sortMessages([...page.messages, ...(state.messages[conversationId] ?? [])])
            : page.messages,
        },
        hasMore: { ...state.hasMore, [conversationId]: page.hasMore },
        loaded: { ...state.loaded, [conversationId]: true },
        loadingMessages: false,
      }));
      if (!before) get().markRead(conversationId);
    } catch {
      set({ loadingMessages: false, error: 'Could not load messages' });
    }
  },

  send: async (body) => {
    const { activeId, userId } = get();
    const trimmed = body.trim();
    if (!activeId || !trimmed || !userId) return;

    const clientId = crypto.randomUUID();
    const optimistic: MessageDTO = {
      id: `temp-${clientId}`,
      clientId,
      conversationId: activeId,
      seq: '0',
      type: 'TEXT',
      body: trimmed,
      encrypted: false,
      sender: {
        id: userId,
        username: '',
        displayName: '',
        avatarUrl: null,
        presence: 'ONLINE',
        lastSeenAt: null,
      },
      replyToId: null,
      createdAt: new Date().toISOString(),
      editedAt: null,
      deletedForEveryone: false,
      receipts: [],
      status: 'SENT',
    };

    set((state) => ({
      messages: {
        ...state.messages,
        [activeId]: upsert(state.messages[activeId], optimistic),
      },
      sendErrors: Object.fromEntries(
        Object.entries(state.sendErrors).filter(([key]) => key !== clientId),
      ),
    }));

    const input: SendMessageInput = {
      conversationId: activeId,
      clientId,
      type: 'TEXT',
      body: trimmed,
      encrypted: false,
    };

    const socket = getChatSocket();
    if (!socket?.connected) {
      set((state) => {
        const nextQueue = [...state.queue, { conversationId: activeId, clientId, body: trimmed, queuedAt: Date.now() }];
        persistQueue(userId, nextQueue);
        return { queue: nextQueue };
      });
      return;
    }

    socket.emit('message:send', input, (ack: SendAck) => settleAck(set, clientId, ack));
  },

  retry: (clientId) => {
    const { queue, userId, messages } = get();
    const item = queue.find((entry) => entry.clientId === clientId);
    if (!item) return;
    const optimistic = Object.values(messages)
      .flat()
      .find((message) => message.clientId === clientId);
    if (!optimistic) return;

    set((state) => {
      const nextQueue = state.queue.filter((entry) => entry.clientId !== clientId);
      persistQueue(userId, nextQueue);
      return { queue: nextQueue };
    });

    const socket = getChatSocket();
    if (!socket?.connected) return;
    socket.emit(
      'message:send',
      {
        conversationId: item.conversationId,
        clientId,
        type: 'TEXT',
        body: item.body,
        encrypted: false,
      },
      (ack: SendAck) => settleAck(set, clientId, ack),
    );
  },

  markRead: (conversationId) => {
    // Logged even when the local badge is already zero: a list request that
    // started earlier may still return a stale non-zero count.
    logUnread(conversationId, 'read');
    set((state) => ({
      conversations: state.conversations.map((conversation) =>
        conversation.id === conversationId ? { ...conversation, unreadCount: 0 } : conversation,
      ),
    }));
    getChatSocket()?.emit('message:read', { conversationId });
  },

  receive: (message) => {
    const state = get();
    const conversationId = message.conversationId;
    const isOwn = Boolean(state.userId && message.sender?.id === state.userId);
    const alreadySeen =
      seenMessageIds.has(message.id) ||
      (state.messages[conversationId] ?? []).some(
        (existing) => existing.id === message.id && !existing.id.startsWith('temp-'),
      );
    rememberMessage(message.id);

    const isReading =
      !isOwn &&
      state.activeId === conversationId &&
      document.visibilityState === 'visible';

    const current =
      state.conversations.find((conversation) => conversation.id === conversationId)
        ?.unreadCount ?? 0;
    const nextCount = nextUnread({ current, isOwn, isReading, alreadySeen });

    if (!isOwn && !isReading && !alreadySeen) logUnread(conversationId, 'increment');

    // One atomic update: messages, preview/order and the badge always agree.
    set((currentState) => ({
      messages: {
        ...currentState.messages,
        [conversationId]: upsert(currentState.messages[conversationId], message),
      },
      conversations: sortConversations(
        currentState.conversations.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                lastMessageAt: message.createdAt,
                lastMessage: {
                  body: message.body,
                  type: message.type,
                  senderId: message.sender?.id ?? null,
                  createdAt: message.createdAt,
                },
                unreadCount: nextCount,
              }
            : conversation,
        ),
      ),
    }));

    if (isOwn) return;

    if (isReading) {
      get().markRead(conversationId);
      return;
    }

    getChatSocket()?.emit('message:delivered', {
      conversationId,
      messageIds: [message.id],
    });
  },

  applyReceipt: (update) => {
    set((state) => {
      const list = state.messages[update.conversationId] ?? [];
      const ids = new Set(update.messageIds);
      const messages = list.map((message) => {
        if (!ids.has(message.id)) return message;
        const receipts = message.receipts.some((receipt) => receipt.userId === update.userId)
          ? message.receipts.map((receipt) =>
              receipt.userId === update.userId
                ? { ...receipt, state: update.state as ReceiptState }
                : receipt,
            )
          : [...message.receipts, { userId: update.userId, state: update.state as ReceiptState }];
        return {
          ...message,
          receipts,
          status:
            message.sender?.id === state.userId ? statusFromReceipts(receipts) : message.status,
        };
      });
      return { messages: { ...state.messages, [update.conversationId]: messages } };
    });
  },

  applyTyping: (update) => {
    if (update.userId === get().userId) return;
    const key = `${update.conversationId}:${update.userId}`;
    const existing = typingTimers.get(key);
    if (existing) clearTimeout(existing);

    set((state) => {
      const list = state.typing[update.conversationId] ?? [];
      const next = [...list.filter((entry) => entry.userId !== update.userId), update];
      return { typing: { ...state.typing, [update.conversationId]: next } };
    });

    const timeout = setTimeout(() => {
      set((state) => ({
        typing: {
          ...state.typing,
          [update.conversationId]: (state.typing[update.conversationId] ?? []).filter(
            (entry) => entry.userId !== update.userId,
          ),
        },
      }));
      typingTimers.delete(key);
    }, Math.max(1200, update.until - Date.now() + 300));
    typingTimers.set(key, timeout);
  },

  applyPresence: (update) => {
    set((state) => ({ presence: { ...state.presence, [update.userId]: update } }));
  },

  addConversation: (conversation) => {
    getChatSocket()?.emit('conversation:join', { conversationId: conversation.id });
    set((state) => {
      if (state.conversations.some((item) => item.id === conversation.id)) {
        return {
          conversations: sortConversations(
            state.conversations.map((item) =>
              item.id === conversation.id ? conversation : item,
            ),
          ),
        };
      }
      return { conversations: sortConversations([conversation, ...state.conversations]) };
    });
  },

  clearError: () => set({ error: null }),
}));

type Setter = (partial: Partial<ChatState> | ((state: ChatState) => Partial<ChatState>)) => void;
type Getter = () => ChatState;

function settleAck(set: Setter, clientId: string, ack: SendAck): void {
  if (!ack.ok || !ack.message) {
    set((state) => ({
      sendErrors: {
        ...state.sendErrors,
        [clientId]: ack.error ?? 'Message not delivered',
      },
    }));
    return;
  }

  const message = ack.message;
  set((state) => {
    const queue = state.queue.filter((entry) => entry.clientId !== clientId);
    persistQueue(state.userId, queue);
    return {
      messages: {
        ...state.messages,
        [message.conversationId]: upsert(state.messages[message.conversationId], message),
      },
      conversations: sortConversations(
        state.conversations.map((conversation) =>
          conversation.id === message.conversationId
            ? {
                ...conversation,
                lastMessageAt: message.createdAt,
                lastMessage: {
                  body: message.body,
                  type: message.type,
                  senderId: message.sender?.id ?? null,
                  createdAt: message.createdAt,
                },
              }
            : conversation,
        ),
      ),
      queue,
    };
  });
}

async function flushQueue(set: Setter, get: Getter): Promise<void> {
  const { queue, userId } = get();
  if (queue.length === 0) return;
  const socket = getChatSocket();
  if (!socket?.connected) return;

  for (const item of queue) {
    socket.emit(
      'message:send',
      {
        conversationId: item.conversationId,
        clientId: item.clientId,
        type: 'TEXT',
        body: item.body,
        encrypted: false,
      },
      (ack: SendAck) => settleAck(set, item.clientId, ack),
    );
  }

  set({ queue: [] });
  persistQueue(userId, []);
}
