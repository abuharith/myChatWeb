import type { MessageType, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { conversationInclude, messageInclude } from '../services/dto';

export async function listForUser(userId: string) {
  return prisma.conversation.findMany({
    where: {
      deletedAt: null,
      participants: { some: { userId, leftAt: null, isArchived: false } },
    },
    include: conversationInclude,
    orderBy: [{ lastMessageAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
    take: 60,
  });
}

export async function findParticipant(conversationId: string, userId: string) {
  return prisma.participant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
    select: { id: true, role: true, leftAt: true },
  });
}

export async function participantIds(conversationId: string): Promise<string[]> {
  const rows = await prisma.participant.findMany({
    where: { conversationId, leftAt: null },
    select: { userId: true },
  });
  return rows.map((row) => row.userId);
}

export async function findByIdWithParticipants(conversationId: string) {
  return prisma.conversation.findFirst({
    where: { id: conversationId, deletedAt: null },
    include: conversationInclude,
  });
}

export async function findDirectBetween(a: string, b: string) {
  return prisma.conversation.findFirst({
    where: {
      type: 'DIRECT',
      deletedAt: null,
      AND: [
        { participants: { some: { userId: a, leftAt: null } } },
        { participants: { some: { userId: b, leftAt: null } } },
      ],
    },
    include: conversationInclude,
    orderBy: { createdAt: 'asc' },
  });
}

export async function createDirect(a: string, b: string) {
  return prisma.conversation.create({
    data: {
      type: 'DIRECT',
      createdById: a,
      memberCount: 2,
      participants: {
        create: [
          { userId: a, role: 'OWNER' },
          { userId: b, role: 'MEMBER' },
        ],
      },
    },
    include: conversationInclude,
  });
}

export async function createGroup(creatorId: string, title: string, memberIds: string[]) {
  const uniqueMembers = [...new Set(memberIds.filter((id) => id !== creatorId))];
  return prisma.conversation.create({
    data: {
      type: 'GROUP',
      title,
      createdById: creatorId,
      memberCount: uniqueMembers.length + 1,
      participants: {
        create: [
          { userId: creatorId, role: 'OWNER' },
          ...uniqueMembers.map((userId) => ({ userId, role: 'MEMBER' as const })),
        ],
      },
    },
    include: conversationInclude,
  });
}

export async function unreadCount(conversationId: string, userId: string) {
  return prisma.message.count({
    where: {
      conversationId,
      senderId: { not: userId },
      deletedForEveryone: false,
      hides: { none: { userId } },
      receipts: { some: { userId, state: { not: 'READ' } } },
    },
  });
}

export async function lastMessages(ids: string[]) {
  if (ids.length === 0) return [];
  return prisma.message.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      body: true,
      type: true,
      senderId: true,
      createdAt: true,
    },
  });
}

export async function preview(conversationId: string, userId: string) {
  const message = await prisma.message.findFirst({
    where: { conversationId, hides: { none: { userId } }, deletedForEveryone: false },
    orderBy: { seq: 'desc' },
    select: { body: true, type: true, senderId: true, createdAt: true },
  });
  return message;
}

export async function findLastMessageIdForUser(conversationId: string) {
  const message = await prisma.message.findFirst({
    where: { conversationId },
    orderBy: { seq: 'desc' },
    select: { id: true },
  });
  return message?.id ?? null;
}

export type ConversationWithParticipants = Prisma.ConversationGetPayload<{
  include: typeof conversationInclude;
}>;

export type PreviewMessage = {
  body: string | null;
  type: MessageType;
  senderId: string | null;
  createdAt: Date;
};

export type MessageWithSender = Prisma.MessageGetPayload<{ include: typeof messageInclude }>;
