import type { Attachment, Prisma } from '@prisma/client';
import type {
  AttachmentDTO,
  AttachmentKind,
  ConversationDTO,
  MessageDTO,
  Presence,
  ReceiptState,
  UserSummaryDTO,
} from '@voidlink/shared';
import { mediaUrl } from '../lib/media-signing';

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
  attachments: true,
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

export function toAttachmentDTO(row: Attachment): AttachmentDTO {
  const purged = Boolean(row.purgedAt);
  return {
    id: row.id,
    kind: row.kind as AttachmentKind,
    mimeType: row.mimeType,
    sizeBytes: Number(row.sizeBytes),
    width: row.width,
    height: row.height,
    durationMs: row.durationMs,
    blurhash: row.blurhash,
    waveform: Array.isArray(row.waveform) ? (row.waveform as number[]) : null,
    // View-once media is never exposed here; it is issued only by the burn endpoint.
    url: row.viewOnce || purged ? null : mediaUrl(row.id, 'full'),
    thumbnailUrl:
      !row.viewOnce && !purged && row.thumbnailKey ? mediaUrl(row.id, 'thumb') : null,
    viewOnce: row.viewOnce,
    openedAt: row.openedAt ? row.openedAt.toISOString() : null,
  };
}

export function toMessage(row: MessageRow, viewerId: string): MessageDTO {
  const mine = row.senderId === viewerId;
  const deleted = row.deletedForEveryone;
  return {
    id: row.id,
    clientId: row.clientId,
    conversationId: row.conversationId,
    seq: row.seq.toString(),
    type: row.type,
    // A tombstone must not keep leaking text or media metadata.
    body: deleted ? null : row.body,
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
    attachments: deleted ? [] : row.attachments.map(toAttachmentDTO),
    viewOnce: row.viewOnce,
    viewedAt: row.viewedAt ? row.viewedAt.toISOString() : null,
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
