# :dart: Tools for Autodarts v2.2.7 Released! :dart:

### :bug: Bug Fixes
- **Authentication**: Completely reworked how the extension captures your login token — it now intercepts the Keycloak token endpoint directly, making auth reliable again across all features
- **Quick Correction**: Fixed API calls that were failing due to a missing `Bearer` prefix in the Authorization header — corrections should work properly again
- **Automatic Fullscreen**: Fixed the fullscreen toggle button not appearing or rendering incorrectly after recent Autodarts UI changes; also fixed button placement in Bull-off matches
- **Zoom**: Fixed the Live mode button sometimes not being clicked on match start

### :loudspeaker: Improvements
- **Sound FX – Tournament Ready**: The ready-up sound now also triggers for German and Dutch players (previously only worked with the English interface)

Please report any bugs in
:flag_de: https://discord.com/channels/802528604067201055/1255293632110530612/1255293632110530612
:flag_gb: https://discord.com/channels/802528604067201055/1255293651756650616/1255293651756650616
or on GitHub: <https://github.com/creazy231/tools-for-autodarts/issues>

_Updates getting rolled out right now. Keep an eye on the [GitHub](https://github.com/creazy231/tools-for-autodarts/tree/main?tab=readme-ov-file#tools-for-autodarts) page for the status of each browser_