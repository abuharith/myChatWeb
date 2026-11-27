export const LIMITS = {
  usernameMin: 3,
  usernameMax: 32,
  displayNameMax: 64,
  passwordMin: 10,
  passwordMax: 128,
  messageMax: 4000,
  groupTitleMax: 80,
  pageSizeDefault: 30,
  pageSizeMax: 60,
  typingTtlMs: 4000,
  accessTokenTtl: '15m',
  media: {
    maxAttachments: 10,
    waveformMaxPeaks: 128,
    imageMaxBytes: 15 * 1024 * 1024,
    videoMaxBytes: 100 * 1024 * 1024,
    audioMaxBytes: 25 * 1024 * 1024,
    voiceMaxBytes: 25 * 1024 * 1024,
    fileMaxBytes: 25 * 1024 * 1024,
  },
} as const;

export const SOCKET_NAMESPACES = {
  chat: '/chat',
  presence: '/presence',
} as const;

export const RATE_LIMITS = {
  auth: 10,
  messages: 30,
  general: 300,
} as const;
