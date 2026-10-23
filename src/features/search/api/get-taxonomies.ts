import { apiRequest } from '@/api/api-client'
import { endpoints } from '@/api/endpoints'
import type { CityDto, SubjectDto } from '@/types/api'

export function getSubjects() {
  return apiRequest<SubjectDto[]>(endpoints.subjects)
}

export function getCities() {
  return apiRequest<CityDto[]>(endpoints.cities)
}
