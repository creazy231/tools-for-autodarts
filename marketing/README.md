# Store listing images

Screenshots and promo tiles for the Chrome Web Store and Firefox Add-ons (AMO), taken on the
rebuilt autodarts site with 3.0.8. Every file is already at the size its store asks for, as a
PNG with no transparency, so it can be uploaded as it is.

They show the features people use every day rather than the newest ones: the match screens are
on autodarts' own board and in its own colours.

The screenshots for the App Store (the iPhone and Mac Safari apps) are in `app-store/`; see
[App Store](#app-store-iphone-and-mac) below.

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

## App Store (iPhone and Mac)

`app-store/` holds the screenshots for the Safari apps, taken with 3.0.9: six for iPhone, in two
sizes, and seven for Mac. The App Store has no caption field, so each image carries its own headline, drawn
in the promo tiles' Bebas Neue and Manrope on the marquee tile's blue. The iPhone shots sit in an
iPhone 17 Pro Max with Safari's status and address bars; the Mac shots sit in a Safari window.
Quick Correction is left out, because Safari doesn't have it.

Every file is a PNG at the size App Store Connect asks for, with no transparency and an sRGB
profile. `asc screenshots validate` passes all three sets (`--device-type IPHONE_69`,
`IPHONE_65` and `DESKTOP`).

### iPhone

The same six shots come in two sizes, one for each iPhone slot App Store Connect accepts as the
main one:
- `app-store/iphone-6.9/`: 1320×2868, for the 6.9" Display slot.
- `app-store/iphone-6.5/`: 1284×2778, for the 6.5" Display slot. It is the same page rendered at
  1284/1320 scale, so the text is drawn at that size rather than resampled.

| File | Headline | Subline |
|---|---|---|
| `01-match-screen.png` | Every dart up close | Darts Zoom shows where each dart landed, right under the score |
| `02-caller.png` | Your own caller | Scores, checkouts and game events, called out loud |
| `03-lobby.png` | Start games faster | Your saved players, one tap away |
| `04-settings.png` | Everything in one place | Switch any feature on or off with one tap |
| `05-leg-won.png` | Celebrate every leg | A winner animation, then the next leg starts itself |
| `06-takeout.png` | Takeout at a glance | A clear sign while the darts are being pulled |

### Mac (2880×1800)

| File | Headline | Subline |
|---|---|---|
| `app-store/mac/01-match-screen.png` | Every dart up close | Darts Zoom and the points above every throw |
| `app-store/mac/02-caller.png` | Your own caller | Scores, checkouts and game events, called out loud |
| `app-store/mac/03-streaming-mode.png` | Ready to stream | The board and a scoreboard on a green screen |
| `app-store/mac/04-lobby.png` | Start games faster | Saved players, a QR code to join and Auto Start |
| `app-store/mac/05-settings.png` | Everything in one place | Switch any feature on or off with one click |
| `app-store/mac/06-leg-won.png` | Celebrate every leg | A winner animation, then the next leg starts itself |
| `app-store/mac/07-takeout.png` | Takeout at a glance | A clear sign while the darts are being pulled |

### Uploading

- Screenshots can't be changed while a version is in review, and both 3.0.8 versions were
  Waiting for Review on 2026-09-26. So these go on the next version of each app.
- **iPhone:** App Store Connect checks every file against the slot it is dropped into, and turns
  the wrong size away ("Mindestens ein Screenshot weist falsche Maße auf", with that slot's sizes).
  - The 6.5" Display slot, which holds the listing's three v1-site screenshots, takes
    `iphone-6.5/`. Delete the three old ones, then drop in the six in order.
  - The 6.9" Display slot takes `iphone-6.9/`.
  - Either set on its own is enough: Apple asks for 6.9" or 6.5" and fills the smaller iPhones
    from what is there. Filling both gives the largest phones a sharper picture.
  - The 5.5" set in Media Manager is v1-site screenshots too. Delete it, or those phones keep
    showing the old site.
- **iPad:** the 13", 12.9" and 11" sets are v1-site screenshots too. Nothing here replaces them.
- **Mac:** replace the three v1-site screenshots with the seven.

### Requirements (checked 2026-09-26)

From Apple's [screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/):
- iPhone 6.9": 1260×2736, 1290×2796 or 1320×2868 portrait. iPhone 6.5": 1242×2688 or 1284×2778
  portrait. One of the two is required. Smaller iPhones show scaled screenshots when they have
  none of their own.
- Mac: 1280×800, 1440×900, 2560×1600 or 2880×1800 (16:10). Required for a Mac app.
- 1 to 10 per set, PNG or JPEG, no alpha.

### How they were made

**iPhone.** Taken in a background tab of the `yarn dev` Chrome, emulating an iPhone 17 Pro Max:
440×796 CSS px at 3×, with touch and an iOS Safari user agent. 796 px is the height iOS 26 Safari
gives a page while its toolbar shows, measured with a test page in the iOS 26.5 simulator. The
status bar (62 pt) and Safari's bottom bar (98 pt) were drawn from that simulator's screenshots.

The match shots replay one leg between the guests Anna and Tom. Anna scores 100 and 140, Tom 85
and 41, then Anna's 180 leaves 81. Tom scores 60, and Anna checks out with T19 and D12.

- 01: Darts Zoom alone, top position. Enhanced Scoring Display doesn't draw below 1280 px, so it
  isn't on this one.
- 02: the Caller's library, with twelve text-to-speech lines written in for the picture.
- 03: Recent Local Players and Discord (manual). QR Code and Auto Start stay off here: at phone
  width the pinned QR card covers the Players card's buttons, and the Autostart On/Off pair makes
  the bottom bar wider than the screen.
- 04: the settings page's Matches tab, with Takeout Notification, Automatic Next Leg and Smaller
  Scores on. It is scrolled so that the site's bottom navigation covers a gap between two cards;
  the Tools overlay draws over that navigation.
- 05: Winner Animation and Automatic Next Leg, its countdown set to 30 s for the picture. On narrow
  layouts Winner Animation leaves out its "N DARTS" caption, by design.
- 06: Takeout Notification alone.

**Mac.** 1600×1000 at 2×. 01, 03, 04, 06 and 07 are the raw captures behind the Chrome set above
(3.0.8, and nothing on them has changed since). 02, the Caller's new library, and 05, the settings
page with the Export and Import menus, were taken again with 3.0.9.

**Layout.** The captures come out of the dev Chrome in Display P3, with the profile embedded.
`source/build.py` converts them to sRGB, fills `source/template-iphone.html` or
`source/template-mac.html` for each shot, and `source/render.mjs` renders the pages in a headless
Chromium of Playwright's at the exact size. The headlines are in `source/shots.json`.

```bash
python3 marketing/app-store/source/build.py prepare <captures-dir> <work-dir>
node marketing/app-store/source/render.mjs <work-dir> marketing/app-store
python3 marketing/app-store/source/build.py finish marketing/app-store
```

`<captures-dir>` holds the raw captures under the names in `shots.json`, and `<work-dir>` can be
any empty folder outside the repo. The raw captures aren't kept in the repo (about 30 MB), so
changing a headline means taking them again as described above.

Traces of the account: its avatar in the site header on iPhone 04 and Mac 05, "CREAZY" on the
settings cards' pictures, and "Playing with CREAZY" under the guest on both lobby shots.
