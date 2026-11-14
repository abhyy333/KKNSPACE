-- Migration: Add missing foreign key constraints for meeting_decisions and survey_responses
-- Remediation for Audit Findings F-01 and F-02

-- 1. meeting_decisions.responsible_user_id -> profiles.id
ALTER TABLE public.meeting_decisions
DROP CONSTRAINT IF EXISTS meeting_decisions_responsible_user_id_fkey;

ALTER TABLE public.meeting_decisions
ADD CONSTRAINT meeting_decisions_responsible_user_id_fkey
FOREIGN KEY (responsible_user_id)
REFERENCES public.profiles(id)
ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_meeting_decisions_responsible_user_id 
ON public.meeting_decisions(responsible_user_id);

-- 2. survey_responses.submitted_by & verified_by -> profiles.id
ALTER TABLE public.survey_responses
DROP CONSTRAINT IF EXISTS survey_responses_submitted_by_fkey;

ALTER TABLE public.survey_responses
ADD CONSTRAINT survey_responses_submitted_by_fkey
FOREIGN KEY (submitted_by)
REFERENCES public.profiles(id)
ON DELETE RESTRICT;

ALTER TABLE public.survey_responses
DROP CONSTRAINT IF EXISTS survey_responses_verified_by_fkey;

ALTER TABLE public.survey_responses
ADD CONSTRAINT survey_responses_verified_by_fkey
FOREIGN KEY (verified_by)
REFERENCES public.profiles(id)
ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_survey_responses_submitted_by
ON public.survey_responses(submitted_by);

CREATE INDEX IF NOT EXISTS idx_survey_responses_verified_by
ON public.survey_responses(verified_by);
