import type { MessageDTO, SendMessageInput } from '@voidlink/shared';
import { forbidden, notFound } from '../lib/errors';
import { emitMessage } from '../lib/realtime';
import { prisma } from '../lib/prisma';
import { createMessage } from '../repositories/messages.repo';
import { findBlockBetween } from '../repositories/users.repo';
import { isParticipant, getParticipantIds } from './conversation.service';
import { toMessage } from './dto';

export interface SendResult {
  message: MessageDTO;
  duplicate: boolean;
}

export async function send(userId: string, input: SendMessageInput): Promise<SendResult> {
  const allowed = await isParticipant(input.conversationId, userId);
  if (!allowed) throw forbidden('You are not part of this conversation');

  const conversation = await prisma.conversation.findFirst({
    where: { id: input.conversationId, deletedAt: null },
    select: { id: true, type: true },
  });
  if (!conversation) throw notFound('Conversation not found');

  if (conversation.type === 'DIRECT') {
    const recipients = (await getParticipantIds(conversation.id)).filter((id) => id !== userId);
    const other = recipients[0];
    if (other) {
      const block = await findBlockBetween(userId, other);
      if (block) {
        throw forbidden(
          block.blockerId === userId
            ? 'Unblock this account to send messages'
            : 'You cannot message this account',
        );
      }
    }
  }

  if (input.replyToId) {
    const reply = await prisma.message.findFirst({
      where: { id: input.replyToId, conversationId: input.conversationId },
      select: { id: true },
    });
    if (!reply) throw notFound('The message you replied to no longer exists');
  }

  const recipientIds = await getParticipantIds(input.conversationId);

  const { row, duplicate } = await createMessage({
    conversationId: input.conversationId,
    senderId: userId,
    clientId: input.clientId,
    type: input.type,
    body: input.body,
    replyToId: input.replyToId,
    encrypted: input.encrypted,
    recipientIds,
  });

  const message = toMessage(row, userId);
  if (!duplicate) emitMessage(input.conversationId, message);

  return { message, duplicate };
}
