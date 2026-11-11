# Plug & Park — live demo script (4–5 minutes)

**Setup:** the presenter view shows two phones side by side: the **EV driver** on the left and the **charger owner** on the right. Everything you tap on one phone shows up on the other within a second.

**Live link:** https://romanearl.github.io/plug-and-park/ · **Presenter view:** https://romanearl.github.io/plug-and-park/#/presenter
**Backup video:** `backup-demo.webm` (2 min 36 s) in this folder.

## Before you start (5 minutes before your slot)
- [ ] Open the **presenter view** link above in Chrome on the classroom laptop, then press **F11** for full screen.
- [ ] Click **Reset demo** (under the phones). Both phones go back to the starting data.
- [ ] Browser zoom at **100%** (Ctrl+0). Both phones must fit on screen with the labels "EV DRIVER" and "CHARGER OWNER" visible.
- [ ] Wi-Fi connected. The map tiles need the internet; everything else works offline once the page has loaded.
- [ ] The **backup video** is open in another tab (drag `backup-demo.webm` into a Chrome tab), paused at 0:00.
- [ ] Your phone is on silent, and notifications on the laptop are off (Focus Assist).
- [ ] Have the **QR code slide** (`qr-slide.png`) ready as the next slide.

## The demo
| Time | What to click (exact names) | What the audience sees | What to say | Flow-diagram step |
|---|---|---|---|---|
| 0:00 | (Already reset.) Point at both phones. | Driver: a map of Hong Kong with price pins. Owner: "Hi, Mei Ling", one request waiting. | "On the left is Chan Tai Man, an EV driver. On the right is Mei Ling, who owns an idle charger in Kwun Tong." | — |
| 0:15 | Driver: tap the **CCS2** chip at the top. | Only 3 pins are left. | "Drivers filter by connector type — here, fast CCS2." | D1: Search & select a spot |
| 0:30 | Driver: in the list, tap **Industrial building bay — Hoi Bun Road**, then **View details**. | Photos, HK$30 per hour, 4.8 stars (54 reviews), CCS2 · 50 kW, opening hours, host. | "Every spot shows its price, charger type, hours and reviews." | D1: Platform displays spots with details |
| 0:55 | Driver: **Request booking** → **Tomorrow** → **10:00** → **1 h** → **Request booking · HK$30**. | "Checking availability…", then an amber box: **This slot is no longer available**, with nearby times. | "The platform checks availability. 10 o'clock is already taken — that's the 'No' branch in our diagram." | D1: Spot available? **No** |
| 1:20 | Driver: tap **13:00** in the time grid → **Request booking · HK$30**. | "Waiting for Wong Mei Ling to approve". | "13:00 is free, so the request goes to the owner. The driver pays nothing yet." | D1: Submit request → send to owner |
| 1:35 | Owner: point at the new card at the top (**Chan Tai Man ★ 4.9 · Tesla Model Y**, "You earn HK$23.70"). Tap **Approve**. | Owner: "Approved — the driver has been notified". Driver phone flips to **Approved! Pay to confirm** on its own, with a toast at the top. | "Owners decide based on the driver's rating. One tap — and the driver's phone updates live." | D1/D2: Owner approves? Yes → driver notified |
| 2:00 | Driver: **Pay HK$30** → **Use test card** → replace the card number with **4000 0000 0000 0002** → **Pay HK$30**. | "Processing…", then the red **Your card was declined. Try another card.** | "If the payment gateway declines the card, the booking isn't confirmed — the second 'No' branch." | D1/D2: Payment successful? **No** |
| 2:20 | Driver: **Use test card** → **Pay HK$30**. | **You're booked!** with a QR code and gate PIN **7 3 5 0**, plus access instructions. | "Payment goes through, and only now does the driver get the QR code and PIN to open the gate." | D1: Provide access method (QR/PIN) |
| 2:40 | Driver: **I've arrived — start charging**. | "Verifying access…", then a blue ring counting up: battery %, kWh, time left, power. The owner sees **Charging now**. | "In the real product this data comes from the charger. The demo runs a 1-hour session in 25 seconds." (Talk over the wait.) | D1: Start charging, live data, state of charge |
| 3:10 | Driver: **Rate your experience** → tap the **5th star** → **Fast charging** → **Submit review**. | "Thanks for your review!" | "Reviews feed the spot's rating, which builds trust for the next driver." | D1: Session complete → rate & review |
| 3:30 | Owner: tap **Earnings** (bottom bar). Tap the top transaction (**Chan Tai Man**). | The breakdown: **HK$30.00 − Plug & Park fee (18%) HK$5.40 − Payment processing (3%) HK$0.90 = You receive HK$23.70**. | "This is our business model: the platform keeps 18%, the payment fee is 3%, and the owner keeps HK$23.70 for an hour of an idle bay." | D2: Escrow → bill minus commission + gateway fee |
| 4:00 | Owner: scroll up → **Withdraw** → **Withdraw HK$117.71**. | "HK$117.71 on its way — usually within minutes via FPS". A few seconds later the payout row turns **Paid**. | "Owners cash out to FPS or their bank." | D2: Net payout via bank/FPS |
| 4:20 | Switch to the **QR code slide**. | "Try it now" + a big QR code. | "Scan it — the demo logins are in the blue 'Demo' strip at the top of the app." | — |

**Optional if you have 30 extra seconds:** on the driver phone, tap **Account** → **Sign out** → **Get started** and type a wrong email, to show the live form validation (registration), then go back with **Reset demo**.

## Short version (2 minutes)
1. Driver: **CCS2** → **Industrial building bay — Hoi Bun Road** → **View details** → **Request booking** → **Tomorrow** → **13:00** → **1 h** → **Request booking · HK$30**.
2. Owner: **Approve** (the driver's phone flips live).
3. Driver: **Pay HK$30** → **Use test card** → **Pay HK$30** → the QR code and PIN.
4. Driver: **I've arrived — start charging**, then tap the blue **Demo** strip → **Skip charging to the end**.
5. Owner: **Earnings** → tap the top transaction → the 18% + 3% breakdown.
6. The QR slide.

## If something goes wrong
| Problem | Do this |
|---|---|
| The map is grey or blank (no tiles) | Keep going: the list under the map works. If the app shows "Map unavailable — showing list", that's expected. |
| A phone is in the wrong state or shows old data | Click **Reset demo** under the phones (it resets both), then start again from 0:15. |
| You tapped the wrong thing | Use the round **←** back button at the top left of that phone. |
| The driver's phone didn't flip after Approve | Wait 1 second; if still nothing, tap **Bookings** on the driver phone and open the booking. |
| No internet at all, or the page won't load | Switch to the **backup video** tab and press play. Narrate over it with the same lines. |
| Running out of time | Jump to the **Short version** above, or skip the charging wait with **Demo → Skip charging to the end**. |
