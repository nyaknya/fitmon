// myGuestbooks.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { guestbookService } from '@/pages/mypage/api/guestbookService';
import {useParticipatingGatherings } from './myGathering';
import { GatheringListItem, GuestbookRequest, PageResponse } from '@/types';

export const GUESTBOOK_KEYS = {
  all: ['guestbooks'] as const,
  lists: () => [...GUESTBOOK_KEYS.all, 'list'] as const,
  list: (page: number, pageSize: number) => [...GUESTBOOK_KEYS.lists(), { page, pageSize }] as const,
  available: (page?: number) => [...GUESTBOOK_KEYS.all, 'available', { page }] as const,
};

export function useGuestbooks(page = 0, pageSize = 10) {
  return useQuery({
    queryKey: GUESTBOOK_KEYS.list(page, pageSize),
    queryFn: () => guestbookService.getMyGuestbooks(page, pageSize)
  });
}


export function useCreateGuestbook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ gatheringId, data }: {
      gatheringId: number;
      data: GuestbookRequest;
    }) => guestbookService.createGuestbook(gatheringId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GUESTBOOK_KEYS.available() });
      queryClient.invalidateQueries({ queryKey: GUESTBOOK_KEYS.lists() });
    },
  });
}

export function useUpdateGuestbook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      gatheringId,
      guestbookId,
      data
    }: {
      gatheringId: number;
      guestbookId: number;
      data: GuestbookRequest;
    }) => guestbookService.updateGuestbook(gatheringId, guestbookId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GUESTBOOK_KEYS.available() });
      queryClient.invalidateQueries({ queryKey: GUESTBOOK_KEYS.lists() });
    },
  });
}

export function useDeleteGuestbook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ gatheringId, guestbookId }: { 
      gatheringId: number; 
      guestbookId: number; 
    }) => guestbookService.deleteGuestbook(gatheringId, guestbookId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GUESTBOOK_KEYS.available() });
      queryClient.invalidateQueries({ queryKey: GUESTBOOK_KEYS.lists() });
    },
  });
}

export function useAvailableGuestbooks({ page = 0 } = {}) {
  const { data: participatingGatherings } = useParticipatingGatherings();
  const { data: guestbooksData } = useGuestbooks();

  return useQuery({
    queryKey: GUESTBOOK_KEYS.available(page),
    queryFn: async () => {
      if (!participatingGatherings?.content || !guestbooksData) {
        return {
          content: [],
          totalElements: 0,
          totalPages: 0,
          currentPage: page
        } as PageResponse<GatheringListItem>;
      }

      const filteredGatherings = participatingGatherings.content.filter((gathering) => {
        const hasWrittenGuestbook = guestbooksData.content?.some(
          guestbook => guestbook.gatheringId === gathering.gatheringId
        );

        // 모임 상태가 '진행중' 또는 '종료됨'인 경우만 허용
        const isValidStatus = gathering.status === '진행중' || gathering.status === '종료됨';

        return (
          gathering.participantStatus &&
          isValidStatus &&
          !hasWrittenGuestbook
        );
      });

      // 페이지네이션 처리
      const pageSize = 10;
      const start = page * pageSize;
      const end = start + pageSize;
      const paginatedGatherings = filteredGatherings.slice(start, end);

      return {
        content: paginatedGatherings,
        totalElements: filteredGatherings.length,
        totalPages: Math.ceil(filteredGatherings.length / pageSize),
        currentPage: page
      } as PageResponse<GatheringListItem>;
    },
    enabled: !!participatingGatherings?.content && !!guestbooksData,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: 1000
  });
}
