# :dart: Tools for Autodarts v2.4.0 :dart:

### :rotating_light: Important — Autodarts moved to autodarts.com
Autodarts has changed its address from **autodarts.io** to **autodarts.com**. This release moves the entire extension over to the new domain.

**Without this update the extension will stop working**, because the old address now simply redirects to the new one — and the extension doesn't recognise the new site yet.

### :closed_lock_with_key: You'll be asked to approve permissions once
Because the extension now needs access to `play.autodarts.com` instead of the old address, your browser will ask you to confirm this **one time** after updating:

- **Chrome / Edge** — the extension stays paused until you accept the new permissions. Check the puzzle-piece icon in the toolbar, or open `chrome://extensions`
- **Firefox** — accept the permission prompt shown after the update
- **Safari (iOS / macOS)** — allow the extension on **autodarts.com** in Safari's extension settings (per-site access or *Allow on Every Website*)

This is completely normal for a domain change and won't happen again. **Your settings, sounds, animations and WLED presets all carry over untouched** — nothing needs to be set up again.

### :arrows_counterclockwise: What changed

:globe_with_meridians: **Everything now runs on autodarts.com**
Match and lobby pages, Quick Correction, board and match data, live board images, and login handling all point at the new domain.

### :wrench: Fixes

:loud_sound: **`opponent_throw` Sound FX no longer fires for players sharing your board**
If a friend plays on your board using their own Autodarts account, their throws are no longer treated as a remote opponent's — so the sound no longer doubles up with the throw noise coming from your physical board. The trigger now only fires for opponents actually playing on a different board.
_(Reported in #170 by @a-jey)_

### :handshake: Community
Thanks to **@a-jey** for reporting the `opponent_throw` issue! :tada:

---

Please report any bugs in
:flag_de: https://discord.com/channels/802528604067201055/1255293632110530612/1255293632110530612
:flag_gb: https://discord.com/channels/802528604067201055/1255293651756650616/1255293651756650616
or on GitHub: <https://github.com/creazy231/tools-for-autodarts/issues>

_Updates getting rolled out right now. Keep an eye on the GitHub page for the status of each browser:_ <https://github.com/creazy231/tools-for-autodarts/tree/main?tab=readme-ov-file#tools-for-autodarts>
