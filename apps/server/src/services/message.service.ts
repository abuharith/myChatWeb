import type {
  AttachmentKind,
  DeleteMessageInput,
  MessageDTO,
  SendMessageInput,
} from '@voidlink/shared';
import { badRequest, conflict, forbidden, notFound } from '../lib/errors';
import { emitMessage, emitMessageDeleted, emitMessageDeletedToUser } from '../lib/realtime';
import { prisma } from '../lib/prisma';
import { createMessage, findMessage } from '../repositories/messages.repo';
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

  const attachmentIds = [...new Set(input.attachmentIds)];
  let uploaded: Array<{ id: string; kind: AttachmentKind; messageId: string | null }> = [];

  if (attachmentIds.length > 0) {
    const rows = await prisma.attachment.findMany({
      where: { id: { in: attachmentIds } },
      include: { upload: { select: { userId: true, status: true } } },
    });
    if (rows.length !== attachmentIds.length) {
      throw badRequest('One or more attachments are unavailable');
    }

    const byId = new Map(rows.map((row) => [row.id, row]));
    uploaded = attachmentIds.map((id) => byId.get(id)!);

    for (const attachment of uploaded) {
      if (attachment.messageId) throw conflict('That attachment was already sent');
      if (attachment.kind === 'VOICE' && input.viewOnce) {
        throw badRequest('Only photos and videos can be view-once');
      }
    }

    // Ownership is checked through the upload row, never the attachment id alone.
    const ownership = await prisma.upload.findMany({
      where: { attachment: { id: { in: attachmentIds } } },
      select: { userId: true, status: true, attachment: { select: { id: true } } },
    });
    for (const row of ownership) {
      if (row.userId !== userId) throw forbidden('You can only send your own uploads');
      if (row.status !== 'READY') throw badRequest('Finish the upload before sending it');
    }

    if (input.viewOnce) {
      const kind = uploaded[0]?.kind;
      if (uploaded.length !== 1 || (kind !== 'IMAGE' && kind !== 'VIDEO')) {
        throw badRequest('View-once messages carry exactly one photo or video');
      }
    }
  }

  const derivedType =
    input.type === 'TEXT' && uploaded.length > 0
      ? ({ IMAGE: 'IMAGE', VIDEO: 'VIDEO', AUDIO: 'AUDIO', VOICE: 'VOICE', FILE: 'FILE' } as const)[
          uploaded[0]!.kind
        ]
      : input.type;

  const recipientIds = await getParticipantIds(input.conversationId);

  const { row, duplicate } = await createMessage({
    conversationId: input.conversationId,
    senderId: userId,
    clientId: input.clientId,
    type: derivedType,
    body: input.body,
    replyToId: input.replyToId,
    encrypted: input.encrypted,
    recipientIds,
    attachmentIds,
    viewOnce: input.viewOnce,
  });

  const message = toMessage(row, userId);
  if (!duplicate) emitMessage(input.conversationId, message);

  return { message, duplicate };
}

export interface DeleteResult {
  conversationId: string;
  messageId: string;
  scope: DeleteMessageInput['scope'];
  /** Tombstone for delete-for-everyone; null when the message was only hidden. */
  message: MessageDTO | null;
}

/**
 * Deletes a message for the caller only (`me`) or for the whole conversation
 * (`everyone`, sender only). Delete-for-everyone tombstones the row, which is
 * what makes the media sweep remove its attachments from object storage.
 */
export async function remove(
  userId: string,
  messageId: string,
  input: DeleteMessageInput,
): Promise<DeleteResult> {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: {
      conversation: {
        include: { participants: { where: { leftAt: null }, select: { userId: true } } },
      },
    },
  });
  if (!message) throw notFound('Message not found');

  const participant = message.conversation.participants.some((row) => row.userId === userId);
  if (!participant) throw forbidden('You are not part of this conversation');

  if (input.scope === 'me') {
    await prisma.messageHide.upsert({
      where: { messageId_userId: { messageId, userId } },
      create: { messageId, userId },
      update: {},
    });
    const result: DeleteResult = {
      conversationId: message.conversationId,
      messageId,
      scope: 'me',
      message: null,
    };
    emitMessageDeletedToUser(userId, { ...result, deletedBy: userId });
    return result;
  }

  if (message.senderId !== userId) {
    throw forbidden('Only the sender can delete this message for everyone');
  }

  if (!message.deletedForEveryone) {
    await prisma.message.update({
      where: { id: messageId },
      data: { deletedForEveryone: true, deletedAt: new Date(), body: null },
    });
  }

  const row = await findMessage(messageId);
  if (!row) throw notFound('Message not found');
  const tombstone = toMessage(row, userId);
  const result: DeleteResult = {
    conversationId: message.conversationId,
    messageId,
    scope: 'everyone',
    message: tombstone,
  };
  emitMessageDeleted(message.conversationId, { ...result, deletedBy: userId });
  return result;
}
