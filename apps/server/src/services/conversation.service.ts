import type { CreateConversationInput, ConversationDTO, MessagePage } from '@voidlink/shared';
import { badRequest, forbidden, notFound } from '../lib/errors';
import { emitConversationToUser, emitReceipts } from '../lib/realtime';
import {
  createDirect,
  createGroup,
  findByIdWithParticipants,
  findDirectBetween,
  findParticipant,
  listForUser,
  participantIds,
  preview,
  unreadCount,
} from '../repositories/conversations.repo';
import { findBlockBetween, findById as findUserById } from '../repositories/users.repo';
import {
  markDelivered as markDeliveredRepo,
  markRead as markReadRepo,
  pageMessages,
} from '../repositories/messages.repo';
import { prisma } from '../lib/prisma';
import { toConversation, toMessage } from './dto';
import { invalidateAudience } from './presence.service';

export async function list(userId: string): Promise<ConversationDTO[]> {
  const rows = await listForUser(userId);

  const conversations = await Promise.all(
    rows.map(async (row) => {
      const [unread, last] = await Promise.all([
        unreadCount(row.id, userId),
        preview(row.id, userId),
      ]);
      return toConversation(row, userId, unread, last);
    }),
  );

  return conversations.sort((a, b) => {
    const aTime = a.lastMessageAt ? Date.parse(a.lastMessageAt) : 0;
    const bTime = b.lastMessageAt ? Date.parse(b.lastMessageAt) : 0;
    return bTime - aTime;
  });
}

async function ensureParticipant(conversationId: string, userId: string) {
  const conversation = await findByIdWithParticipants(conversationId);
  if (!conversation) throw notFound('Conversation not found');
  const participant = conversation.participants.find((item) => item.userId === userId);
  if (!participant) throw forbidden('You are not part of this conversation');
  return conversation;
}

async function dtoFor(conversationId: string, viewerId: string): Promise<ConversationDTO> {
  const row = await findByIdWithParticipants(conversationId);
  if (!row) throw notFound('Conversation not found');
  const [unread, last] = await Promise.all([unreadCount(row.id, viewerId), preview(row.id, viewerId)]);
  return toConversation(row, viewerId, unread, last);
}

export async function create(
  userId: string,
  input: CreateConversationInput,
): Promise<{ conversation: ConversationDTO; created: boolean }> {
  if (input.type === 'DIRECT') {
    if (input.participantId === userId) throw badRequest('You cannot message yourself');
    const target = await findUserById(input.participantId);
    if (!target || target.deletedAt) throw notFound('That account does not exist');

    const block = await findBlockBetween(userId, input.participantId);
    if (block) throw forbidden('You cannot message this account');

    const existing = await findDirectBetween(userId, input.participantId);
    if (existing) {
      return { conversation: await dtoFor(existing.id, userId), created: false };
    }

    const created = await createDirect(userId, input.participantId);
    invalidateAudience(userId, input.participantId);
    return { conversation: await dtoFor(created.id, userId), created: true };
  }

  const members = [...new Set(input.memberIds)];
  if (members.length === 0) throw badRequest('A group needs at least one other member');
  const found = await prisma.user.findMany({
    where: { id: { in: members }, deletedAt: null, bannedAt: null },
    select: { id: true },
  });
  if (found.length !== members.length) throw badRequest('Some members do not exist');

  const created = await createGroup(userId, input.title, members);
  invalidateAudience(userId, ...members);
  return { conversation: await dtoFor(created.id, userId), created: true };
}

/** Broadcast a freshly created conversation to every participant's private room. */
export async function announce(conversation: ConversationDTO): Promise<void> {
  for (const participant of conversation.participants) {
    const dto = await dtoFor(conversation.id, participant.id);
    emitConversationToUser(participant.id, dto);
  }
}

export async function messages(
  userId: string,
  conversationId: string,
  query: { before?: string; limit: number },
): Promise<MessagePage> {
  await ensureParticipant(conversationId, userId);
  const { rows, hasMore } = await pageMessages(conversationId, userId, query);
  const ordered = [...rows].reverse();
  return {
    messages: ordered.map((row) => toMessage(row, userId)),
    hasMore,
  };
}

export async function read(
  userId: string,
  conversationId: string,
  messageIds?: string[],
): Promise<{ conversationId: string; messageIds: string[] }> {
  await ensureParticipant(conversationId, userId);
  const ids = await markReadRepo(conversationId, userId, messageIds);

  if (ids.length > 0) {
    emitReceipts({ conversationId, userId, messageIds: ids, state: 'READ' });
  }

  const lastMessageId = await prisma.message
    .findFirst({ where: { conversationId }, orderBy: { seq: 'desc' }, select: { id: true } })
    .then((row) => row?.id ?? null);

  await prisma.participant.update({
    where: { conversationId_userId: { conversationId, userId } },
    data: { lastReadAt: new Date(), lastReadMessageId: lastMessageId },
  });

  return { conversationId, messageIds: ids };
}

export async function delivered(
  userId: string,
  conversationId: string,
  messageIds: string[],
): Promise<{ conversationId: string; messageIds: string[] }> {
  await ensureParticipant(conversationId, userId);
  const count = await markDeliveredRepo(conversationId, userId, messageIds);
  if (count > 0) {
    emitReceipts({ conversationId, userId, messageIds, state: 'DELIVERED' });
    return { conversationId, messageIds };
  }
  return { conversationId, messageIds: [] };
}

export async function isParticipant(conversationId: string, userId: string): Promise<boolean> {
  const participant = await findParticipant(conversationId, userId);
  return Boolean(participant && !participant.leftAt);
}

export async function getParticipantIds(conversationId: string): Promise<string[]> {
  return participantIds(conversationId);
}

export async function get(conversationId: string, userId: string): Promise<ConversationDTO> {
  await ensureParticipant(conversationId, userId);
  return dtoFor(conversationId, userId);
}
