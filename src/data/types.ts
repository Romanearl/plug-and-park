// Core data model for the Plug & Park demo.
// Everything lives in the browser (localStorage) — there is no backend.

export type Role = 'driver' | 'owner'

export type ChargerType = 'Type 2' | 'CCS2' | 'CHAdeMO' | 'GB/T'

export type District =
  | 'Sai Kung'
  | 'Yuen Long'
  | 'Kwun Tong'
  | 'Kowloon Bay'
  | 'Tsuen Wan'
  | 'Kwai Chung'
  | 'Sha Tin'
  | 'Tuen Mun'
  | 'Wan Chai'
  | 'Tai Po'

export interface User {
  id: string
  role: Role
  name: string
  email: string
  /** Fake hash — NEVER a real password store. Demo only. */
  passwordHash: string
  phone?: string
  verified: boolean
  /** Average rating given to this user by the other side (driver rating is shown to owners). */
  rating: number
  ratingCount: number
  vehicle?: string
  createdAt: string
}

/** Weekly availability window. day: 0 = Sunday … 6 = Saturday. Times are "HH:MM", 24h. */
export interface AvailabilityWindow {
  day: number
  start: string
  end: string
}

export interface Spot {
  id: string
  ownerId: string
  title: string
  address: string
  district: District
  /** What kind of property — matches the proposal's rollout plan. */
  propertyType: 'Village house' | 'Industrial building' | 'Commercial bay' | 'Residential estate'
  lat: number
  lng: number
  /** HKD per hour, kept within the proposal's HK$20–35 range. */
  pricePerHour: number
  chargerType: ChargerType
  powerKw: number
  rating: number
  reviewsCount: number
  /** Index into the generated illustration palette (real photos are added later). */
  photoSeed: number
  photoCount: number
  amenities: string[]
  availability: AvailabilityWindow[]
  /** Gate / garage PIN revealed only after payment. */
  accessPin: string
  instructions: string
  active: boolean
}

export type BookingStatus =
  | 'pending' // waiting for owner
  | 'declined' // owner said no
  | 'confirmed' // owner approved, waiting for payment
  | 'paid' // paid, access method issued
  | 'active' // charging in progress
  | 'completed' // finished
  | 'cancelled'

export interface Booking {
  id: string
  spotId: string
  driverId: string
  ownerId: string
  /** ISO timestamp of the slot start. */
  start: string
  durationMinutes: number
  /** Total charged to the driver, HKD. */
  price: number
  /** Platform commission, 0.15–0.20 per the business model. */
  commissionRate: number
  status: BookingStatus
  createdAt: string
  updatedAt: string
  paymentLast4?: string
  pin?: string
  qrPayload?: string
  /** kWh delivered — filled in by the simulated charging session. */
  energyKwh?: number
  reviewed?: boolean
  /** Why the owner (or the platform re-check) declined. */
  declineReason?: string
}

export interface Review {
  id: string
  bookingId: string
  spotId: string
  driverId: string
  rating: number
  text: string
  createdAt: string
}

export interface Payout {
  id: string
  ownerId: string
  amount: number
  method: 'FPS' | 'Bank transfer'
  status: 'processing' | 'paid'
  createdAt: string
}

export interface DB {
  version: number
  users: User[]
  spots: Spot[]
  bookings: Booking[]
  reviews: Review[]
  payouts: Payout[]
}
