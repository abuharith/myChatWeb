-- VoidLink: full-text + fuzzy search support (drift-safe)
--
-- Prisma cannot express a GENERATED column's expression, so a generated tsvector
-- made every later `prisma migrate diff` emit `ALTER COLUMN ... DROP DEFAULT`
-- (verified against PostgreSQL 19). A BEFORE INSERT/UPDATE trigger is invisible
-- to Prisma: the datamodel declares a plain `tsvector` column, the database
-- stores a plain `tsvector` column, and the sync logic lives here. Indexes are
-- declared in schema.prisma as GIN so Prisma owns their names and never drops
-- them; this migration must use the exact names Prisma derives.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── trigger-maintained search vector ───────────────────────────────────
-- Two-argument to_tsvector() is IMMUTABLE and language-explicit.
-- Encrypted (E2EE) payloads are excluded: ciphertext must never be indexed.
CREATE OR REPLACE FUNCTION voidlink_messages_search_vector()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW."searchVector" := CASE
    WHEN NEW."encrypted" THEN NULL
    ELSE setweight(to_tsvector('simple', coalesce(NEW."body", '')), 'A')
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_search_vector_trg ON "messages";
CREATE TRIGGER messages_search_vector_trg
  BEFORE INSERT OR UPDATE OF "body", "encrypted"
  ON "messages"
  FOR EACH ROW
  EXECUTE FUNCTION voidlink_messages_search_vector();

-- ── indexes (names must match Prisma's @@index names) ──────────────────
CREATE INDEX "messages_searchVector_idx"
  ON "messages" USING GIN ("searchVector");

CREATE INDEX "users_username_idx"
  ON "users" USING GIN ("username" gin_trgm_ops);

CREATE INDEX "users_displayName_idx"
  ON "users" USING GIN ("displayName" gin_trgm_ops);

CREATE INDEX "conversations_title_idx"
  ON "conversations" USING GIN ("title" gin_trgm_ops);

-- ── ranking helper used by message search queries ──────────────────────
CREATE OR REPLACE FUNCTION voidlink_message_rank(q tsquery, v tsvector)
RETURNS real
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT ts_rank_cd(v, q, 32);
$$;
