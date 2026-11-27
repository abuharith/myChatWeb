import type { Request, Response } from 'express';
import {
  createConversationSchema,
  messageQuerySchema,
  receiptSchema,
  sendMessageSchema,
} from '@voidlink/shared';
import { unauthorized } from '../../lib/errors';
import * as conversationService from '../../services/conversation.service';
import * as messageService from '../../services/message.service';

export async function list(req: Request, res: Response) {
  if (!req.auth) throw unauthorized();
  const conversations = await conversationService.list(req.auth.userId);
  res.json({ data: { conversations } });
}

export async function create(req: Request, res: Response) {
  if (!req.auth) throw unauthorized();
  const input = createConversationSchema.parse(req.body);
  const { conversation, created } = await conversationService.create(req.auth.userId, input);
  if (created) await conversationService.announce(conversation);
  res.status(created ? 201 : 200).json({ data: { conversation } });
}

export async function messages(req: Request, res: Response) {
  if (!req.auth) throw unauthorized();
  const query = messageQuerySchema.parse(req.query);
  const page = await conversationService.messages(
    req.auth.userId,
    req.params.id ?? '',
    query,
  );
  res.json({ data: page });
}

export async function markRead(req: Request, res: Response) {
  if (!req.auth) throw unauthorized();
  const input = receiptSchema.partial().parse({
    conversationId: req.params.id,
    ...req.body,
  });
  const result = await conversationService.read(
    req.auth.userId,
    req.params.id ?? '',
    input.messageIds,
  );
  res.json({ data: result });
}

export async function sendMessage(req: Request, res: Response) {
  if (!req.auth) throw unauthorized();
  const input = sendMessageSchema.parse({
    conversationId: req.params.id,
    ...req.body,
  });
  const result = await messageService.send(req.auth.userId, input);
  res.status(result.duplicate ? 200 : 201).json({ data: { message: result.message } });
}
