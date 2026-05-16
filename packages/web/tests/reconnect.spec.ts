import { type BrowserContext, type Page, expect, test } from '@playwright/test';

/**
 * Phase 7a reconnection smoke: 5 players join, host starts, one player
 * reloads with localStorage intact, the engine resumes the seat via the
 * reattach token round-trip.
 *
 * Asserts the rejoiner's Players heading still shows all 5 names AFTER the
 * reload — proving the Welcome+GameStateUpdate path through reattachPeer
 * delivered the right view, instead of a fresh addPeer that would (a) get
 * Error{bad_phase} because the room is mid-game, OR (b) seat a duplicate.
 */
test('mid-game reload resumes the same seat via reattach token', async ({ browser }) => {
  const names = ['Alice', 'Bob', 'Carol', 'Dave', 'Eve'];
  const contexts: BrowserContext[] = [];
  const pages: Page[] = [];
  const roomId = `reconnect-${Date.now().toString(36)}`;

  try {
    for (const name of names) {
      const ctx = await browser.newContext();
      contexts.push(ctx);
      const page = await ctx.newPage();
      pages.push(page);
      await page.addInitScript((displayName) => {
        localStorage.setItem('avalon.displayName', displayName);
        localStorage.setItem('avalon.locale', 'en');
      }, name);
      await page.goto(`/play/${roomId}`);
      await expect(page.getByText(name).first()).toBeVisible({ timeout: 10_000 });
    }

    const alice = pages[0]!;
    for (const n of names) {
      await expect(alice.getByText(n).first()).toBeVisible();
    }
    await alice.getByRole('button', { name: /Start game/i }).click();

    // Wait for everyone to see role reveal (means we're past role_reveal handshake).
    for (const page of pages) {
      await expect(page.getByText('Your role')).toBeVisible({ timeout: 10_000 });
      await page.getByRole('button', { name: /I am ready/i }).click();
    }

    // Bob (pages[1]) reloads — Playwright keeps the context's localStorage,
    // so loadReconnect() should hand back the stash from his first Welcome.
    const bob = pages[1]!;
    await expect(bob.locator('strong', { hasText: 'Team selection' })).toBeVisible();
    await bob.reload();

    // After reload, Bob's PlayLayout should re-render with all 5 players, NOT
    // an Error toast about not being in the player pool.
    await expect(bob.getByTestId('players-heading')).toBeVisible({ timeout: 10_000 });
    for (const n of names) {
      await expect(bob.getByText(n).first()).toBeVisible();
    }
    // No "Invalid reconnect token" error toast.
    const tokenErr = bob.getByText(/Invalid reconnect token/i);
    expect(await tokenErr.count()).toBe(0);
  } finally {
    for (const ctx of contexts) await ctx.close();
  }
});
