/**
 * End-to-end realtime smoke test against a running API (port 4000).
 * Verifies: socket auth, presence broadcast, typing fan-out, message delivery
 * and the read-receipt round trip between two real accounts.
 *
 *   node apps/server/scripts/smoke-realtime.mjs
 */
import { io } from 'socket.io-client';
import { PrismaClient } from '@prisma/client';

const API = process.env.API_URL ?? 'http://127.0.0.1:4000';
const PASSWORD = 'voidlink-dev';
const prisma = new PrismaClient();

const sockets = [];

function waitFor(socket, event, predicate = () => true, timeout = 8000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`timeout waiting for ${event}`));
    }, timeout);

    function handler(payload) {
      if (!predicate(payload)) return;
      clearTimeout(timer);
      socket.off(event, handler);
      resolve(payload);
    }

    socket.on(event, handler);
  });
}

function connected(socket, timeout = 8000) {
  if (socket.connected) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('socket connect timeout')), timeout);
    socket.once('connect', () => {
      clearTimeout(timer);
      resolve();
    });
    socket.once('connect_error', (error) => {
      clearTimeout(timer);
      reject(new Error(`socket auth failed: ${error.message}`));
    });
  });
}

function sendWithAck(socket, event, payload, timeout = 8000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${event} ack timeout`)), timeout);
    socket.emit(event, payload, (ack) => {
      clearTimeout(timer);
      resolve(ack);
    });
  });
}

async function login(identifier) {
  const response = await fetch(`${API}/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ identifier, password: PASSWORD }),
  });
  if (!response.ok) throw new Error(`login failed for ${identifier}: ${response.status}`);
  return (await response.json()).data;
}

const results = [];
const check = (label, ok) => {
  results.push({ label, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
};

try {
  const ashka = await login('ashka');
  const rune = await login('rune');

  const conversations = await fetch(`${API}/v1/conversations`, {
    headers: { authorization: `Bearer ${ashka.accessToken}` },
  }).then((response) => response.json());

  const direct = conversations.data.conversations.find(
    (conversation) => conversation.type === 'DIRECT' && conversation.peer?.username === 'rune',
  );
  if (!direct) throw new Error('seeded direct conversation missing');

  const presenceRune = io(`${API}/presence`, {
    auth: { token: rune.accessToken },
    transports: ['websocket'],
  });
  sockets.push(presenceRune);
  await connected(presenceRune);

  const chatRune = io(`${API}/chat`, {
    auth: { token: rune.accessToken },
    transports: ['websocket'],
  });
  const chatAshka = io(`${API}/chat`, {
    auth: { token: ashka.accessToken },
    transports: ['websocket'],
  });
  sockets.push(chatRune, chatAshka);
  await Promise.all([connected(chatRune), connected(chatAshka)]);
  check('both chat sockets authenticate', true);

  // Presence: Rune watches the presence channel, Ashka comes online.
  const presenceRuneForAshka = waitFor(
    presenceRune,
    'presence:update',
    (update) => update.userId === ashka.user.id,
  );
  const presenceAshka = io(`${API}/presence`, {
    auth: { token: ashka.accessToken },
    transports: ['websocket'],
  });
  sockets.push(presenceAshka);
  await connected(presenceAshka);
  const presenceUpdate = await presenceRuneForAshka;
  check('presence broadcast reaches a peer', presenceUpdate.presence === 'ONLINE');

  // Typing: Rune types, Ashka receives embers.
  const typingPromise = waitFor(
    chatAshka,
    'typing',
    (update) => update.conversationId === direct.id && update.userId === rune.user.id,
  );
  chatRune.emit('typing:start', { conversationId: direct.id });
  const typing = await typingPromise;
  check('typing indicator fans out', typing.displayName === rune.user.displayName);

  // Delivery: Ashka sends, Rune receives.
  const clientId = crypto.randomUUID();
  const incoming = waitFor(
    chatRune,
    'message:new',
    (message) => message.clientId === clientId,
  );
  const ack = await sendWithAck(chatAshka, 'message:send', {
    conversationId: direct.id,
    clientId,
    type: 'TEXT',
    body: 'Smoke: the gate holds.',
    encrypted: false,
  });
  check('message send acknowledged', ack.ok === true);

  const delivered = await incoming;
  check('message arrives over the socket', delivered.body === 'Smoke: the gate holds.');

  // Receipts: Rune reads, Ashka sees READ.
  const receiptPromise = waitFor(
    chatAshka,
    'receipt:update',
    (update) => update.conversationId === direct.id && update.userId === rune.user.id,
  );
  chatRune.emit('message:read', { conversationId: direct.id, messageIds: [delivered.id] });
  const receipt = await receiptPromise;
  check('read receipt round-trips to the sender', receipt.state === 'READ');

  const duplicate = await sendWithAck(chatAshka, 'message:send', {
    conversationId: direct.id,
    clientId,
    type: 'TEXT',
    body: 'Smoke: the gate holds.',
    encrypted: false,
  });
  check('duplicate client id is idempotent', duplicate.ok && duplicate.message.id === delivered.id);

  await prisma.message.deleteMany({ where: { clientId } });
} catch (error) {
  console.error('SMOKE ERROR', error);
  results.push({ label: 'smoke run', ok: false });
} finally {
  for (const socket of sockets) socket.disconnect();
  await prisma.$disconnect();
}

const failed = results.filter((result) => !result.ok);
console.log(`\n${results.length - failed.length}/${results.length} realtime checks passed`);
process.exit(failed.length === 0 ? 0 : 1);
