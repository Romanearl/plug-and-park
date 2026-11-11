// Seed data for the demo. Loaded on first visit and on "Reset demo".
// Dates are generated relative to *now*, so the demo always looks current.

import type { AvailabilityWindow, Booking, DB, Review, Spot, User } from './types'
import { addMinutes, dayAt, fakeHash } from '../lib/util'

export const DB_VERSION = 3 // 2: Booking.declineReason (S4) · 3: paidAt / startedAt / completedAt (S5)

export const DEMO_PASSWORD = 'Demo1234!'
export const DEMO_OTP = '123456'

export const DEMO_ACCOUNTS = {
  driver: { email: 'driver@plugpark.demo', userId: 'u_driver_demo' },
  owner: { email: 'owner@plugpark.demo', userId: 'u_owner_demo' },
} as const

export const DEMO_CARDS = {
  success: '4242 4242 4242 4242',
  decline: '4000 0000 0000 0002',
} as const

/** Platform commission (proposal: 15–20%). */
export const COMMISSION_RATE = 0.18

const WEEKDAYS_9_TO_7: AvailabilityWindow[] = [1, 2, 3, 4, 5].map((day) => ({ day, start: '08:30', end: '19:00' }))
const EVERY_DAY = (start: string, end: string): AvailabilityWindow[] =>
  [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, start, end }))
const WEEKENDS = (start: string, end: string): AvailabilityWindow[] => [0, 6].map((day) => ({ day, start, end }))

function users(): User[] {
  const now = new Date().toISOString()
  const pw = fakeHash(DEMO_PASSWORD)
  const u = (x: Omit<User, 'passwordHash' | 'verified' | 'createdAt'>): User => ({
    ...x,
    passwordHash: pw,
    verified: true,
    createdAt: now,
  })
  return [
    u({ id: 'u_driver_demo', role: 'driver', name: 'Chan Tai Man', email: 'driver@plugpark.demo', phone: '+852 9123 4567', rating: 4.9, ratingCount: 23, vehicle: 'Tesla Model Y' }),
    u({ id: 'u_driver_2', role: 'driver', name: 'Lam Chi Keung', email: 'lam.ck@plugpark.demo', rating: 4.6, ratingCount: 11, vehicle: 'BYD Atto 3' }),
    u({ id: 'u_driver_3', role: 'driver', name: 'Sarah Ng', email: 'sarah.ng@plugpark.demo', rating: 4.95, ratingCount: 40, vehicle: 'MG4 Electric' }),
    u({ id: 'u_owner_demo', role: 'owner', name: 'Wong Mei Ling', email: 'owner@plugpark.demo', phone: '+852 6123 9876', rating: 4.8, ratingCount: 57 }),
    u({ id: 'u_owner_2', role: 'owner', name: 'Lee Ka Fai', email: 'lee.kf@plugpark.demo', rating: 4.7, ratingCount: 19 }),
    u({ id: 'u_owner_3', role: 'owner', name: 'Kwok Wing (Wing Fat Industrial)', email: 'kwok.w@plugpark.demo', rating: 4.5, ratingCount: 33 }),
    u({ id: 'u_owner_4', role: 'owner', name: 'Ho Siu Ming', email: 'ho.sm@plugpark.demo', rating: 4.9, ratingCount: 8 }),
  ]
}

