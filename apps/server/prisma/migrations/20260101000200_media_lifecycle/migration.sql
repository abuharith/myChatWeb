-- VoidLink: media lifecycle (view-once burn, deleted media, orphan sweep)
--
-- Attachments are soft-deleted with their message, and view-once media is only
-- "burned" in the database. The sweep in src/services/media-lifecycle.service.ts
-- needs a durable marker so it never re-deletes the same objects every run.

ALTER TABLE "attachments" ADD COLUMN "purgedAt" TIMESTAMP(3);

CREATE INDEX "attachments_viewOnce_openedAt_idx" ON "attachments"("viewOnce", "openedAt");
CREATE INDEX "attachments_purgedAt_idx" ON "attachments"("purgedAt");
