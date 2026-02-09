## Summary

This PR addresses multiple issues related to trigger behavior in Sound FX and Animations:

### Bug Fixes

#### #182 - Busted triggers "0" animation
When a player is busted, the turn score is 0. The code was playing both the 'busted' trigger AND the '0' trigger when users had a '0' animation/sound/WLED effect configured.

**Changes:**
- Animations.vue: Skip points animation when busted (&& !busted)
- wled.ts: Skip points trigger check when busted

### New Features

#### #178/#190 - Trigger Timing Control
Added configurable trigger timing to solve the issue where point ranges (e.g., ambient_0-10) trigger on every dart instead of the final turn score.

**Changes:**
- Added triggerTiming field to ISound and IAnimation interfaces
- Point ranges now default to 'score-total' behavior (only on last throw)
- Added UI selector in SoundFX and Animations settings
- Updated matching logic in sound-fx.ts and Animations.vue
- Updated README.md with documentation

**Available options:**
- every-dart: Trigger on each dart (legacy behavior)
- last-throw: Only trigger after 3rd dart
- score-total: Only evaluate final turn score (default for ranges)

### Files Changed
- entrypoints/match.content/Animations.vue
- entrypoints/match.content/sound-fx.ts
- components/Settings/Animations.vue
- components/Settings/SoundFx.vue
- utils/storage.ts
- utils/wled.ts
- README.md

### Testing
- [ ] Busted scenario - verify only 'busted' triggers, not '0'
- [ ] Point range with default timing - only triggers on last dart
- [ ] Point range with 'every-dart' - triggers on each dart (legacy)
- [ ] Non-range triggers - work as before

Fixes #182
Fixes #178
Fixes #190
