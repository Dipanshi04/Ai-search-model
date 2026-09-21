-- AlterTable
ALTER TABLE "participants" ADD COLUMN "name" TEXT;

-- Backfill: every existing participant gets the name currently on their
-- linked user, so nothing regresses to blank. This preserves whatever
-- name is showing right now (including any already-corrupted shared
-- names) — it does not attempt to recover a name that's already been
-- overwritten, only decouples future edits so it can't happen again.
UPDATE "participants" p
SET "name" = u."name"
FROM "users" u
WHERE p."user_id" = u."id" AND p."name" IS NULL;
