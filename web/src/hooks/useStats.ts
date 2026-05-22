import { useQuery } from '@tanstack/react-query';
import { statsApi } from '@/lib/api';

export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: statsApi.get,
    staleTime: 1000 * 60, // 1 min
  });
}

export function useStatsHistory(days = 30) {
  return useQuery({
    queryKey: ['stats', 'history', days],
    queryFn: () => statsApi.getHistory(days),
  });
}
