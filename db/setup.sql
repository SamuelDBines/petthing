-- Portrait Spell database setup for an existing DigitalOcean Managed Postgres cluster.
-- Run this yourself as doadmin. The app never executes this file.
-- It creates one database and one login. It does not read or write any other app's tables.
--
-- Replace the password before you run PART B. Use a long random value, not one shared with another app.
--
-- PART A
-- Connect to defaultdb (the cluster default), then run ONLY this statement.
-- CREATE DATABASE cannot run inside a transaction. If your SQL console wraps the script, run it alone.

CREATE DATABASE portrait_spell;

-- PART B
-- Reconnect to the database portrait_spell, then run the rest of this file.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'portrait_spell_app') THEN
    CREATE ROLE portrait_spell_app LOGIN PASSWORD 'replace-with-a-long-random-password';
  END IF;
END
$$;

-- PUBLIC can connect to a new database. Remove that, then grant only this app.
REVOKE CONNECT ON DATABASE portrait_spell FROM PUBLIC;
GRANT CONNECT ON DATABASE portrait_spell TO portrait_spell_app;

REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO portrait_spell_app;

-- Tables created later by doadmin (npm run migrate) are readable and writable by the app.
-- The app role cannot create or drop tables.
ALTER DEFAULT PRIVILEGES FOR ROLE doadmin IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO portrait_spell_app;
ALTER DEFAULT PRIVILEGES FOR ROLE doadmin IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO portrait_spell_app;

ALTER ROLE portrait_spell_app CONNECTION LIMIT 20;
ALTER ROLE portrait_spell_app SET statement_timeout = '15s';

-- Postgres also grants CONNECT to PUBLIC on databases that already exist.
-- portrait_spell_app inherits that, but CONNECT does not grant access to their tables.
-- To block even opening another database, run this from defaultdb for each one, by name:
--   REVOKE CONNECT ON DATABASE <other_database> FROM portrait_spell_app;
-- Do not REVOKE CONNECT FROM PUBLIC. Other apps may rely on it.

-- After this file succeeds:
-- 1. In the DigitalOcean control panel, open the cluster, Connection Pools, Create a Pool.
--    Name: portrait-spell
--    Database: portrait_spell
--    User: portrait_spell_app
--    Mode: transaction
--    Size: 10 (keep it under this role's connection limit of 20; the pool is shared with other pools)
-- 2. Copy the pool connection string into DATABASE_URL.
--    On DigitalOcean the pool string uses the pool name as the database path. Use the string from
--    that pool's Connection details. Do not invent the port.
-- 3. Copy the cluster's direct connection string (Overview, not the pool) into DATABASE_URL_DIRECT
--    and change the user to doadmin. Migrations need a session connection. Do not point this at the pool.
-- 4. Standard Edition: Download CA certificate, and put the PEM in DATABASE_CA_CERT.
--    Advanced Edition: there is no downloadable CA. Set DATABASE_CA_CERT=system so Node verifies
--    the server against its built-in trust store. Never set rejectUnauthorized to false.
-- 5. npm run migrate
-- 6. npm run db:seed
