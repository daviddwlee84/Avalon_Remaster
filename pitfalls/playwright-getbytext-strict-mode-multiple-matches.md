# Playwright `getByText` strict mode violation when text appears in multiple elements

**Symptoms** (grep this section): `Error: strict mode violation: getByText(...) resolved to 2 elements` · `1) <span>...</span> aka getByText('...')` · Playwright test that worked locally with one user but fails when the page renders the same name in multiple places (status bar + player list, header + body, badge + cell)
**First seen**: 2026-05-16 (Avalon Remaster Phase 1 multi-context smoke test)
**Affects**: Playwright 1.40+ (strict mode is the default for all `getBy*` selectors); applies to any framework
**Status**: workaround documented (use `.first()` or scope to a parent locator)

## Symptom

Test code:

```ts
await expect(page.getByText('Alice')).toBeVisible({ timeout: 10_000 });
```

The page renders the same string in two places — e.g. a status bar at the top and a player tile lower down:

```html
<span class="text-xs opacity-60">You: Alice (p_e9db) — phase:</span>
<!-- ... -->
<div class="font-medium">Alice<span>(you)</span></div>
```

Playwright fails with:

```
Locator: getByText('Alice')
Expected: visible
Error: strict mode violation: getByText('Alice') resolved to 2 elements:
    1) <span class="text-xs opacity-60">…</span> aka getByText('You: Alice (p_e9db) — phase:')
    2) <div class="font-medium">…</div> aka getByText('Alice (you)')
```

Misleadingly, the test was looking for "presence of Alice anywhere on the page" — which IS true — but strict mode requires the locator to resolve to **exactly one** element.

Adding `{ exact: true }` doesn't help here because of normalized-whitespace + adjacent text nodes — "Alice (you)" doesn't equal "Alice" even with `exact: true`.

## Root cause

Playwright defaults all `getBy*` selectors to strict mode (since v1.40), meaning each locator must resolve to exactly one element. The behavior is intentional — silently picking "the first match" leads to subtle test bugs where you assert against a different element than you meant.

The lesson from Playwright's design: locators should be **semantic and specific**, not generic substring matches.

## Workaround

Three options, in increasing order of robustness:

### 1. `.first()` — quick fix, OK for "is this name displayed somewhere"

```ts
await expect(page.getByText('Alice').first()).toBeVisible();
```

Use when: you genuinely don't care which match it is, you only want to know presence.

### 2. Scope to a parent locator — better when there's a distinguishing container

```ts
const playerList = page.getByRole('list', { name: 'Players' });
await expect(playerList.getByText('Alice')).toBeVisible();
```

Use when: the matching element lives inside a uniquely-identifiable region. Requires adding `aria-label`s or `data-testid`s to your UI; pays back in test stability.

### 3. Use a more specific locator — best long-term

```ts
await expect(page.getByRole('listitem', { name: /Alice/ })).toBeVisible();
// or
await expect(page.getByTestId(`player-tile-alice`)).toBeVisible();
```

Use when: you can add `data-testid` or rely on proper ARIA roles. Tests become resilient to UI text changes around the player tile.

## Prevention

- Default to `getByRole` / `getByLabel` / `getByTestId`, fall back to `getByText` only for unique strings (page titles, error messages).
- When duplicates are intentional (status header + content), add `data-testid` to the canonical element.
- If a test only cares about "presence anywhere on the page", spell that intent explicitly with `.first()` rather than letting it accidentally pass on the wrong element.
- Run the test against a single user too — multi-user tests are MORE likely to expose this because more text repeats.

## Related

- Playwright docs on strict mode: https://playwright.dev/docs/locators#strictness
- Source code reference: `packages/web/tests/smoke.spec.ts` — uses `.first()` after this lesson
- Sibling pitfalls: N/A
