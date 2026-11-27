import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { userSummarySelect } from '../services/dto';

export async function findByIdentifier(identifier: string) {
  return prisma.user.findFirst({
    where: {
      deletedAt: null,
      OR: [{ email: identifier.toLowerCase() }, { username: identifier }],
    },
  });
}

export async function findById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

export async function createUser(data: {
  username: string;
  displayName: string;
  email: string;
  passwordHash: string;
}) {
  return prisma.user.create({
    data: {
      ...data,
      settings: { create: {} },
    },
  });
}

export async function searchUsers(query: string, excludeId: string) {
  return prisma.user.findMany({
    where: {
      deletedAt: null,
      bannedAt: null,
      id: { not: excludeId },
      OR: [
        { username: { contains: query, mode: 'insensitive' } },
        { displayName: { contains: query, mode: 'insensitive' } },
      ],
    },
    select: userSummarySelect,
    take: 12,
    orderBy: { username: 'asc' },
  });
}

/** Users who share at least one conversation — the presence audience. */
export async function findConversationPartnerIds(userId: string): Promise<string[]> {
  const rows = await prisma.participant.findMany({
    where: { userId, leftAt: null },
    select: {
      conversation: {
        select: {
          participants: { where: { leftAt: null }, select: { userId: true } },
        },
      },
    },
  });

  const ids = new Set<string>();
  for (const row of rows) {
    for (const participant of row.conversation.participants) {
      if (participant.userId !== userId) ids.add(participant.userId);
    }
  }
  return [...ids];
}

export async function findBlockBetween(a: string, b: string) {
  return prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: a, blockedId: b },
        { blockerId: b, blockedId: a },
      ],
    },
    select: { id: true, blockerId: true },
  });
}

export type UserWithSettings = Prisma.UserGetPayload<{ include: { settings: true } }>;
