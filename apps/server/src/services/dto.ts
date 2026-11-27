import type { Prisma } from '@prisma/client';
import type {
  ConversationDTO,
  MessageDTO,
  Presence,
  ReceiptState,
  UserSummaryDTO,
} from '@voidlink/shared';

export const userSummarySelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  presence: true,
  lastSeenAt: true,
} satisfies Prisma.UserSelect;

export type UserSummaryRow = Prisma.UserGetPayload<{ select: typeof userSummarySelect }>;

export const messageInclude = {
  sender: { select: userSummarySelect },
  receipts: { select: { userId: true, state: true } },
} satisfies Prisma.MessageInclude;

export type MessageRow = Prisma.MessageGetPayload<{ include: typeof messageInclude }>;

export const conversationInclude = {
  participants: {
    where: { leftAt: null },
    include: { user: { select: userSummarySelect } },
    orderBy: { joinedAt: 'asc' as const },
  },
} satisfies Prisma.ConversationInclude;

export type ConversationRow = Prisma.ConversationGetPayload<{
  include: typeof conversationInclude;
}>;

export function toUserSummary(row: UserSummaryRow): UserSummaryDTO {
  return {
    id: row.id,
    username: row.username,
    displayName: row.displayName,
    avatarUrl: row.avatarUrl,
    presence: row.presence as Presence,
    lastSeenAt: row.lastSeenAt ? row.lastSeenAt.toISOString() : null,
  };
}

function aggregateStatus(
  receipts: Array<{ userId: string; state: ReceiptState }>,
  viewerId: string,
): 'SENT' | 'DELIVERED' | 'READ' | null {
  const others = receipts.filter((receipt) => receipt.userId !== viewerId);
  if (others.length === 0) return 'SENT';
  if (others.every((receipt) => receipt.state === 'READ')) return 'READ';
  if (others.every((receipt) => receipt.state === 'READ' || receipt.state === 'DELIVERED')) {
    return 'DELIVERED';
  }
  return 'SENT';
}

export function toMessage(row: MessageRow, viewerId: string): MessageDTO {
  const mine = row.senderId === viewerId;
  return {
    id: row.id,
    clientId: row.clientId,
    conversationId: row.conversationId,
    seq: row.seq.toString(),
    type: row.type,
    body: row.body,
    encrypted: row.encrypted,
    sender: row.sender ? toUserSummary(row.sender) : null,
    replyToId: row.replyToId,
    createdAt: row.createdAt.toISOString(),
    editedAt: row.editedAt ? row.editedAt.toISOString() : null,
    deletedForEveryone: row.deletedForEveryone,
    receipts: row.receipts.map((receipt) => ({
      userId: receipt.userId,
      state: receipt.state,
    })),
    status: mine ? aggregateStatus(row.receipts, viewerId) : null,
  };
}

export function toConversation(
  row: ConversationRow,
  viewerId: string,
  unreadCount: number,
  lastMessage: {
    body: string | null;
    type: MessageDTO['type'];
    senderId: string | null;
    createdAt: Date;
  } | null,
): ConversationDTO {
  const participants = row.participants.map((participant) => toUserSummary(participant.user));
  const peer =
    row.type === 'DIRECT'
      ? (participants.find((participant) => participant.id !== viewerId) ?? null)
      : null;

  return {
    id: row.id,
    type: row.type,
    title: row.title,
    avatarUrl: row.avatarUrl,
    lastMessageAt: row.lastMessageAt ? row.lastMessageAt.toISOString() : null,
    unreadCount,
    participants,
    peer,
    lastMessage: lastMessage
      ? {
          body: lastMessage.body,
          type: lastMessage.type,
          senderId: lastMessage.senderId,
          createdAt: lastMessage.createdAt.toISOString(),
        }
      : null,
  };
}
