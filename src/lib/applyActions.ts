// Owner onboarding (diagram 3): application → platform review (Approve? Yes / No)
// → access code + payment info → spot goes live.

import type { AvailabilityWindow, ChargerType, District, Spot, User } from '../data/types'
import { validatePin } from './money'
import { getDB, updateDB } from './store'
import { id } from './util'

export const PROPERTY_TYPES: Spot['propertyType'][] = ['Village house', 'Industrial building', 'Commercial bay', 'Residential estate']
export const POWER_OPTIONS = [7, 7.4, 11, 22, 40, 50, 60]
export const AMENITIES = ['Covered', 'Indoor', 'Gated', 'Open air', '24h security', 'Near MTR', 'Near bus stop', 'Quiet street', 'Toilet', 'DC fast']
export const CHANGES_NOTE = 'Please add a clearer photo of the charger'

export interface ApplicationDraft {
  spotId?: string // set when editing an existing application
  step: 1 | 2 | 3
  title: string
  address: string
  district: District | ''
  propertyType: Spot['propertyType'] | ''
  lat: number | null
  lng: number | null
  chargerType: ChargerType | ''
  powerKw: number
  pricePerHour: number
  amenities: string[]
  photos: (string | null)[] // data URL, 'sample', or empty
  days: ({ start: string; end: string } | null)[] // index = weekday (0 = Sunday)
  confirm: boolean
}

export const WEEKDAYS_DEFAULT = Array.from({ length: 7 }, (_, d) => (d >= 1 && d <= 5 ? { start: '08:30', end: '19:00' } : null))

export function emptyDraft(): ApplicationDraft {
  return {
    step: 1, title: '', address: '', district: '', propertyType: '', lat: null, lng: null,
    chargerType: '', powerKw: 7.4, pricePerHour: 25, amenities: [], photos: [null, null, null], days: WEEKDAYS_DEFAULT, confirm: false,
  }
}

export function draftFromSpot(s: Spot): ApplicationDraft {
  return {
    spotId: s.id, step: 1, title: s.title, address: s.address, district: s.district, propertyType: s.propertyType,
    lat: s.lat, lng: s.lng, chargerType: s.chargerType, powerKw: s.powerKw, pricePerHour: s.pricePerHour,
    amenities: s.amenities, photos: [0, 1, 2].map((i) => s.photos?.[i] ?? null),
    days: Array.from({ length: 7 }, (_, d) => {
      const w = s.availability.find((x) => x.day === d)
      return w ? { start: w.start, end: w.end } : null
    }),
    confirm: true,
  }
}

// ── Draft persistence (per window, survives a reload) ──
const draftKey = () => `pp.apply.${window.name || 'main'}`
export function loadDraft(): ApplicationDraft | null {
  try {
    const raw = sessionStorage.getItem(draftKey())
    return raw ? (JSON.parse(raw) as ApplicationDraft) : null
  } catch {
    return null
  }
}
export function saveDraft(d: ApplicationDraft | null) {
  try {
    if (d) sessionStorage.setItem(draftKey(), JSON.stringify(d))
    else sessionStorage.removeItem(draftKey())
  } catch {
    /* draft stays in memory only */
  }
}

// ── Validation per step ──
export type StepErrors = Partial<Record<keyof ApplicationDraft | 'photos' | 'days', string>>

export function validateStep(d: ApplicationDraft, step: 1 | 2 | 3): StepErrors {
  const e: StepErrors = {}
  if (step === 1) {
    const t = d.title.trim().length
    if (t < 5 || t > 60) e.title = 'Give your bay a title of 5–60 characters'
    const a = d.address.trim().length
    if (a < 5 || a > 120) e.address = 'Enter the address (5–120 characters)'
    if (!d.district) e.district = 'Choose a district'
    if (!d.propertyType) e.propertyType = 'Choose the property type'
    if (d.lat == null || d.lng == null) e.lat = 'Drag the pin to your bay'
  } else if (step === 2) {
    if (!d.chargerType) e.chargerType = 'Choose the connector type'
    if (!POWER_OPTIONS.includes(d.powerKw)) e.powerKw = 'Choose the charger power'
    if (d.pricePerHour < 20 || d.pricePerHour > 35) e.pricePerHour = 'Price must be HK$20–35'
  } else {
    if (!d.photos.some(Boolean)) e.photos = 'Add at least one photo'
    if (!d.days.some(Boolean)) e.days = 'Choose at least one day'
    else if (d.days.some((w) => w && w.end <= w.start)) e.days = 'End time must be after start time'
    if (!d.confirm) e.confirm = 'Please confirm you have the right to rent out this bay'
  }
  return e
}

