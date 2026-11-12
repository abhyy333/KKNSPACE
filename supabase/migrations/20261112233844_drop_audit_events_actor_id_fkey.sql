-- PHASE 4.2.8.1 — AUDIT EVENTS FOREIGN KEY CLEANUP
-- Drops audit_events_actor_id_fkey so deleting an auth user does not attempt
-- to UPDATE public.audit_events SET actor_id = NULL, which triggers the immutable audit trigger.
-- Preserves audit log actor UUIDs forever.

ALTER TABLE public.audit_events DROP CONSTRAINT IF EXISTS audit_events_actor_id_fkey;