function spots(): Spot[] {
  return [
    {
      id: 'sp_saikung_1', ownerId: 'u_owner_demo', title: 'Village house garage — Tai Mong Tsai',
      address: 'Tai Mong Tsai Road, Sai Kung', district: 'Sai Kung', propertyType: 'Village house',
      lat: 22.3868, lng: 114.283, pricePerHour: 25, chargerType: 'Type 2', powerKw: 7.4,
      rating: 4.9, reviewsCount: 31, photoSeed: 0, photoCount: 3,
      amenities: ['Covered', 'Gated', 'Near bus stop'], availability: WEEKDAYS_9_TO_7,
      accessPin: '4821', instructions: 'Blue gate on the left. Enter PIN on the keypad, bay is the one with the charger.', active: true,
    },
    {
      id: 'sp_kwuntong_1', ownerId: 'u_owner_demo', title: 'Industrial building bay — Hoi Bun Road',
      address: 'Hoi Bun Road, Kwun Tong', district: 'Kwun Tong', propertyType: 'Industrial building',
      lat: 22.311, lng: 114.221, pricePerHour: 30, chargerType: 'CCS2', powerKw: 50,
      rating: 4.8, reviewsCount: 54, photoSeed: 1, photoCount: 3,
      amenities: ['DC fast', 'Indoor', '24h security'], availability: EVERY_DAY('07:00', '22:00'),
      accessPin: '7350', instructions: 'Car park entrance on Hoi Bun Rd, level 2, bay B-14. Show QR to the guard.', active: true,
    },
    {
      id: 'sp_kowloonbay_1', ownerId: 'u_owner_3', title: 'Warehouse bay — Wang Chiu Road',
      address: 'Wang Chiu Road, Kowloon Bay', district: 'Kowloon Bay', propertyType: 'Industrial building',
      lat: 22.324, lng: 114.209, pricePerHour: 28, chargerType: 'CCS2', powerKw: 60,
      rating: 4.5, reviewsCount: 22, photoSeed: 2, photoCount: 3,
      amenities: ['DC fast', 'Indoor'], availability: WEEKDAYS_9_TO_7,
      accessPin: '1189', instructions: 'Loading dock entrance, turn right, bay 3.', active: true,
    },
    {
      id: 'sp_yuenlong_1', ownerId: 'u_owner_2', title: 'Village house driveway — Kam Tin',
      address: 'Kam Tin Road, Yuen Long', district: 'Yuen Long', propertyType: 'Village house',
      lat: 22.4436, lng: 114.064, pricePerHour: 20, chargerType: 'Type 2', powerKw: 7,
      rating: 4.7, reviewsCount: 12, photoSeed: 3, photoCount: 2,
      amenities: ['Open air', 'Quiet street'], availability: EVERY_DAY('08:00', '20:00'),
      accessPin: '5502', instructions: 'Second house after the temple. Driveway on the right.', active: true,
    },
    {
      id: 'sp_yuenlong_2', ownerId: 'u_owner_2', title: 'Private garage — Nam Sang Wai',
      address: 'Nam Sang Wai Road, Yuen Long', district: 'Yuen Long', propertyType: 'Village house',
      lat: 22.456, lng: 114.03, pricePerHour: 22, chargerType: 'GB/T', powerKw: 7,
      rating: 4.6, reviewsCount: 9, photoSeed: 4, photoCount: 2,
      amenities: ['Covered', 'Gated'], availability: WEEKENDS('09:00', '18:00').concat(WEEKDAYS_9_TO_7),
      accessPin: '3317', instructions: 'Grey roller door. PIN pad on the right.', active: true,
    },
    {
      id: 'sp_tsuenwan_1', ownerId: 'u_owner_3', title: 'Factory car park — Chai Wan Kok',
      address: 'Chai Wan Kok Street, Tsuen Wan', district: 'Tsuen Wan', propertyType: 'Industrial building',
      lat: 22.372, lng: 114.108, pricePerHour: 26, chargerType: 'CHAdeMO', powerKw: 50,
      rating: 4.4, reviewsCount: 17, photoSeed: 5, photoCount: 3,
      amenities: ['DC fast', 'Indoor', 'Toilet'], availability: WEEKDAYS_9_TO_7,
      accessPin: '6604', instructions: 'G/F car park, bays at the back marked “EV”.', active: true,
    },
    {
      id: 'sp_kwaichung_1', ownerId: 'u_owner_4', title: 'Office tower bay — Kwai Fung Crescent',
      address: 'Kwai Fung Crescent, Kwai Chung', district: 'Kwai Chung', propertyType: 'Commercial bay',
      lat: 22.36, lng: 114.13, pricePerHour: 32, chargerType: 'Type 2', powerKw: 11,
      rating: 4.9, reviewsCount: 6, photoSeed: 6, photoCount: 2,
      amenities: ['Indoor', 'Near MTR', '24h security'], availability: WEEKDAYS_9_TO_7,
      accessPin: '9043', instructions: 'Basement 1, bay 27. Show QR at the barrier.', active: true,
    },
    {
      id: 'sp_shatin_1', ownerId: 'u_owner_demo', title: 'Industrial bay — Fo Tan',
      address: 'Au Pui Wan Street, Fo Tan, Sha Tin', district: 'Sha Tin', propertyType: 'Industrial building',
      lat: 22.396, lng: 114.196, pricePerHour: 24, chargerType: 'Type 2', powerKw: 22,
      rating: 4.7, reviewsCount: 28, photoSeed: 7, photoCount: 3,
      amenities: ['Indoor', 'Near MTR'], availability: EVERY_DAY('08:00', '21:00'),
      accessPin: '2268', instructions: 'Car park level 3, bay 3-08.', active: true,
    },
    {
      id: 'sp_tuenmun_1', ownerId: 'u_owner_4', title: 'Village house garage — San Hui',
      address: 'Tsing Shan Tsuen, Tuen Mun', district: 'Tuen Mun', propertyType: 'Village house',
      lat: 22.394, lng: 113.974, pricePerHour: 20, chargerType: 'Type 2', powerKw: 7,
      rating: 4.8, reviewsCount: 14, photoSeed: 8, photoCount: 2,
      amenities: ['Covered', 'Quiet street'], availability: EVERY_DAY('07:30', '19:30'),
      accessPin: '8126', instructions: 'Green gate, garage on the left.', active: true,
    },
    {
      id: 'sp_wanchai_1', ownerId: 'u_owner_3', title: 'Commercial car park bay — Harbour Road',
      address: 'Harbour Road, Wan Chai', district: 'Wan Chai', propertyType: 'Commercial bay',
      lat: 22.28, lng: 114.173, pricePerHour: 35, chargerType: 'CCS2', powerKw: 60,
      rating: 4.6, reviewsCount: 41, photoSeed: 9, photoCount: 3,
      amenities: ['DC fast', 'Indoor', 'Near MTR', '24h security'], availability: EVERY_DAY('07:00', '23:00'),
      accessPin: '4470', instructions: 'Enter via Harbour Road ramp, level B2, bay 112.', active: true,
    },
    {
      id: 'sp_saikung_2', ownerId: 'u_owner_demo', title: 'Seaside house driveway — Pak Sha Wan',
      address: 'Hiram’s Highway, Pak Sha Wan, Sai Kung', district: 'Sai Kung', propertyType: 'Village house',
      lat: 22.3712, lng: 114.2638, pricePerHour: 23, chargerType: 'Type 2', powerKw: 7.4,
      rating: 5.0, reviewsCount: 7, photoSeed: 10, photoCount: 2,
      amenities: ['Open air', 'Sea view'], availability: WEEKENDS('08:00', '20:00'),
      accessPin: '1937', instructions: 'White house opposite the pier. Park nose-in.', active: true,
    },
    {
      id: 'sp_taipo_1', ownerId: 'u_owner_2', title: 'Industrial estate bay — Tai Po',
      address: 'Dai Kwai Street, Tai Po Industrial Estate', district: 'Tai Po', propertyType: 'Industrial building',
      lat: 22.45, lng: 114.168, pricePerHour: 21, chargerType: 'CHAdeMO', powerKw: 40,
      rating: 4.3, reviewsCount: 10, photoSeed: 11, photoCount: 2,
      amenities: ['DC fast', 'Open air'], availability: WEEKDAYS_9_TO_7,
      accessPin: '7781', instructions: 'Gate 2, bays next to the loading area.', active: true,
    },
  ]
}

