import { type BrowserContext, type Page, expect, test } from '@playwright/test';

/**
 * Phase 1 smoke test: 5 players join the default room, host starts a game,
 * everyone sees their role on the role-reveal modal.
 *
 * Drives 5 independent browser contexts against the real Bun + WS server
 * (booted by playwright.config.ts webServer).
 */
test('5 players can join, start, and receive role reveal', async ({ browser }) => {
  const names = ['Alice', 'Bob', 'Carol', 'Dave', 'Eve'];
  const contexts: BrowserContext[] = [];
  const pages: Page[] = [];

  // Use a room name unique to this run so it doesn't collide with the persistent 'main'.
  const roomId = `smoke-${Date.now().toString(36)}`;

  try {
    for (const name of names) {
      const ctx = await browser.newContext();
      contexts.push(ctx);
      const page = await ctx.newPage();
      pages.push(page);

      page.on('console', (msg) => console.log(`[${name}] console.${msg.type()}:`, msg.text()));
      page.on('pageerror', (err) => console.log(`[${name}] pageerror:`, err.message));

      // Persist display name then go straight to the room.
      await page.addInitScript((displayName) => {
        localStorage.setItem('avalon.displayName', displayName);
      }, name);

      await page.goto(`/play/${roomId}`);
      // Wait until we see ourselves in the player list. The page renders the player list once
      // RoomJoined arrives.
      await expect(page.getByText(name).first()).toBeVisible({ timeout: 10_000 });
    }

    // The first player (Alice) is host because she joined first.
    // Wait until Alice can see all 5 players seated.
    const alice = pages[0]!;
    for (const n of names) {
      await expect(alice.getByText(n).first()).toBeVisible();
    }

    // Click Alice's Start button.
    await alice.getByRole('button', { name: /Start game/i }).click();

    // Every player should see the role-reveal modal.
    for (const page of pages) {
      await expect(page.getByText('Your role')).toBeVisible({ timeout: 10_000 });
    }

    // Dismiss role reveal on every page so we land in team_selection.
    for (const page of pages) {
      await page.getByRole('button', { name: /I am ready/i }).click();
      await expect(page.getByText('Your role')).toBeHidden();
    }

    // The active phase chip should now read "team_selection" everywhere.
    for (const page of pages) {
      await expect(page.locator('strong', { hasText: 'team_selection' })).toBeVisible();
    }
  } finally {
    for (const ctx of contexts) {
      await ctx.close();
    }
  }
});
