# Store listing images

Screenshots and promo tiles for the Chrome Web Store and Firefox Add-ons (AMO), taken on the
rebuilt autodarts site with 3.0.8. Every file is already at the size its store asks for, as a
PNG with no transparency, so it can be uploaded as it is.

They show the features people use every day rather than the newest ones: the match screens are
on autodarts' own board and in its own colours.

## What goes where

| File | Size | Chrome Web Store | Firefox Add-ons |
|---|---|---|---|
| `screenshots/01-match-screen.png` | 1280×800 | Screenshot 1 | Screenshot 1 |
| `screenshots/02-caller.png` | 1280×800 | Screenshot 2 | Screenshot 2 |
| `screenshots/03-streaming-mode.png` | 1280×800 | Screenshot 3 | Screenshot 3 |
| `screenshots/04-lobby.png` | 1280×800 | Screenshot 4 | Screenshot 4 |
| `screenshots/05-settings.png` | 1280×800 | Screenshot 5 | Screenshot 5 |
| `screenshots/06-quick-correction.png` | 1280×800 | — (5 is the limit) | Screenshot 6 |
| `screenshots/07-leg-won.png` | 1280×800 | — | Screenshot 7 |
| `screenshots/08-takeout.png` | 1280×800 | — | Screenshot 8 |
| `promo-tiles/small-promo-tile-440x280.png` | 440×280 | Small promo tile | — |
| `promo-tiles/marquee-promo-tile-1400x560.png` | 1400×560 | Marquee promo tile | — |

The store icon is unchanged: `public/icon/128.png`.

## Captions for Firefox

AMO shows a caption under each screenshot, and asks for the explanation to go there rather than
onto the image.

1. Darts Zoom shows a close-up of every dart, and the Enhanced Scoring Display puts the points above each throw
2. The Caller: voice lines for scores, checkouts and game events, from your own files, predefined sets or text-to-speech
3. Streaming Mode: the board and a scoreboard on a chroma-key background, ready for OBS
4. The lobby with Discord announcements, saved players, a pinned QR code and Auto Start
5. Every feature on one settings page, each switched on or off in one click
6. Quick Correction: fix a wrongly detected dart in two clicks
7. Winner Animation and the Automatic Next Leg countdown after a won leg
8. Takeout Notification: a clear sign while the darts are being pulled

## Requirements (checked 2026-09-24)

**Chrome Web Store** ([images](https://developer.chrome.com/docs/webstore/images),
[store listing](https://developer.chrome.com/docs/webstore/cws-dashboard-listing))
- Screenshots: 1 to 5, 1280×800 (preferred) or 640×400, full bleed with square corners and no
  padding. Shown at 640×400. Google advises against text on them and for saturated colours.
- Small promo tile: 440×280 PNG or JPEG. Listed as required; listings without one are shown
  after those with one.
- Marquee promo tile: 1400×560 PNG or JPEG, optional, only used if the listing is featured.
- Store icon: 128×128 PNG, artwork 96×96 with 16 px of transparent padding.

**Firefox Add-ons** ([create an appealing listing](https://extensionworkshop.com/documentation/develop/create-an-appealing-listing/))
- Screenshots: 1280×800 (the largest size shown), or any size at 1.6:1. No fixed limit on how
  many, but each should show a key feature. Explain in the caption, not on the image.
- One set of screenshots for every language; only the captions can be translated.

## How they were made

Taken in the `yarn dev` Chrome with guest players (Anna and Tom), so no account shows on the
match screens, and with only the features named below switched on. The match shots were laid out
at 1600×1000 and scaled down to 1280×800, which gives the board room between the two 400 px
player columns; at a true 1280 px the site leaves it 352 px.

- 01: Darts Zoom (under the throw display) and Enhanced Scoring Display, during a 180
- 02: the Caller's settings, with voice lines written in for the picture
- 03: Streaming Mode alone, v2 design
- 04: Auto Start (armed, one player seated so it waits), QR Code, Discord (manual), Recent Local Players
- 05: the settings page's Matches tab, with Takeout Notification, Automatic Next Leg and Smaller Scores on
- 06: Quick Correction alone, opened on the third dart
- 07: Enhanced Scoring Display, Winner Animation and Automatic Next Leg
- 08: Takeout Notification alone

The promo tiles were drawn as HTML on the site, in its own Bebas Neue and Manrope. Their
dartboard is drawn from scratch, with no maker's name on it; the marquee's screenshot is 01.

Two things of the account still show: its avatar in the site header on 05, and "Playing with
CREAZY" under the guest on 04.
