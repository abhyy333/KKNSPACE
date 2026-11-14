import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchMaintenanceConfig, updateMaintenanceConfig, type UpdateMaintenancePayload } from '@/services/maintenanceApi'
import type { MaintenanceConfig } from '@/types/maintenance'

export const MAINTENANCE_QUERY_KEY = ['system_maintenance_config']

export function useMaintenanceConfig() {
  return useQuery<MaintenanceConfig | null>({
    queryKey: MAINTENANCE_QUERY_KEY,
    queryFn: fetchMaintenanceConfig,
    staleTime: 1000 * 30, // 30 seconds
    refetchOnWindowFocus: true,
  })
}

export function useUpdateMaintenance() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpdateMaintenancePayload) => updateMaintenanceConfig(payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(MAINTENANCE_QUERY_KEY, updated)
      queryClient.invalidateQueries({ queryKey: MAINTENANCE_QUERY_KEY })
    },
  })
}
