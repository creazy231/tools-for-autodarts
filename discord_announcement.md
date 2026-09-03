# 🎯 Tools for Autodarts v3.0.4 🎯

### 🚨 Autodarts rebuilt their site — so is the extension
The new design is live on **play.autodarts.com**, and every feature had to be ported to it. **Without this update almost nothing works** — the old version is looking for a page that no longer exists.

Good news: **no new permissions to approve**, and **your settings, sounds, animations and WLED presets carry over** — bar two that changed meaning, listed below.

### ✨ New

📹 Board View — start every game, bull-off included, on the camera or the drawn board you actually want to see. Autodarts' own button only cycles; this presses it until yours comes up.

🔍 Darts Zoom, reworked — a new On Board mode zooms Autodarts' own board in on each dart and adds nothing to the screen at all. **Bottom** and **Top** draw close-ups taken live from the site's board, so they stay sharp at any size. Bottom is the new default.

🔇 Quiet Own Darts — Autodarts plays a thud for every dart that lands anywhere. This silences the ones you can already hear and keeps everybody else's, so a remote opponent's thud actually means something. Its switch is in Autodarts' own sound settings, under *Dart landed*.

### 🔄 Reworked

📺 Streaming Mode is back, and no longer needs a board camera — the board is copied live from Autodarts' own, darts and all. There's a second scoreboard **Design** drawn from the site's own look, and the scoreboard now keeps its seating order and fits any window size.

🎯 **Gotcha** finally gets checkout help. Autodarts works out a route for X01 only, so the extension does it for Gotcha — shown on your card, announced by the Caller — plus a helper marking every player you could knock back.


⏪ **Instant Replay** plays a real clip now instead of a live feed running seconds behind — and it never needed a board, just your webcam.

👥 **Recent Local Players** — saved guest names now appear as a strip under the lobby's player list, one click to add, and the six-name cap is gone.

🎨 **Settings page** rebuilt in Autodarts' own design language, and it no longer flashes the whole grid when you change something. New releases now open a short What's New summary the first time you visit it.

### ⚠️ Worth a look before your next match
- **Instant Replay**'s *Delay* is now *Start delay* and means something different — it starts fresh at 3 seconds
- **Darts Zoom**'s *Center* position is gone, and its hold time is in milliseconds now
- **Shuffle Players** and **Hide Menu In Match** were removed — the rebuilt site does both itself

### 🔧 Notable fixes
- 🔒 Published builds no longer write anything to the browser console *(#236)*
- Gameshot and Winner animations mark the **right** player, in every layout and window size
- **Removing Darts…** no longer appears when nobody is taking any darts out
- Following a board works again, so match features run while you watch someone play
- WLED board filtering and the lobby in/out effects fire again
- Sound FX lobby join/leave sounds fire again
- Animations on `s25` (the outer bull) work, combinations included
- Auto Next Player no longer opens the camera instead of pressing Next
- Hopping from one lobby straight into another no longer leaks watchers

🗣️ **Caller** — *Prefer combined throws* stops a visit being called twice when it has its own combination sound, plus a new `bulloff` trigger.
### 🤝 Community
Huge thanks to **@minefubi** *(#220)*, **@driesbellen** *(#223)*, **@teppumteppum** *(#232)*, **@auajax** *(#228)*, **@MaB-MaN** *(#230)* and **@cameronbol** *(#234)* for the reports, diagnoses and pull requests behind this one 🎉

---

Please report any bugs in <#1255293632110530612> 🇩🇪 or <#1255293651756650616> 🇬🇧, or on GitHub: <https://github.com/creazy231/tools-for-autodarts/issues>

Full changelog: <https://github.com/creazy231/tools-for-autodarts/blob/main/CHANGELOG.md>
