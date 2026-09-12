import { apiRequest } from '@/api/api-client'
import { endpoints } from '@/api/endpoints'
import type { CityDto, LevelDto, SubjectDto } from '@/types/api'

export function getSubjects() {
  return apiRequest<SubjectDto[]>(endpoints.subjects)
}

export function getCities() {
  return apiRequest<CityDto[]>(endpoints.cities)
}

export function getLevels() {
  return apiRequest<LevelDto[]>(endpoints.levels)
}