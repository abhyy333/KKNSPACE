REVOKE EXECUTE ON FUNCTION public.get_logbook_team_summary(date, date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_logbook_team_summary(date, date, date) TO authenticated, service_role;
