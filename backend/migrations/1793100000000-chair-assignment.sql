-- Up Migration
-- Existing chairs remain shared; no user data is removed or reassigned.
ALTER TABLE salon.staff ADD CONSTRAINT staff_salon_id_unique UNIQUE(salon_id,id);
ALTER TABLE salon.chairs ADD COLUMN assigned_staff_id text
  GENERATED ALWAYS AS (document->>'assignedStaffId') STORED;
ALTER TABLE salon.chairs ADD CONSTRAINT chair_assigned_staff_fk
  FOREIGN KEY(salon_id,assigned_staff_id) REFERENCES salon.staff(salon_id,id);
CREATE INDEX chairs_assigned_staff ON salon.chairs(salon_id,assigned_staff_id);
-- Preserve the existing schedule relationship within the same salon too.
ALTER TABLE salon.schedules ADD CONSTRAINT schedules_salon_staff_fk
  FOREIGN KEY(salon_id,staff_id) REFERENCES salon.staff(salon_id,id);

-- Down Migration
ALTER TABLE salon.schedules DROP CONSTRAINT schedules_salon_staff_fk;
DROP INDEX salon.chairs_assigned_staff;
ALTER TABLE salon.chairs DROP CONSTRAINT chair_assigned_staff_fk;
ALTER TABLE salon.chairs DROP COLUMN assigned_staff_id;
ALTER TABLE salon.staff DROP CONSTRAINT staff_salon_id_unique;
