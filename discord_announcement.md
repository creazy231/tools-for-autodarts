# :dart: Tools for Autodarts v2.2.8 :dart:

### :new: What's new

:video_game: **Gotcha Helper**
Shows how many points the other players are ahead in Gotcha game variant — including the dart throw needed to catch up (e.g. `+15`, `D10`, `T20`, `BULL`).

:speaking_head: **Text-to-Speech (TTS)**
Generate caller and sound FX audio directly from text using your device's built-in voices! Select a voice, adjust speed & pitch, preview before saving — settings are remembered across sessions.

:bulb: **More Board Event Triggers**
New triggers for Caller, Sound FX, and WLED:
- Caller & Sound FX: `board_started`, `board_stopped`, `manual_reset_done`, `takeout_finished`, `calibration_started`, `calibration_finished`
- WLED: `board_starting`, `board_stopping`, `throw`, `last_throw`, `takeout_finished`

### :wrench: Fixes
- Fixed animation triggers playing incorrectly when busted on last throw
- Fixed Automatic Next Leg countdown not cleaning up properly between legs
- Fixed WLED CSV import parsing

### :handshake: Community
Thanks to **@MeisterBob** for contributing the Gotcha Helper, WLED board events, and WLED CSV import fix! :tada:

---

Please report any bugs in
:flag_de: https://discord.com/channels/802528604067201055/1255293632110530612/1255293632110530612
:flag_gb: https://discord.com/channels/802528604067201055/1255293651756650616/1255293651756650616
or on GitHub: <https://github.com/creazy231/tools-for-autodarts/issues>

_Updates getting rolled out right now. Keep an eye on the GitHub page for the status of each browser:_ <https://github.com/creazy231/tools-for-autodarts/tree/main?tab=readme-ov-file#tools-for-autodarts>
