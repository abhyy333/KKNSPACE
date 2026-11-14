-- =============================================================================
-- Migration: Partnership Contact Settings & Destination Switcher
-- Description: Creates partnership_contact_settings table, RLS, audit trigger,
--              get_public_partnership_contact RPC, and update_partnership_contact_settings RPC
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.partnership_contact_settings (
  id text PRIMARY KEY DEFAULT 'active_config' CHECK (id = 'active_config'),
  active_destination text NOT NULL DEFAULT 'whatsapp' CHECK (active_destination IN ('whatsapp', 'email')),
  whatsapp_number text NOT NULL DEFAULT '',
  whatsapp_country_code text NOT NULL DEFAULT '62',
  whatsapp_default_message text NOT NULL DEFAULT 'Halo, saya tertarik untuk mengetahui lebih lanjut mengenai program Partnership KKN SPACE. Boleh saya mendapatkan informasi mengenai paket kerja sama yang tersedia?',
  email_address text NOT NULL DEFAULT 'kknunrampringgaselaselatan@gmail.com',
  email_subject text NOT NULL DEFAULT 'Partnership Inquiry — KKN SPACE',
  email_body text NOT NULL DEFAULT 'Halo, saya tertarik untuk berdiskusi mengenai peluang kerja sama dengan KKN SPACE. Mohon informasi lebih lanjut mengenai program partnership yang tersedia.',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by_name text
);

INSERT INTO public.partnership_contact_settings (
  id,
  active_destination,
  whatsapp_number,
  whatsapp_country_code,
  whatsapp_default_message,
  email_address,
  email_subject,
  email_body,
  updated_at
) VALUES (
  'active_config',
  'whatsapp',
  '6281907604500',
  '62',
  'Halo, saya tertarik untuk mengetahui lebih lanjut mengenai program Partnership KKN SPACE. Boleh saya mendapatkan informasi mengenai paket kerja sama yang tersedia?',
  'kknunrampringgaselaselatan@gmail.com',
  'Partnership Inquiry — KKN SPACE',
  'Halo, saya tertarik untuk berdiskusi mengenai peluang kerja sama dengan KKN SPACE. Mohon informasi lebih lanjut mengenai program partnership yang tersedia.',
  now()
) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.partnership_contact_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'partnership_contact_settings' AND policyname = 'Managers can view partnership contact settings'
  ) THEN
    CREATE POLICY "Managers can view partnership contact settings"
      ON public.partnership_contact_settings
      FOR SELECT
      TO authenticated
      USING (
        app_private.is_super_admin()
        OR (SELECT app_private.has_kkn_role('ketua'))
        OR (SELECT app_private.has_kkn_role('sekretaris'))
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'partnership_contact_settings' AND policyname = 'Super Admin can update partnership contact settings'
  ) THEN
    CREATE POLICY "Super Admin can update partnership contact settings"
      ON public.partnership_contact_settings
      FOR UPDATE
      TO authenticated
      USING (app_private.is_super_admin())
      WITH CHECK (app_private.is_super_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_partnership_contact_settings'
  ) THEN
    CREATE TRIGGER trg_audit_partnership_contact_settings
      AFTER INSERT OR UPDATE OR DELETE ON public.partnership_contact_settings
      FOR EACH ROW EXECUTE FUNCTION app_private.write_audit_event();
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.get_public_partnership_contact()
RETURNS TABLE (
  active_destination text,
  whatsapp_number text,
  whatsapp_country_code text,
  whatsapp_default_message text,
  email_address text,
  email_subject text,
  email_body text,
  is_available boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_rec record;
  v_avail boolean := false;
  v_clean_phone text;
BEGIN
  SELECT * INTO v_rec FROM public.partnership_contact_settings WHERE id = 'active_config';
  IF NOT FOUND THEN
    RETURN QUERY SELECT 'none'::text, null::text, null::text, null::text, null::text, null::text, null::text, false;
    RETURN;
  END IF;

  IF v_rec.active_destination = 'whatsapp' THEN
    v_clean_phone := regexp_replace(coalesce(v_rec.whatsapp_number, ''), '\D', '', 'g');
    IF length(v_clean_phone) >= 8 THEN
      v_avail := true;
    END IF;

    RETURN QUERY SELECT
      'whatsapp'::text,
      v_rec.whatsapp_number,
      v_rec.whatsapp_country_code,
      v_rec.whatsapp_default_message,
      null::text,
      null::text,
      null::text,
      v_avail;
  ELSE
    IF coalesce(v_rec.email_address, '') ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
      v_avail := true;
    END IF;

    RETURN QUERY SELECT
      'email'::text,
      null::text,
      null::text,
      null::text,
      v_rec.email_address,
      v_rec.email_subject,
      v_rec.email_body,
      v_avail;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_partnership_contact() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.update_partnership_contact_settings(
  p_active_destination text,
  p_whatsapp_number text,
  p_whatsapp_country_code text,
  p_whatsapp_default_message text,
  p_email_address text,
  p_email_subject text,
  p_email_body text
)
RETURNS public.partnership_contact_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_user_id uuid;
  v_user_name text;
  v_res public.partnership_contact_settings;
  v_clean_phone text;
BEGIN
  IF NOT app_private.is_super_admin() THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya Super Admin yang dapat mengubah pengaturan kontak partnership.'
      USING ERRCODE = '42501';
  END IF;

  IF p_active_destination NOT IN ('whatsapp', 'email') THEN
    RAISE EXCEPTION 'Destinasi kontak tidak valid: %', p_active_destination
      USING ERRCODE = '22023';
  END IF;

  IF p_email_address IS NOT NULL AND p_email_address <> '' THEN
    IF NOT (p_email_address ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$') THEN
      RAISE EXCEPTION 'Format email tidak valid: %', p_email_address
        USING ERRCODE = '22023';
    END IF;
  END IF;

  IF p_active_destination = 'whatsapp' THEN
    v_clean_phone := regexp_replace(coalesce(p_whatsapp_number, ''), '\D', '', 'g');
    IF length(v_clean_phone) < 8 THEN
      RAISE EXCEPTION 'Nomor WhatsApp tidak valid. Masukkan nomor telepon yang valid.'
        USING ERRCODE = '22023';
    END IF;
  END IF;

  v_user_id := auth.uid();
  SELECT coalesce(p.full_name, u.email, 'Admin')
  INTO v_user_name
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE u.id = v_user_id;

  UPDATE public.partnership_contact_settings
  SET
    active_destination = p_active_destination,
    whatsapp_number = coalesce(p_whatsapp_number, ''),
    whatsapp_country_code = coalesce(nullif(p_whatsapp_country_code, ''), '62'),
    whatsapp_default_message = coalesce(p_whatsapp_default_message, ''),
    email_address = coalesce(p_email_address, ''),
    email_subject = coalesce(p_email_subject, ''),
    email_body = coalesce(p_email_body, ''),
    updated_at = now(),
    updated_by = v_user_id,
    updated_by_name = v_user_name
  WHERE id = 'active_config'
  RETURNING * INTO v_res;

  RETURN v_res;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_partnership_contact_settings(text, text, text, text, text, text, text) TO authenticated;