function bookings(): Booking[] {
  const now = new Date().toISOString()
  const b = (x: Omit<Booking, 'createdAt' | 'updatedAt'>): Booking => {
    const end = addMinutes(x.start, x.durationMinutes)
    const created = addMinutes(x.start, -24 * 60)
    return {
      ...x,
      createdAt: x.status === 'pending' ? now : created,
      updatedAt: now,
      ...(x.status === 'completed' || x.status === 'paid' ? { paidAt: addMinutes(created, 30) } : {}),
      ...(x.status === 'completed' ? { startedAt: x.start, completedAt: end } : {}),
    }
  }
  return [
    // Already-finished bookings: give the owner dashboard real earnings history.
    b({ id: 'bk_hist_1', spotId: 'sp_kwuntong_1', driverId: 'u_driver_3', ownerId: 'u_owner_demo', start: dayAt(-6, '10:00'), durationMinutes: 60, price: 30, commissionRate: 0.18, status: 'completed', energyKwh: 38.2, reviewed: true, paymentLast4: '4242' }),
    b({ id: 'bk_hist_2', spotId: 'sp_saikung_1', driverId: 'u_driver_2', ownerId: 'u_owner_demo', start: dayAt(-4, '09:30'), durationMinutes: 120, price: 50, commissionRate: 0.18, status: 'completed', energyKwh: 14.1, reviewed: true, paymentLast4: '4242' }),
    b({ id: 'bk_hist_3', spotId: 'sp_shatin_1', driverId: 'u_driver_demo', ownerId: 'u_owner_demo', start: dayAt(-2, '14:00'), durationMinutes: 60, price: 24, commissionRate: 0.18, status: 'completed', energyKwh: 19.5, reviewed: true, paymentLast4: '4242' }),
    b({ id: 'bk_hist_4', spotId: 'sp_kwuntong_1', driverId: 'u_driver_2', ownerId: 'u_owner_demo', start: dayAt(-1, '18:00'), durationMinutes: 30, price: 15, commissionRate: 0.18, status: 'completed', energyKwh: 21.0, reviewed: false, paymentLast4: '4242' }),
    // A request already waiting for the demo owner (so the dashboard is never empty).
    b({ id: 'bk_pending_1', spotId: 'sp_saikung_1', driverId: 'u_driver_3', ownerId: 'u_owner_demo', start: dayAt(1, '15:00'), durationMinutes: 60, price: 25, commissionRate: 0.18, status: 'pending' }),
    // A paid booking that blocks a slot → lets us demo the "spot unavailable" branch.
    b({ id: 'bk_block_1', spotId: 'sp_kwuntong_1', driverId: 'u_driver_2', ownerId: 'u_owner_demo', start: dayAt(1, '10:00'), durationMinutes: 120, price: 60, commissionRate: 0.18, status: 'paid', paymentLast4: '4242', pin: '7350' }),
  ]
}

