import { z } from 'zod';
import { LIMITS } from './constants';

export const usernameSchema = z
  .string()
  .trim()
  .min(LIMITS.usernameMin)
  .max(LIMITS.usernameMax)
  .regex(/^[a-zA-Z0-9_]+$/, 'Letters, numbers and underscores only');

export const passwordSchema = z
  .string()
  .min(LIMITS.passwordMin, `At least ${LIMITS.passwordMin} characters`)
  .max(LIMITS.passwordMax);

export const registerSchema = z.object({
  username: usernameSchema,
  displayName: z.string().trim().min(1).max(LIMITS.displayNameMax),
  email: z.string().trim().toLowerCase().email().max(254),
  password: passwordSchema,
});

export const loginSchema = z.object({
  identifier: z.string().trim().min(3).max(254),
  password: z.string().min(1).max(LIMITS.passwordMax),
});

export const sendMessageSchema = z
  .object({
    conversationId: z.string().min(1),
    clientId: z.string().uuid(),
    type: z.enum(['TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'VOICE', 'FILE']).default('TEXT'),
    body: z.string().trim().max(LIMITS.messageMax).default(''),
    replyToId: z.string().min(1).optional(),
    encrypted: z.boolean().default(false),
    attachmentIds: z.array(z.string().min(1)).max(LIMITS.media.maxAttachments).default([]),
    viewOnce: z.boolean().default(false),
  })
  .superRefine((value, ctx) => {
    if (!value.body && value.attachmentIds.length === 0) {
      ctx.addIssue({ code: 'custom', message: 'A message needs text or an attachment' });
    }
    if (value.viewOnce && value.attachmentIds.length !== 1) {
      ctx.addIssue({ code: 'custom', message: 'View-once messages carry exactly one attachment' });
    }
  });

export const presignUploadSchema = z.object({
  kind: z.enum(['IMAGE', 'VIDEO', 'AUDIO', 'VOICE', 'FILE']),
  mimeType: z.string().trim().min(3).max(128),
  sizeBytes: z.number().int().positive().max(LIMITS.media.fileMaxBytes),
  durationMs: z.number().int().min(0).max(3_600_000).optional(),
  waveform: z.array(z.number().min(0).max(1)).max(LIMITS.media.waveformMaxPeaks).optional(),
});

export type PresignUploadInput = z.infer<typeof presignUploadSchema>;

export const completeUploadSchema = z.object({
  durationMs: z.number().int().min(0).max(3_600_000).optional(),
  waveform: z.array(z.number().min(0).max(1)).max(LIMITS.media.waveformMaxPeaks).optional(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

/** `me` hides the message for the caller; `everyone` tombstones it for the chat. */
export const deleteMessageSchema = z.object({
  scope: z.enum(['me', 'everyone']).default('me'),
});

export type DeleteMessageInput = z.infer<typeof deleteMessageSchema>;

export const receiptSchema = z.object({
  conversationId: z.string().min(1),
  messageIds: z.array(z.string().min(1)).min(1).max(100),
});

export const typingSchema = z.object({
  conversationId: z.string().min(1),
});

export const conversationParamsSchema = z.object({
  id: z.string().min(1),
});

export const messageQuerySchema = z.object({
  before: z.coerce.string().optional(),
  limit: z.coerce.number().int().min(1).max(LIMITS.pageSizeMax).default(LIMITS.pageSizeDefault),
});

export const createDirectSchema = z.object({
  type: z.literal('DIRECT').default('DIRECT'),
  participantId: z.string().min(1),
});

export const createGroupSchema = z.object({
  type: z.literal('GROUP'),
  title: z.string().trim().min(1).max(LIMITS.groupTitleMax),
  memberIds: z.array(z.string().min(1)).min(1).max(49),
});

export const createConversationSchema = z.discriminatedUnion('type', [
  createDirectSchema,
  createGroupSchema,
]);

export const presenceSetSchema = z.object({
  status: z.enum(['ONLINE', 'AWAY', 'DND']),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateConversationInput = z.infer<typeof createConversationSchema>;