/** Submit (or resubmit) → spot saved as in_review, inactive, not on the map. */
export function submitApplication(ownerId: string, d: ApplicationDraft): { ok: true; spot: Spot } | { ok: false; reason: string } {
  for (const step of [1, 2, 3] as const) if (Object.keys(validateStep(d, step)).length) return { ok: false, reason: `Step ${step} has errors` }
  const db = getDB()
  const existing = d.spotId ? db.spots.find((s) => s.id === d.spotId && s.ownerId === ownerId) : undefined
  const availability: AvailabilityWindow[] = d.days.flatMap((w, day) => (w ? [{ day, ...w }] : []))
  const photos = d.photos.filter((p): p is string => !!p)
  const spot: Spot = {
    id: existing?.id ?? id('sp'),
    ownerId,
    title: d.title.trim(),
    address: d.address.trim(),
    district: d.district as District,
    propertyType: d.propertyType as Spot['propertyType'],
    lat: d.lat!,
    lng: d.lng!,
    pricePerHour: d.pricePerHour,
    chargerType: d.chargerType as ChargerType,
    powerKw: d.powerKw,
    rating: existing?.rating ?? 5,
    reviewsCount: existing?.reviewsCount ?? 0,
    photoSeed: existing?.photoSeed ?? db.spots.length,
    photoCount: photos.length,
    photos,
    amenities: d.amenities,
    availability,
    accessPin: existing?.accessPin ?? '',
    instructions: existing?.instructions ?? '',
    active: false,
    reviewStatus: 'in_review',
    reviewNote: undefined,
  }
  updateDB((x) => ({ ...x, spots: existing ? x.spots.map((s) => (s.id === spot.id ? spot : s)) : [...x.spots, spot] }))
  return { ok: true, spot }
}

// ── Platform (admin) decisions — simulated from the demo sheet ──
function patchSpot(spotId: string, patch: Partial<Spot>) {
  updateDB((x) => ({ ...x, spots: x.spots.map((s) => (s.id === spotId ? { ...s, ...patch } : s)) }))
}
export function platformApprove(spotId: string) {
  const s = getDB().spots.find((x) => x.id === spotId)
  if (!s || s.reviewStatus !== 'in_review') return false
  patchSpot(spotId, { reviewStatus: 'approved', reviewNote: undefined, active: false })
  return true
}
export function platformRequestChanges(spotId: string, note = CHANGES_NOTE) {
  const s = getDB().spots.find((x) => x.id === spotId)
  if (!s || s.reviewStatus !== 'in_review') return false
  patchSpot(spotId, { reviewStatus: 'changes_requested', reviewNote: note, active: false })
  return true
}

/** Approved but not live yet (needs access code + payment info). */
export const awaitingSetup = (s: Spot) => s.reviewStatus === 'approved' && !s.active && !s.accessPin

/** Finish setup → access code, payout method → live on the map. */
export function goLive(
  spotId: string,
  ownerId: string,
  input: { pin: string; instructions: string; payoutMethod: NonNullable<User['payoutMethod']> },
): { ok: true } | { ok: false; reason: string } {
  const s = getDB().spots.find((x) => x.id === spotId && x.ownerId === ownerId)
  if (!s) return { ok: false, reason: 'Spot not found' }
  if (s.reviewStatus !== 'approved') return { ok: false, reason: 'This spot hasn’t been approved yet' }
  const pinErr = validatePin(input.pin)
  if (pinErr) return { ok: false, reason: pinErr }
  if (input.instructions.trim().length < 5) return { ok: false, reason: 'Add short access instructions' }
  if (/\d{5,}/.test(input.payoutMethod.label)) return { ok: false, reason: 'Payout method must be masked' }
  updateDB((x) => ({
    ...x,
    spots: x.spots.map((sp) => (sp.id === spotId ? { ...sp, accessPin: input.pin, instructions: input.instructions.trim().slice(0, 200), active: true } : sp)),
    users: x.users.map((u) => (u.id === ownerId ? { ...u, payoutMethod: input.payoutMethod } : u)),
  }))
  return { ok: true }
}
