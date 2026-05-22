import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { wordsApi, dictionaryApi } from '@/lib/api';
import type { WordCreate, WordReview } from '@/types';

export function useWords(params?: {
  page?: number;
  per_page?: number;
  search?: string;
  tag?: string;
  sort?: string;
}) {
  return useQuery({
    queryKey: ['words', params],
    queryFn: () => wordsApi.getAll(params),
  });
}

export function useDueWords() {
  return useQuery({
    queryKey: ['words', 'due'],
    queryFn: wordsApi.getDue,
  });
}

export function useWord(id: string) {
  return useQuery({
    queryKey: ['words', id],
    queryFn: () => wordsApi.getOne(id),
    enabled: !!id,
  });
}

export function useCreateWord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: WordCreate) => wordsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['words'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useUpdateWord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<WordCreate> }) =>
      wordsApi.update(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['words'] });
      qc.invalidateQueries({ queryKey: ['words', id] });
    },
  });
}

export function useDeleteWord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => wordsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['words'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useReviewWord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: WordReview }) =>
      wordsApi.review(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['words', 'due'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => wordsApi.toggleFavorite(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['words'] });
    },
  });
}

export function useLookupWord(word: string) {
  return useQuery({
    queryKey: ['dictionary', word],
    queryFn: () => dictionaryApi.lookup(word),
    enabled: word.length > 1,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}
