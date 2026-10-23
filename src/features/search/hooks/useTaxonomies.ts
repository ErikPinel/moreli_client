import { useQuery } from '@tanstack/react-query'
import { getCities, getSubjects } from '../api/get-taxonomies'
import { taxonomyQueryKeys } from '../api/search-query-keys'

const taxonomyCacheTime = 24 * 60 * 60_000

export function useSubjects() {
  return useQuery({
    queryKey: taxonomyQueryKeys.subjects,
    queryFn: getSubjects,
    staleTime: taxonomyCacheTime,
  })
}

export function useCities() {
  return useQuery({
    queryKey: taxonomyQueryKeys.cities,
    queryFn: getCities,
    staleTime: taxonomyCacheTime,
  })
}
