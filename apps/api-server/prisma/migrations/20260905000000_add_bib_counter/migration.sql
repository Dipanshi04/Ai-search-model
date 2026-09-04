-- AlterTable
ALTER TABLE "events" ADD COLUMN "bib_counter" INTEGER NOT NULL DEFAULT 0;

-- Backfill: each event's counter starts from its current highest issued
-- BIB number (e.g. "ISA1042" -> 1042), not 0, so newly-allocated numbers
-- continue on from there instead of colliding with already-issued bibs.
UPDATE "events" e
SET "bib_counter" = COALESCE((
  SELECT MAX(CAST(REGEXP_REPLACE(p.bib_number, '\D', '', 'g') AS INTEGER))
  FROM "participants" p
  WHERE p.event_id = e.id AND p.bib_number ~ '\d'
), 0);
