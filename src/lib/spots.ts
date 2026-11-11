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
  for (const s of spots) if (s.active) out[s.district]++
  return out
}
