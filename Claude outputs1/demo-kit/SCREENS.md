# Screens for the slides and the report

Every screen exists in two versions:
- `screens/phone/` is the bare phone screen (390×844 at 2× = 780×1688 px);
- `screens/framed/` is the same screen inside a phone bezel on a transparent background, ready to drop onto a slide.

`screens/flow/` has one wide image per flow diagram: `driver-flow.png` (diagram 1), `owner-flow.png` (diagram 2) and `onboarding-flow.png` (diagram 3).

| File | Screen | Flow-diagram step | Caption for the report |
|---|---|---|---|
| 01-landing | Landing | — | The landing page introduces the service: book idle private EV chargers in Hong Kong by the hour, from HK$20. |
| 02-register-validation | Create account (errors) | D1/D3: Register | Registration checks every field live, including a valid email and an 8-digit Hong Kong mobile number. |
| 03-verify-code | Verify code | D1/D3: Register | Every sign-in is confirmed with a 6-digit code sent to the user's phone (simulated in the demo). |
| 04-map | Map home | D1: Search & select a spot | Drivers see available chargers on a map of Hong Kong, each pin showing the hourly price. |
| 05-map-ccs2-preview | Map, filtered + preview | D1: Search & select a spot | Filters narrow the map to a connector type; tapping a spot shows a quick preview. |
| 06-spot-details | Spot details | D1: Platform displays spots with details | Spot details show photos, price, rating and reviews, charger type and power, amenities and opening hours. |
| 07-booking-sheet | Booking sheet | D1: Select time slot | The driver picks a day, a start time and a duration (15 min to 2 h), and sees the price straight away. |
| 08-slot-unavailable | Slot unavailable | D1: Spot available? **No** | If the slot is already taken, the platform says so and suggests the nearest free times. |
| 09-request-pending | Booking status: pending | D1: Submit request → send to owner | The request goes to the owner; the driver pays nothing until it's approved. |
| 10-owner-request | Owner: incoming request | D2: Receive request (with driver rating) | Owners see who is asking, with the driver's rating and car, and exactly what they will earn. |
| 11-booking-approved | Booking status: approved | D1/D2: Owner approves? Yes → driver notified | When the owner approves, the driver's phone updates live and asks for payment. |
| 12-payment-declined | Payment declined | D1/D2: Payment successful? **No** | A declined card stops the booking; the driver can try another card. |
| 13-access-qr-pin | Access: QR + PIN | D1: Provide access method | After payment, the driver gets a QR code and the gate PIN for the bay. |
| 14-charging | Charging session | D1: Live charging data, state of charge | During charging, the app shows battery level, energy delivered, time left and power. |
| 15-session-complete | Session complete | D1: Booking session complete | The session summary confirms energy delivered and the amount paid. |
| 16-rate | Rate & review | D1: Rate and review | Drivers rate the spot, and their reviews build trust for future bookings. |
| 17-owner-earnings-breakdown | Owner earnings | D2: Bill minus 15–20% commission + gateway fee | Each booking shows the business model: HK$30.00 − 18% platform fee − 3% payment fee = HK$23.70 to the owner. |
| 18-withdraw-success | Withdraw | D2: Net payout to bank/FPS | Owners withdraw their balance to FPS or a bank account. |
| 19-owner-scheduler | Availability scheduler | Proposal: weekly availability | Owners set the weekly hours when their bay is free, e.g. weekdays while they are at work. |
| 20-onboarding-welcome | New-owner home | D3: Register an account | A new owner is invited to list their charger and earn HK$20–35 per hour. |
| 21-onboarding-step1 | Application, step 1 | D3: Application with spot information | The application collects the bay's title, address, district, property type and exact location. |
| 22-onboarding-photos-hours | Application, step 3 | D3: …with charging spot photos | Owners add photos and opening hours before submitting. |
| 23-application-received | Application received | D3: Approve application? (in review) | Plug & Park reviews every bay before it goes on the map. |
| 24-finish-setup | Finish setup | D3: Provide access code and payment information | After approval, the owner adds the gate PIN and payout details. |
| 25-live-on-driver-map | Live on the map | D3: Add charging spot to the platform | The new charger appears on drivers' maps immediately. |
