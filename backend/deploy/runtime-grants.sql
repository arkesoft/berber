-- Run as schema owner after migrations. Create salon_app LOGIN with a unique password separately via \password.
-- Runtime must never use the cluster superuser or migration owner.
GRANT CONNECT ON DATABASE salon TO salon_app;
GRANT USAGE ON SCHEMA salon,identity,reservations,notifications,platform TO salon_app;
GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA salon,identity,reservations,notifications,platform TO salon_app;
GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA platform TO salon_app;
REVOKE UPDATE,DELETE ON platform.audit FROM salon_app;
-- No CREATE, TRUNCATE, schema ownership or migration privileges are granted.
