# Phase 6: i18n (zh-TW + en) and accessibility

**Status**: P2
**Effort**: M (~1 week)
**Related**: every Svelte component with user-visible strings · new `packages/web/messages/` (or paraglide-conventional)

## Context

Phase 1 hard-codes English strings everywhere. The original `references/Avalon/` is Traditional Chinese only. We promised the user **zh-TW + en from day 1** — meaning when we add i18n, we add both locales at once and refuse to merge until both are complete.

## Scope

### i18n

1. **Choose library** — pending spike (P? TODO: "paraglide-js viability spike before Phase 6"). Default choice = paraglide-js for tree-shakeable per-locale bundles + SvelteKit nativeness; fallback = i18next + JSON.
2. **Translation surface inventory**: walk every `.svelte` file, every toast in `GameStore`, every error message emitted by `GameRoom` (which is currently English-only and ships error strings on the wire — keep error codes as the i18n key, translate display in the client).
3. **zh-TW source**: pull canonical translations from `references/Avalon/`. Original Chinese: 梅林 / 派西維爾 / 好人 / 刺客 / 莫甘娜 / 莫德雷德 / 奧伯倫 / 壞人. Phase numbers like "team_vote" → "投票" etc.
4. **Locale switcher** in `/settings`, persisted to localStorage. Default = browser locale match (Accept-Language).

### Accessibility

1. **Keyboard navigation**: tab through player tiles in team-selection mode (currently mouse-click only). Use `Space`/`Enter` to toggle membership.
2. **ARIA roles**: vote buttons (`role="radio"`), quest result tokens (`role="img"` with `aria-label`), captain crown (`aria-label="Current captain"`).
3. **Reduce-motion variant**: respect `prefers-reduced-motion`. Card flip → fade. Captain pulse → static. Vote token flip → instant.
4. **Color-blind support**: don't rely on red/green alone for success/fail; add ✓ / ✗ glyphs (already do this in Phase 1 token strip).
5. **Screen reader announcements**: phase changes (`role="status"`), incoming chat (`aria-live="polite"`).

## Options considered

| Library | Pros | Cons |
|---|---|---|
| **paraglide-js** (default choice) | per-locale tree-shaking (en-only user doesn't download zh-TW), zero runtime cost, SvelteKit-native, made by inlang | younger than i18next; if a critical bug hits we'd need to swap |
| **i18next + svelte-i18n** | mature, huge ecosystem | runtime cost, heavier bundle, all locales loaded unless we custom-split |
| **typesafe-i18n** | typed messages | Vite 4-era tooling, less actively maintained |

## Open questions

- "Loyal Servant" → 好人 (literally "good person") or 忠臣 (literally "loyal subject")? Original Avalon uses 好人 throughout — go with that to match audience expectations even though 忠臣 is more accurate.
- Number formatting matters less in zh-TW vs en for this app, but date stamps in chat use `tsMs` — render with `Intl.DateTimeFormat(locale)`.
- Phase-name keys: keep `team_selection` etc. as English wire values (already shipped in protocol), translate on client only. Don't translate enum values.

## Decision

Pending paraglide-js spike (P? TODO).

## References

- paraglide-js: https://inlang.com/m/gerre34r/library-inlang-paraglideJs
- Original Chinese translations: `references/Avalon/index.js` + `references/Avalon/client.js`
- Plan doc Phase 6 section
