-- Up Migration
ALTER TABLE salon.settings ADD COLUMN slot_interval_minutes integer
  GENERATED ALWAYS AS (COALESCE((document->>'slotIntervalMinutes')::integer,15)) STORED
  CHECK(slot_interval_minutes BETWEEN 5 AND 120);

-- Down Migration
-- The salon document and saved interval remain intact.
ALTER TABLE salon.settings DROP COLUMN slot_interval_minutes;
