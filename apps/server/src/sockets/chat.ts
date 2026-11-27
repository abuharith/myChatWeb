import type { Namespace } from 'socket.io';
import {
  receiptSchema,
  sendMessageSchema,
  typingSchema,
  type ChatClientEvents,
  type ChatServerEvents,
  type SocketData,
} from '@voidlink/shared';
import { AppError } from '../lib/errors';
import { logger } from '../lib/logger';
import { SlidingWindowLimiter } from '../lib/rate-limiter';
import { emitTyping, rooms } from '../lib/realtime';
import { prisma } from '../lib/prisma';
import * as conversationService from '../services/conversation.service';
import * as messageService from '../services/message.service';
import { authenticateSocket } from './auth';

type ChatServer = Namespace<
  ChatClientEvents,
  ChatServerEvents,
  Record<string, never>,
  SocketData
>;

const sendLimiter = new SlidingWindowLimiter(30, 60_000);
const reactionTypingLimiter = new SlidingWindowLimiter(20, 10_000);

function fail(socket: { data: SocketData }, error: unknown) {
  if (error instanceof AppError) {
    logger.debug('chat event rejected', { code: error.code, userId: socket.data.userId });
    return;
  }
  logger.error('chat event failed', {
    error: error instanceof Error ? error.message : String(error),
    userId: socket.data.userId,
  });
}

export function attachChat(io: ChatServer): void {
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    const userId = socket.data.userId;
    socket.join(rooms.user(userId));

    void prisma.participant
      .findMany({ where: { userId, leftAt: null }, select: { conversationId: true } })
      .then((rows) => {
        for (const row of rows) socket.join(rooms.conversation(row.conversationId));
      })
      .catch((error) => logger.warn('room join failed', { error: String(error) }));

    socket.on('conversation:join', async ({ conversationId }) => {
      if (await conversationService.isParticipant(conversationId, userId)) {
        socket.join(rooms.conversation(conversationId));
      }
    });

    socket.on('message:send', async (input, ack) => {
      try {
        if (!sendLimiter.take(userId)) {
          ack({ ok: false, error: 'You are sending messages too quickly' });
          return;
        }

        const parsed = sendMessageSchema.safeParse(input);
        if (!parsed.success) {
          ack({ ok: false, error: 'Invalid message' });
          return;
        }

        const result = await messageService.send(userId, parsed.data);
        ack({ ok: true, message: result.message });
      } catch (error) {
        fail(socket, error);
        ack({ ok: false, error: error instanceof Error ? error.message : 'Message failed' });
      }
    });

    socket.on('message:delivered', async (input) => {
      const parsed = receiptSchema.safeParse(input);
      if (!parsed.success) return;
      try {
        await conversationService.delivered(
          userId,
          parsed.data.conversationId,
          parsed.data.messageIds,
        );
      } catch (error) {
        fail(socket, error);
      }
    });

    socket.on('message:read', async (input) => {
      const parsed = receiptSchema.partial().safeParse(input);
      if (!parsed.success || !parsed.data.conversationId) return;
      try {
        await conversationService.read(
          userId,
          parsed.data.conversationId,
          parsed.data.messageIds,
        );
      } catch (error) {
        fail(socket, error);
      }
    });

    const handleTyping = async (input: unknown, active: boolean) => {
      const parsed = typingSchema.safeParse(input);
      if (!parsed.success) return;
      if (!reactionTypingLimiter.take(userId)) return;
      try {
        if (!(await conversationService.isParticipant(parsed.data.conversationId, userId))) return;
        if (!active) return;
        emitTyping(
          {
            conversationId: parsed.data.conversationId,
            userId,
            displayName: socket.data.displayName,
            until: Date.now() + 4000,
          },
          socket.id,
        );
      } catch (error) {
        fail(socket, error);
      }
    };

    socket.on('typing:start', (input) => void handleTyping(input, true));
    socket.on('typing:stop', (input) => void handleTyping(input, false));
  });
}
