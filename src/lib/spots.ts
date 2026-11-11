// Spot discovery rules (pure): filters, sorting, district counts.

import type { ChargerType, District, Spot } from '../data/types'
import { isOpenAt } from './availability'

export const CHARGER_TYPES: ChargerType[] = ['CCS2', 'Type 2', 'CHAdeMO', 'GB/T']

export const DISTRICTS: District[] = [
  'Kwun Tong',
  'Kowloon Bay',
  'Wan Chai',
  'Sha Tin',
  'Tai Po',
  'Sai Kung',
  'Tsuen Wan',
  'Kwai Chung',
  'Yuen Long',
  'Tuen Mun',
]

export interface SpotFilters {
  district: District | null
  charger: ChargerType | null
  openNow: boolean
  /** Strictly under HK$25 per hour. */
  under25: boolean
}

export const NO_FILTERS: SpotFilters = { district: null, charger: null, openNow: false, under25: false }

export const hasFilters = (f: SpotFilters) => !!f.district || !!f.charger || f.openNow || f.under25

export function filterSpots(spots: Spot[], f: SpotFilters, now: Date): Spot[] {
  return spots.filter(
    (s) =>
      s.active &&
      s.reviewStatus === 'approved' &&
      (!f.district || s.district === f.district) &&
      (!f.charger || s.chargerType === f.charger) &&
      (!f.openNow || isOpenAt(s, now)) &&
      (!f.under25 || s.pricePerHour < 25),
  )
}

export type SortKey = 'price' | 'rating'

export function sortSpots(spots: Spot[], key: SortKey): Spot[] {
  return [...spots].sort((a, b) =>
    key === 'price'
      ? a.pricePerHour - b.pricePerHour || b.rating - a.rating
      : b.rating - a.rating || b.reviewsCount - a.reviewsCount,
  )
}

export function districtCounts(spots: Spot[]): Record<District, number> {
  const out = Object.fromEntries(DISTRICTS.map((d) => [d, 0])) as Record<District, number>
  for (const s of spots) if (s.active && s.reviewStatus === 'approved') out[s.district]++
  return out
}

/** Map centre per district (application form + district fly-to). */
export const DISTRICT_CENTRES: Record<District, [number, number]> = {
  'Kwun Tong': [22.312, 114.225],
  'Kowloon Bay': [22.323, 114.212],
  'Wan Chai': [22.279, 114.172],
  'Sha Tin': [22.382, 114.19],
  'Tai Po': [22.45, 114.164],
  'Sai Kung': [22.381, 114.27],
  'Tsuen Wan': [22.371, 114.114],
  'Kwai Chung': [22.363, 114.131],
  'Yuen Long': [22.445, 114.035],
  'Tuen Mun': [22.391, 113.977],
}

/** "Similar bays in Sai Kung charge HK$23–25" — range of approved spots in a district (null if none). */
export function districtPriceRange(spots: Spot[], district: District): [number, number] | null {
  const ps = spots.filter((s) => s.district === district && s.reviewStatus === 'approved' && s.active).map((s) => s.pricePerHour)
  return ps.length ? [Math.min(...ps), Math.max(...ps)] : null
}
