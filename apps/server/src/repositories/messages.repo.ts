import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { messageInclude } from '../services/dto';

export async function pageMessages(
  conversationId: string,
  userId: string,
  options: { before?: string; limit: number },
) {
  const before = options.before ? BigInt(options.before) : undefined;

  const rows = await prisma.message.findMany({
    where: {
      conversationId,
      hides: { none: { userId } },
      ...(before ? { seq: { lt: before } } : {}),
    },
    include: messageInclude,
    orderBy: { seq: 'desc' },
    take: options.limit + 1,
  });

  const hasMore = rows.length > options.limit;
  return { rows: rows.slice(0, options.limit), hasMore };
}

export interface CreateMessageData {
  conversationId: string;
  senderId: string;
  clientId: string;
  type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'VOICE' | 'FILE';
  body: string;
  replyToId?: string;
  encrypted: boolean;
  recipientIds: string[];
  attachmentIds: string[];
  viewOnce: boolean;
}

/**
 * Idempotent create: the unique (conversationId, clientId) pair makes offline
 * queue replays and double socket emits produce exactly one row.
 */
export async function createMessage(data: CreateMessageData) {
  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.message.findUnique({
        where: {
          conversationId_clientId: {
            conversationId: data.conversationId,
            clientId: data.clientId,
          },
        },
        include: messageInclude,
      });
      if (existing) return { row: existing, duplicate: true as const };

      if (data.viewOnce && data.attachmentIds.length > 0) {
        await tx.attachment.updateMany({
          where: { id: { in: data.attachmentIds }, messageId: null },
          data: { viewOnce: true },
        });
      }

      const message = await tx.message.create({
        data: {
          conversationId: data.conversationId,
          senderId: data.senderId,
          clientId: data.clientId,
          type: data.type,
          body: data.body,
          encrypted: data.encrypted,
          replyToId: data.replyToId ?? null,
          viewOnce: data.viewOnce,
          receipts: {
            create: data.recipientIds
              .filter((id) => id !== data.senderId)
              .map((userId) => ({ userId, state: 'SENT' as const })),
          },
          ...(data.attachmentIds.length > 0
            ? { attachments: { connect: data.attachmentIds.map((id) => ({ id })) } }
            : {}),
        },
        include: messageInclude,
      });

      await tx.conversation.update({
        where: { id: data.conversationId },
        data: { lastMessageAt: message.createdAt, lastMessageId: message.id },
      });

      return { row: message, duplicate: false as const };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const existing = await prisma.message.findUnique({
        where: {
          conversationId_clientId: {
            conversationId: data.conversationId,
            clientId: data.clientId,
          },
        },
        include: messageInclude,
      });
      if (existing) return { row: existing, duplicate: true as const };
    }
    throw error;
  }
}

export async function findMessage(id: string) {
  return prisma.message.findUnique({ where: { id }, include: messageInclude });
}

export async function markDelivered(conversationId: string, userId: string, messageIds: string[]) {
  const result = await prisma.messageReceipt.updateMany({
    where: {
      userId,
      messageId: { in: messageIds },
      state: 'SENT',
      message: { conversationId, senderId: { not: userId } },
    },
    data: { state: 'DELIVERED', deliveredAt: new Date() },
  });
  return result.count;
}

export async function markRead(conversationId: string, userId: string, messageIds?: string[]) {
  const where: Prisma.MessageReceiptWhereInput = {
    userId,
    state: { not: 'READ' },
    message: {
      conversationId,
      senderId: { not: userId },
      ...(messageIds && messageIds.length > 0 ? { id: { in: messageIds } } : {}),
    },
  };

  const pending = await prisma.messageReceipt.findMany({
    where,
    select: { messageId: true },
  });
  if (pending.length === 0) return [] as string[];

  const ids = pending.map((row) => row.messageId);
  await prisma.messageReceipt.updateMany({
    where: { userId, messageId: { in: ids } },
    data: { state: 'READ', readAt: new Date(), deliveredAt: new Date() },
  });
  return ids;
}
