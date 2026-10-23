import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { apiRequest } from '@/api/api-client'
import { endpoints } from '@/api/endpoints'
import type {
  AvailabilitySlotDto,
  InquiryDto,
  NotificationDto,
  PaginatedDto,
  PublicTeacherDto,
  ReviewDto,
  StudentRequestDto,
  TeacherOnboardingDto,
} from '@/types/api'

export const accountKeys = {
  requests: ['account', 'requests'] as const,
  favorites: ['account', 'favorites'] as const,
  inquiries: (side: 'student' | 'teacher') => ['account', 'inquiries', side] as const,
  reviews: ['account', 'reviews'] as const,
  teacher: ['teacher-profile'] as const,
  schedule: ['account', 'teacher-schedule'] as const,
  notifications: ['account', 'notifications'] as const,
  unreadNotifications: ['account', 'notifications', 'unread-count'] as const,
}

export function useStudentRequests() {
  return useQuery({
    queryKey: accountKeys.requests,
    queryFn: () => apiRequest<PaginatedDto<StudentRequestDto>>(`${endpoints.requests}?limit=50&page=1`),
  })
}

export function useFavorites(enabled = true) {
  return useQuery({
    queryKey: accountKeys.favorites,
    queryFn: () => apiRequest<PublicTeacherDto[]>(endpoints.favorites),
    enabled,
  })
}

export function useInquiries(side: 'student' | 'teacher', status?: InquiryDto['status'], view?: 'actionable') {
  return useInfiniteQuery({
    queryKey: [...accountKeys.inquiries(side), 'inbox', status ?? 'all', view ?? 'all'],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => apiRequest<PaginatedDto<InquiryDto>>(`${endpoints.inquiries}?side=${side}&limit=50&page=${pageParam}${status ? `&status=${status}` : ''}${view ? `&view=${view}` : ''}`),
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.page + 1 : undefined,
    select: (data) => ({ items: data.pages.flatMap((page) => page.items) }),
  })
}

export function useMyReviews(enabled = true) {
  return useQuery({
    queryKey: accountKeys.reviews,
    queryFn: () => apiRequest<ReviewDto[]>(endpoints.currentReviews),
    enabled,
  })
}

export function useTeacherProfile(enabled = true) {
  return useQuery({
    queryKey: accountKeys.teacher,
    queryFn: () => apiRequest<TeacherOnboardingDto>(endpoints.currentTeacher),
    enabled,
  })
}

export function useTeacherSchedule() {
  return useQuery({
    queryKey: accountKeys.schedule,
    queryFn: () => apiRequest<AvailabilitySlotDto[]>(endpoints.teacherSchedule),
  })
}

export function useNotifications() {
  return useQuery({
    queryKey: accountKeys.notifications,
    queryFn: () => apiRequest<PaginatedDto<NotificationDto>>(`${endpoints.notifications}?limit=50&page=1`),
  })
}

export function useUnreadNotifications() {
  return useQuery({
    queryKey: accountKeys.unreadNotifications,
    queryFn: () => apiRequest<{ count: number }>(endpoints.unreadNotifications),
    staleTime: 30_000,
  })
}

export function useAcceptedStudents(enabled = true) {
  return useInfiniteQuery({
    queryKey: [...accountKeys.inquiries('teacher'), 'accepted'],
    enabled,
    initialPageParam: 1,
    queryFn: ({ pageParam }) => apiRequest<PaginatedDto<InquiryDto>>(`${endpoints.inquiries}?side=teacher&status=accepted&limit=50&page=${pageParam}`),
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.page + 1 : undefined,
  })
}