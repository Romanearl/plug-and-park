# How the Plug & Park prototype works (for the team and for Q&A)

## What it is
A clickable phone app that runs in any browser at https://romanearl.github.io/plug-and-park/. It shows the full journey from our three flow diagrams: a driver finds and books a private charger, the owner approves, the driver pays, gets a QR code and PIN, charges and leaves a review, and the owner gets paid. It also covers a new owner listing a charger. There is no server: all data lives in the browser, which is why it's free to host and works on any phone.

## What's simulated, and what's real
| Simulated (looks real, but is faked) | Real (actually works as described) |
|---|---|
| **Login codes:** the SMS code is always `123456`; no SMS is sent. | **Form validation:** email, HK mobile number, password rules, card number checks (Luhn), expiry and CVC. |
| **Payments:** no money moves. Test card `4242…` succeeds; `4000 0000 0000 0002` is declined on purpose. Only the last 4 digits are kept. | **Booking logic:** availability windows, conflict checks (a taken slot can't be booked twice), and suggested free times. |
| **Charger data:** the charging session is an animation (a 1-hour session plays in 25 seconds). | **Commission maths:** 18% platform fee and 3% payment fee on every booking, the owner's balance, money held until the session ends, and withdrawals. |
| **Payouts:** "Withdraw" shows Processing, then Paid after about 8 seconds; no bank is contacted. | **Live two-phone sync:** an action on one phone appears on the other within a second (the presenter view). |
| **The platform's approval** of new owners is a button in the Demo sheet. | **The map:** real OpenStreetMap data, real Hong Kong coordinates for every spot. |
| **Photos** are generated illustrations until real ones are added. | **Reviews and ratings** update the spot's average. |

## How it would work in a real product (one line each)
- **Payment gateway:** a licensed provider (e.g. a card/FPS gateway) holds the driver's payment in escrow and releases it after the session.
- **Charger data:** the charger reports energy and status over **OCPP**, the standard protocol for EV chargers.
- **SMS codes:** a messaging provider sends real one-time codes.
- **Backend and database:** a server stores users, spots and bookings, and pushes live updates to both phones.
- **Payouts:** automatic bank transfer or FPS payout to owners after each session (or weekly).

## The business numbers in the app
- Price range: **HK$20–35 per hour**, set by each owner.
- Platform commission: **18%** (inside the 15–20% range in our proposal).
- Payment processing fee: **3%**.
- **Worked example:** a 1-hour booking at HK$30 → Plug & Park keeps HK$5.40 (18%) → payment fee HK$0.90 (3%) → **the owner receives HK$23.70**.
- The money is held until the session ends ("Held until sessions end"), then becomes "Available to withdraw".

## Likely questions — short answers
| Question | Answer |
|---|---|
| What if an owner doesn't reply? | In the prototype the request waits and the driver can cancel at any time. *Product idea:* requests expire after e.g. 15 minutes, and drivers are offered similar nearby spots. |
| What if a driver overstays? | Bookings have a fixed end time. *Product idea:* an overstay fee per extra 15 minutes, charged to the card on file, plus a reminder notification 10 minutes before the end. |
| How is the charger access secured? | The QR code and gate PIN are shown **only after payment**, and only to that driver. Owners can change the PIN at any time. *Product idea:* one-time PINs that work only during the booked slot. |
| Why would owners trust strangers? | Owners see each driver's rating before approving, and they approve every booking. Payment is guaranteed before access is given. *Product idea:* ID-verified drivers and damage insurance. |
| How is this different from existing charging apps? | Existing apps list public and commercial chargers. We unlock **idle private** chargers (village houses, industrial buildings) that sit unused 8–10 hours a day — a supply that isn't on any map today. |
| Why 18%? | Within the 15–20% range of comparable peer-to-peer platforms; high enough to fund payments, support and insurance, low enough that owners keep about 79%. |
| Does it work on my phone? | Yes. Scan the QR code; it runs in the browser. You can also "Add to Home Screen" so it opens like an app. |

## Credits
- Map data © **OpenStreetMap** contributors. (The plan named CARTO tiles; they now require an API key, so the app uses OpenStreetMap's standard tiles.)
- Map library: **Leaflet** (with react-leaflet). Fonts: **Inter** and **Libre Caslon Text** (Google Fonts). QR codes: the `qrcode` library.
- Built with **React, TypeScript and Vite**; hosted on **GitHub Pages**.
- The prototype was built with AI assistance (Claude), which the course allows; the product idea, flows and business model are the team's.
