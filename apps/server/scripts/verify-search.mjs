/**
 * Verifies the Postgres search subsystem against a migrated database:
 *   - trigger keeps messages.searchVector in sync on insert and edit
 *   - E2EE payloads are never indexed
 *   - the GIN / trigram indexes exist with Prisma-canonical names
 *
 *   DATABASE_URL=... node apps/server/scripts/verify-search.mjs
 */
import { Client } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const client = new Client({ connectionString });
await client.connect();

const stamp = Date.now();
const userId = `verify_user_${stamp}`;
const convId = `verify_conv_${stamp}`;
const msgId = `verify_msg_${stamp}`;
const encId = `verify_enc_${stamp}`;

let failures = 0;
const check = (label, ok, detail = '') => {
  if (ok) {
    console.log(`PASS  ${label}`);
  } else {
    failures += 1;
    console.error(`FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
  }
};

try {
  await client.query(
    `INSERT INTO users (id, username, "displayName", email, "updatedAt")
     VALUES ($1, $2, $3, $4, now())`,
    [userId, `verify_${stamp}`, 'Verifier', `verify_${stamp}@voidlink.test`],
  );

  await client.query(
    `INSERT INTO conversations (id, type, "updatedAt", "createdById")
     VALUES ($1, 'DIRECT', now(), $2)`,
    [convId, userId],
  );

  await client.query(
    `INSERT INTO messages (id, "conversationId", "clientId", body, "updatedAt")
     VALUES ($1, $2, $3, $4, now())`,
    [msgId, convId, `client_${stamp}`, 'The eastern gate is sealed until the ember tide turns'],
  );

  const found = await client.query(
    `SELECT "searchVector"::text AS vector,
            (SELECT voidlink_message_rank(to_tsquery('simple', 'eastern & gate'), "searchVector")) AS rank
       FROM messages WHERE id = $1`,
    [msgId],
  );
  check(
    'trigger indexes inserted message',
    Boolean(found.rows[0]?.vector?.includes('eastern')),
    JSON.stringify(found.rows[0]),
  );
  check('rank helper returns a score', Number(found.rows[0]?.rank) > 0);

  const match = await client.query(
    `SELECT id FROM messages
      WHERE "searchVector" @@ to_tsquery('simple', 'eastern & gate')
        AND id = $1`,
    [msgId],
  );
  check('full-text query finds the message', match.rowCount === 1);

  await client.query(`UPDATE messages SET body = 'The western gate is open' WHERE id = $1`, [
    msgId,
  ]);
  const edited = await client.query(
    `SELECT "searchVector"::text AS vector FROM messages WHERE id = $1`,
    [msgId],
  );
  check(
    'trigger reindexes edited body',
    Boolean(edited.rows[0]?.vector?.includes('western')) &&
      !edited.rows[0]?.vector?.includes('eastern'),
    JSON.stringify(edited.rows[0]),
  );

  await client.query(
    `INSERT INTO messages (id, "conversationId", "clientId", body, encrypted, "updatedAt")
     VALUES ($1, $2, $3, $4, true, now())`,
    [encId, convId, `client_enc_${stamp}`, 'ciphertext-should-not-be-indexed'],
  );
  const encrypted = await client.query(
    `SELECT "searchVector"::text AS vector FROM messages WHERE id = $1`,
    [encId],
  );
  check('E2EE payload is not indexed', encrypted.rows[0]?.vector === null);

  const indexes = await client.query(
    `SELECT indexname FROM pg_indexes
      WHERE indexname IN (
        'messages_searchVector_idx',
        'users_username_idx',
        'users_displayName_idx',
        'conversations_title_idx'
      )
      ORDER BY indexname`,
  );
  check(
    'all four search indexes exist with Prisma names',
    indexes.rowCount === 4,
    indexes.rows.map((row) => row.indexname).join(', '),
  );

  const trgm = await client.query(
    `SELECT similarity('titan_of_the_void', 'titan_of_the_v0id') AS score`,
  );
  check('pg_trgm similarity works', Number(trgm.rows[0]?.score) > 0.5);
} finally {
  await client.query('DELETE FROM users WHERE id = $1', [userId]).catch(() => {});
  await client.end();
}

if (failures > 0) {
  console.error(`\n${failures} search check(s) failed`);
  process.exit(1);
}

console.log('\nAll search checks passed');
