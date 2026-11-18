-- Terugweg van module ai, schemaversie 2: de grenzen van de organisatie (het maandplafond en de
-- noodstop) en de index voor de som van een maand.
-- Geschreven door pnpm template:apply naast de gegenereerde migratie; zie lib/db/migrations/README.md.
drop table if exists "ai_limits";
drop index if exists "ai_requests_org_day_idx";
