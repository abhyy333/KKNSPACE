-- Migration: Redesign Jadwal Piket Posko to Visual Documentation
-- 1. Add title and created_at columns to duty_shifts
-- 2. Set defaults for shift_date, start_time, and end_time
-- 3. Update existing duty_shifts title
-- 4. Add RLS policy for creators to manage their own documentation

ALTER TABLE public.duty_shifts ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.duty_shifts ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.duty_shifts ALTER COLUMN shift_date SET DEFAULT CURRENT_DATE;
ALTER TABLE public.duty_shifts ALTER COLUMN start_time SET DEFAULT '00:00:00';
ALTER TABLE public.duty_shifts ALTER COLUMN end_time SET DEFAULT '23:59:00';

UPDATE public.duty_shifts
SET title = COALESCE(NULLIF(notes, ''), 'Piket Posko ' || to_char(shift_date, 'DD Mon YYYY'))
WHERE title IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'duty_shifts' AND policyname = 'duty_shifts_creator_manage'
  ) THEN
    CREATE POLICY duty_shifts_creator_manage ON public.duty_shifts
    FOR ALL TO authenticated
    USING (
      created_by = auth.uid() AND (SELECT app_private.is_active_member())
    )
    WITH CHECK (
      created_by = auth.uid() AND (SELECT app_private.is_active_member())
    );
  END IF;
END $$;
