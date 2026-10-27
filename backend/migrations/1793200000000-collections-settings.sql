-- Up Migration
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM reservations.bookings WHERE payment_status IN ('paid','partially_refunded','refunded','refund_pending')) THEN
    RAISE EXCEPTION 'Legacy payment flags require reconciliation before adding the collection ledger; no amounts will be inferred.';
  END IF;
END $$;
CREATE SCHEMA payments;
ALTER TABLE salon.settings
  ADD COLUMN deposit_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN online_payment_visible boolean NOT NULL DEFAULT false,
  ADD COLUMN payment_settings_version integer NOT NULL DEFAULT 1 CHECK(payment_settings_version > 0);
ALTER TABLE reservations.bookings
  ADD COLUMN received_amount integer NOT NULL DEFAULT 0 CHECK(received_amount >= 0 AND received_amount <= total),
  ADD CONSTRAINT bookings_salon_id_unique UNIQUE(salon_id,id);
ALTER TABLE identity.users ADD CONSTRAINT users_salon_id_unique UNIQUE(salon_id,id);
ALTER TABLE identity.customers ADD CONSTRAINT customers_salon_id_unique UNIQUE(salon_id,id);
ALTER TABLE salon.services ADD CONSTRAINT services_salon_id_unique UNIQUE(salon_id,id);
ALTER TABLE salon.chairs ADD CONSTRAINT chairs_salon_id_unique UNIQUE(salon_id,id);
ALTER TABLE reservations.bookings
  ADD FOREIGN KEY(salon_id,staff_id) REFERENCES salon.staff(salon_id,id),
  ADD FOREIGN KEY(salon_id,service_id) REFERENCES salon.services(salon_id,id),
  ADD FOREIGN KEY(salon_id,chair_id) REFERENCES salon.chairs(salon_id,id),
  ADD FOREIGN KEY(salon_id,customer_id) REFERENCES identity.customers(salon_id,id);
ALTER TABLE identity.users
  ADD FOREIGN KEY(salon_id,staff_id) REFERENCES salon.staff(salon_id,id),
  ADD FOREIGN KEY(salon_id,customer_id) REFERENCES identity.customers(salon_id,id);
CREATE TABLE payments.collections (
  id text PRIMARY KEY,
  salon_id text NOT NULL REFERENCES salon.settings(id),
  reservation_id text NOT NULL,
  actor_id text NOT NULL,
  amount integer NOT NULL CHECK(amount > 0 AND amount <= 100000000),
  currency text NOT NULL DEFAULT 'TRY' CHECK(currency='TRY'),
  method text NOT NULL CHECK(method IN ('cash','card','bank_transfer')),
  reverses_id text UNIQUE,
  note text NOT NULL DEFAULT '' CHECK(length(note) <= 200),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(salon_id,reservation_id,id),
  FOREIGN KEY(salon_id,reservation_id) REFERENCES reservations.bookings(salon_id,id),
  FOREIGN KEY(salon_id,actor_id) REFERENCES identity.users(salon_id,id),
  FOREIGN KEY(salon_id,reservation_id,reverses_id) REFERENCES payments.collections(salon_id,reservation_id,id),
  CHECK(reverses_id IS NULL OR (reverses_id <> id AND length(trim(note)) >= 3))
);
CREATE INDEX collections_reservation ON payments.collections(salon_id,reservation_id,created_at,id);
CREATE FUNCTION payments.guard_collection() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE original payments.collections;
BEGIN
  IF TG_OP <> 'INSERT' THEN RAISE EXCEPTION 'Collection history is immutable' USING ERRCODE='23514'; END IF;
  IF NEW.reverses_id IS NOT NULL THEN
    SELECT * INTO original FROM payments.collections WHERE id=NEW.reverses_id;
    IF original.reverses_id IS NOT NULL OR original.amount <> NEW.amount OR original.method <> NEW.method THEN
      RAISE EXCEPTION 'Invalid collection reversal' USING ERRCODE='23514';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER collection_history BEFORE INSERT OR UPDATE OR DELETE ON payments.collections FOR EACH ROW EXECUTE FUNCTION payments.guard_collection();
-- No historical payment-status flag is fabricated into a receipt. Existing paid flags require reconciliation.

-- Down Migration
DO $$ BEGIN RAISE EXCEPTION 'Financial history must be preserved. Use forward-fix or a verified backup restore.'; END $$;
