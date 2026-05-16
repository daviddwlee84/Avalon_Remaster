import { type BrowserContext, expect, test } from '@playwright/test';

/**
 * Phase 4 smoke: host + joiner exchange SDP via copy-paste, joiner ends
 * inside PlayLayout connected to the host's in-page GameRoom.
 *
 * Two contexts so each tab has its own localStorage / sessionStorage; the
 * host fills in displayName + room config, the joiner pastes the offer SDP,
 * generates an answer, and the host accepts. We assert the joiner reaches
 * the lobby PlayLayout (= "Players ·" heading from PlayerTile grid) which
 * means Welcome + RoomJoined arrived through the WebRtcSession.
 */
test('host + joiner exchange SDP and joiner enters PlayLayout', async ({ browser }) => {
  const hostCtx: BrowserContext = await browser.newContext();
  const joinerCtx: BrowserContext = await browser.newContext();

  try {
    const host = await hostCtx.newPage();
    const joiner = await joinerCtx.newPage();
    host.on('pageerror', (e) => console.log('[host] pageerror:', e.message));
    joiner.on('pageerror', (e) => console.log('[joiner] pageerror:', e.message));

    await host.addInitScript(() => {
      localStorage.setItem('avalon.displayName', 'HostUser');
      localStorage.setItem('avalon.locale', 'en');
    });
    await joiner.addInitScript(() => {
      localStorage.setItem('avalon.displayName', 'JoinerUser');
      localStorage.setItem('avalon.locale', 'en');
    });

    // Host: open /lan/host, accept default config, then invite a player.
    await host.goto('/lan/host');
    await host.getByRole('button', { name: /Create.*&.*join/i }).click();
    // Now on "Inviting players" stage. Click "Invite next player".
    await host.getByRole('button', { name: /Invite next player/i }).click();

    // Wait for the offer textarea (first textarea on the page) to be populated.
    const offerTextarea = host.locator('textarea').first();
    await expect(offerTextarea).not.toHaveValue('', { timeout: 15_000 });
    const offer = await offerTextarea.inputValue();
    expect(offer).toContain('"type"');
    expect(offer).toContain('"offer"');

    // Joiner: open /lan/join, paste the offer, generate the answer.
    await joiner.goto('/lan/join');
    await joiner.locator('textarea').first().fill(offer);
    await joiner.getByRole('button', { name: /Generate answer/i }).click();

    // Wait until the page transitions to the "Send this answer to the host" stage.
    await expect(
      joiner.getByRole('heading', { name: /Send this answer to the host/i }),
    ).toBeVisible({ timeout: 20_000 });
    const answerTextarea = joiner.locator('textarea').first();
    const answer = await answerTextarea.inputValue();
    expect(answer).toContain('"type"');
    expect(answer).toContain('"answer"');

    // Joiner moves to "playing" stage immediately.
    await joiner.getByRole('button', { name: /I've sent the answer/i }).click();

    // Host: fill in joiner name + paste answer, click Accept answer.
    await host
      .locator('input[type="text"][maxlength="24"]')
      .fill('JoinerUser');
    // The second textarea on the page is the answer paste-box.
    await host.locator('textarea').nth(1).fill(answer);
    await host.getByRole('button', { name: /Accept answer/i }).click();

    // Joiner should reach PlayLayout — the Players heading is unique to PlayLayout's lobby.
    await expect(joiner.getByTestId('players-heading')).toBeVisible({ timeout: 15_000 });
    // Joiner sees both names in the player list.
    await expect(joiner.getByText('HostUser').first()).toBeVisible();
    await expect(joiner.getByText('JoinerUser').first()).toBeVisible();
  } finally {
    await hostCtx.close();
    await joinerCtx.close();
  }
});
