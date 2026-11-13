-- Migration: 20261113133000_team_directory_university_and_official_positions.sql
-- Description: Standardize university to Universitas Mataram and update official position labels in kkn_team_directory

UPDATE public.kkn_team_directory
SET university = 'Universitas Mataram'
WHERE university IS NULL OR university <> 'Universitas Mataram';

UPDATE public.kkn_team_directory
SET position_label = 'Pembimbing (DPL)'
WHERE full_name = 'Lalu Muhammad Aby Dujana, M.Si.';
