-- Up Migration
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE SCHEMA salon;
CREATE SCHEMA identity;
CREATE SCHEMA reservations;
CREATE SCHEMA notifications;
CREATE SCHEMA platform;

CREATE TABLE salon.settings (
  id text PRIMARY KEY, document jsonb NOT NULL,
  buffer_minutes integer NOT NULL DEFAULT 10 CHECK (buffer_minutes BETWEEN 0 AND 120),
  CHECK (document->>'id' = id)
);
CREATE TABLE salon.services (
  id text PRIMARY KEY, salon_id text NOT NULL REFERENCES salon.settings(id), document jsonb NOT NULL,
  CHECK ((document->'price'->>'amount')::integer >= (document->'deposit'->>'amount')::integer),
  CHECK ((document->'deposit'->>'amount')::integer >= 0),
  CHECK (document->>'id' = id)
);
CREATE TABLE salon.staff (id text PRIMARY KEY, salon_id text NOT NULL REFERENCES salon.settings(id), document jsonb NOT NULL, CHECK(document->>'id'=id));
CREATE TABLE salon.chairs (id text PRIMARY KEY, salon_id text NOT NULL REFERENCES salon.settings(id), document jsonb NOT NULL, CHECK(document->>'id'=id));
CREATE TABLE salon.schedules (
  id text PRIMARY KEY, salon_id text NOT NULL REFERENCES salon.settings(id),
  staff_id text NOT NULL REFERENCES salon.staff(id), document jsonb NOT NULL,
  starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL,
  CHECK (ends_at > starts_at), CHECK(document->>'id'=id)
);
CREATE INDEX schedules_staff_time ON salon.schedules(staff_id, starts_at, ends_at);
CREATE TABLE salon.closures (salon_id text NOT NULL REFERENCES salon.settings(id), day date NOT NULL, PRIMARY KEY(salon_id,day));
CREATE TABLE identity.customers (id text PRIMARY KEY, salon_id text NOT NULL REFERENCES salon.settings(id), document jsonb NOT NULL, CHECK(document->>'id'=id));
CREATE TABLE identity.users (
  id text PRIMARY KEY, salon_id text NOT NULL REFERENCES salon.settings(id), email text NOT NULL,
  name text NOT NULL, password_hash text NOT NULL,
  role text NOT NULL CHECK(role IN ('customer','manager','staff')),
  staff_id text REFERENCES salon.staff(id), customer_id text REFERENCES identity.customers(id),
  active boolean NOT NULL DEFAULT true, failed_attempts integer NOT NULL DEFAULT 0,
  locked_until timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(salon_id,email), CHECK(email = lower(email)),
  CHECK((role = 'staff') = (staff_id IS NOT NULL)),
  CHECK((role = 'customer') = (customer_id IS NOT NULL))
);
CREATE TABLE identity.sessions (id_hash text PRIMARY KEY, data jsonb NOT NULL, expires_at timestamptz NOT NULL);
CREATE INDEX sessions_expiry ON identity.sessions(expires_at);

CREATE TABLE reservations.bookings (
  id text PRIMARY KEY, salon_id text NOT NULL REFERENCES salon.settings(id),
  version integer NOT NULL DEFAULT 1 CHECK(version > 0),
  customer_id text REFERENCES identity.customers(id), customer_snapshot jsonb NOT NULL,
  staff_id text NOT NULL REFERENCES salon.staff(id), staff_name text NOT NULL,
  service_id text NOT NULL REFERENCES salon.services(id), service_name text NOT NULL,
  chair_id text NOT NULL REFERENCES salon.chairs(id),
  starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL, occupied_until timestamptz NOT NULL,
  total integer NOT NULL CHECK(total >= 0), deposit integer NOT NULL CHECK(deposit >= 0 AND deposit <= total),
  status text NOT NULL CHECK(status IN ('pending_payment','confirmed','in_service','completed','cancelled','no_show','expired')),
  payment_status text NOT NULL CHECK(payment_status IN ('unpaid','pending','paid','failed','refund_pending','refunded','partially_refunded')),
  hold_expires_at timestamptz,
  guest_token_hash text, guest_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK(ends_at > starts_at AND occupied_until >= ends_at),
  CHECK((status = 'pending_payment') = (hold_expires_at IS NOT NULL)),
  EXCLUDE USING gist (salon_id WITH =, staff_id WITH =, tstzrange(starts_at,occupied_until,'[)') WITH &&)
    WHERE (status IN ('pending_payment','confirmed','in_service')),
  EXCLUDE USING gist (salon_id WITH =, chair_id WITH =, tstzrange(starts_at,occupied_until,'[)') WITH &&)
    WHERE (status IN ('pending_payment','confirmed','in_service'))
);
CREATE INDEX bookings_customer ON reservations.bookings(customer_id,starts_at);
CREATE INDEX bookings_expiry ON reservations.bookings(hold_expires_at) WHERE status='pending_payment';
CREATE TABLE platform.idempotency (
  scope text NOT NULL, key text NOT NULL, signature text NOT NULL, result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(scope,key)
);
CREATE TABLE platform.audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, actor_id text NOT NULL,
  action text NOT NULL, entity_id text NOT NULL, request_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE notifications.outbox (
  id text PRIMARY KEY, topic text NOT NULL, payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','sent','dead')),
  attempts integer NOT NULL DEFAULT 0, available_at timestamptz NOT NULL DEFAULT now(),
  lease_until timestamptz, lease_token text, last_error text,
  created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz
);
CREATE INDEX outbox_ready ON notifications.outbox(status,available_at);

-- Down Migration
-- Intentionally refuse destructive automatic rollback; restore a verified backup or forward-fix.
DO $$ BEGIN RAISE EXCEPTION 'Destructive rollback disabled. Use the documented backup/restore runbook.'; END $$;
