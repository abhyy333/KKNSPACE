import type { AcademicStatus, KknRole, KknTeamDirectoryMember } from '@/types/database'

export const POSITION_TO_ROLE_MAP: Record<string, KknRole> = {
  pembimbing: 'dpl',
  dpl: 'dpl',
  ketua: 'ketua',
  sekretaris: 'sekretaris',
  bendahara: 'bendahara',
  anggota: 'anggota',
}

export const ROLE_TO_DEFAULT_POSITION: Record<KknRole, string> = {
  dpl: 'Pembimbing',
  ketua: 'Ketua',
  sekretaris: 'Sekretaris',
  bendahara: 'Bendahara',
  anggota: 'Anggota',
}

export const ACADEMIC_STATUS_LABELS: Record<AcademicStatus, string> = {
  mahasiswa: 'Mahasiswa',
  dosen: 'Dosen',
}

export const DIRECTORY_ROLE_OPTIONS: Array<{ value: KknRole; label: string }> = [
  { value: 'dpl', label: 'Pembimbing (DPL)' },
  { value: 'ketua', label: 'Ketua' },
  { value: 'sekretaris', label: 'Sekretaris' },
  { value: 'bendahara', label: 'Bendahara' },
  { value: 'anggota', label: 'Anggota' },
]

export const ROLE_SORT_ORDER: Record<KknRole, number> = {
  dpl: 1,
  ketua: 2,
  sekretaris: 3,
  bendahara: 4,
  anggota: 5,
}

export function normalizePositionToRole(positionLabel: string): KknRole {
  const normalized = positionLabel.trim().toLowerCase()
  return POSITION_TO_ROLE_MAP[normalized] ?? 'anggota'
}

export function sortDirectoryMembers(
  members: KknTeamDirectoryMember[]
): KknTeamDirectoryMember[] {
  return [...members].sort((a, b) => {
    if (a.is_active !== b.is_active) {
      return a.is_active ? -1 : 1
    }
    const rankDiff = (ROLE_SORT_ORDER[a.role] ?? 99) - (ROLE_SORT_ORDER[b.role] ?? 99)
    if (rankDiff !== 0) return rankDiff
    return a.full_name.localeCompare(b.full_name, 'id')
  })
}

export interface DirectoryFilterCriteria {
  searchTerm: string
  roleFilter: 'all' | KknRole
  studyProgramFilter: string
  academicStatusFilter: 'all' | AcademicStatus
  divisionFilter: string
  showInactive?: boolean
}

export function filterDirectoryMembers(
  members: KknTeamDirectoryMember[],
  criteria: DirectoryFilterCriteria
): KknTeamDirectoryMember[] {
  const query = criteria.searchTerm.trim().toLowerCase()

  return members.filter((member) => {
    if (!criteria.showInactive && !member.is_active) return false
    if (criteria.roleFilter !== 'all' && member.role !== criteria.roleFilter) return false
    if (
      criteria.studyProgramFilter !== 'all' &&
      member.study_program !== criteria.studyProgramFilter
    ) {
      return false
    }
    if (
      criteria.academicStatusFilter !== 'all' &&
      member.academic_status !== criteria.academicStatusFilter
    ) {
      return false
    }
    if (criteria.divisionFilter === '__none__') {
      if (member.division) return false
    } else if (
      criteria.divisionFilter !== 'all' &&
      (member.division ?? '') !== criteria.divisionFilter
    ) {
      return false
    }

    if (query) {
      const searchable = [
        member.full_name,
        member.identity_number,
        member.study_program,
        member.position_label,
        member.division ?? '',
        member.phone ?? '',
      ]
        .join(' ')
        .toLowerCase()
      if (!searchable.includes(query)) return false
    }

    return true
  })
}
