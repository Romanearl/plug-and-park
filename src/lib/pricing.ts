// Pricing rules (pure). Prices are HKD.

import type { Spot } from '../data/types'

/** pricePerHour × minutes / 60, rounded to the nearest HK$0.50 (e.g. $25/h × 15 min = 6.25 → 6.50). */
export function priceFor(spot: Pick<Spot, 'pricePerHour'>, minutes: number): number {
  return Math.round(((spot.pricePerHour * minutes) / 60) * 2) / 2
}

/** What the owner keeps after the platform's commission, e.g. 30 × (1 − 0.18) = 24.60. */
export const ownerEarnings = (price: number, commissionRate: number) => Math.round(price * (1 - commissionRate) * 100) / 100

/** DC fast charging from 40 kW. */
export const isDcFast = (spot: Pick<Spot, 'powerKw'>) => spot.powerKw >= 40

/** Rough energy added: min(kW, 60) × hours (cars rarely draw more than ~60 kW on average). */
export function estimateKwh(spot: Pick<Spot, 'powerKw'>, minutes: number): number {
  return Math.round(Math.min(spot.powerKw, 60) * (minutes / 60))
}
