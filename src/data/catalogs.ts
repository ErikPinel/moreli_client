import cities from './cities.json'
import professions from './professions.json'

export type CatalogItem = { name_he: string; slug: string }
export const catalogs: Record<'cities' | 'professions', CatalogItem[]> = { cities, professions }