function reviews(): Review[] {
  const r = (id: string, spotId: string, driverId: string, rating: number, text: string, daysAgo: number): Review => ({
    id, bookingId: '', spotId, driverId, rating, text, createdAt: addMinutes(dayAt(-daysAgo, '12:00'), 0),
  })
  return [
    r('rv_1', 'sp_kwuntong_1', 'u_driver_3', 5, 'Fast charger, easy access, guard was friendly. Will book again.', 6),
    r('rv_2', 'sp_kwuntong_1', 'u_driver_2', 4, 'Great speed. Car park ramp is a bit tight for bigger cars.', 12),
    r('rv_3', 'sp_saikung_1', 'u_driver_2', 5, 'Perfect while hiking in Sai Kung — car was full when I got back.', 4),
    r('rv_4', 'sp_saikung_1', 'u_driver_3', 5, 'Owner gave very clear directions. Quiet and safe.', 20),
    r('rv_5', 'sp_shatin_1', 'u_driver_demo', 5, 'Cheaper than the mall, and no queue.', 2),
    r('rv_6', 'sp_wanchai_1', 'u_driver_3', 4, 'Pricey but super convenient for meetings in Wan Chai.', 9),
    r('rv_7', 'sp_yuenlong_1', 'u_driver_2', 5, 'Lovely owner, slow AC charger but fine for a few hours.', 15),
    r('rv_8', 'sp_tsuenwan_1', 'u_driver_3', 4, 'CHAdeMO works well. Bays are at the very back.', 7),
  ]
}

export function createSeed(): DB {
  return {
    version: DB_VERSION,
    users: users(),
    spots: spots(),
    bookings: bookings(),
    reviews: reviews(),
    payouts: [],
  }
}
