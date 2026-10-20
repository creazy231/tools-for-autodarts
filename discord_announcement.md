# 🎯 Tools for Autodarts v3.4.0 🎯

### 💡 WLED levels up
🎞️ **Animation packs**: ready-made animations for your LED matrix, *Standard* and *Halloween*, in 32 × 8 and 64 × 8. Type your WLED's address, pick a pack and press **Add all**: Tools puts the animations on your WLED and adds their effects, triggers and all, as an effect set of its own. Or add single ones with **+**. Your own presets stay as they are. The packs need WLED 16 or newer on an ESP32.

👀 **Previews**: every effect that plays a preset shows it the way your lights do, read from your own WLED.

🗣️ **Whose turn it is**: the new trigger `next_player`, with `{player}` or `{player_ascii}` in an effect, puts the player's name on your matrix. The README has an effect to import as it is.

🎨 **Keep the player's effect between darts**: with this new option, a player's own colour stays on for their whole visit, between their darts' own effects.

🗂️ **Effect sets**: keep one for Halloween, another for a birthday, and choose which one plays. Animations, the Caller and Sound FX have sets too.

🏠 **No more board IDs**: WLED works out for itself who throws in your room. An effect on `other` plays while anybody else is up.

### 🌐 Online Teams
🙋 Players on their own board join a team themselves: **Play for TEAM RED** in the invitation, **Leave team** on your own row. Four players on four boards can play two against two. Everyone in the lobby needs 3.4.0.

### 🔧 Notable fixes
🔍 **Darts Zoom**'s camera close-ups show their own dart in Safari, and how long they wait for the picture is a new setting, *Picture wait*.

🦊 **WLED**'s preset list works in Firefox, and its play button sends the effect on every press.

📥 A **settings import** no longer gives a sound another sound's recording.

### 🤝 Community
Thanks to **@vert0r** for keeping the player's effect on through their visit *(#267)*, and to all of you in the bug channels 🎉

---

Please report any bugs in
:flag_de: <#1255293632110530612>
:flag_gb: <#1255293651756650616>
or on GitHub, where you'll also find the full changelog.

*Updates getting rolled out right now. Keep an eye on the GitHub page for the status of each browser.*
