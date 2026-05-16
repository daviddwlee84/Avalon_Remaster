import { describe, expect, it } from 'vitest';

import { rolePool, validateConfigForPlayerCount } from './rules.js';
import { Role, type RoomConfig } from './types.js';

const baseConfig: RoomConfig = {
  useLadyOfTheLake: false,
  useMordred: false,
  useMorganaPercival: false,
  useOberon: false,
};

describe('validateConfigForPlayerCount', () => {
  it('accepts the default config across the supported range', () => {
    for (let n = 5; n <= 10; n++) {
      expect(validateConfigForPlayerCount(n, baseConfig)).toEqual({ ok: true });
    }
  });

  it('rejects unsupported player counts', () => {
    expect(validateConfigForPlayerCount(4, baseConfig).ok).toBe(false);
    expect(validateConfigForPlayerCount(11, baseConfig).ok).toBe(false);
  });

  it('rejects Lady of the Lake with fewer than 7 players', () => {
    const r = validateConfigForPlayerCount(6, { ...baseConfig, useLadyOfTheLake: true });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('lady_needs_seven');
  });

  it('accepts Lady of the Lake at 7 players', () => {
    expect(
      validateConfigForPlayerCount(7, { ...baseConfig, useLadyOfTheLake: true }).ok,
    ).toBe(true);
  });

  it('rejects 5p + Mordred + Oberon — only 1 Minion available', () => {
    const r = validateConfigForPlayerCount(5, {
      ...baseConfig,
      useMordred: true,
      useOberon: true,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('not_enough_minion_slots');
  });

  it('rejects 5p + MorganaPercival + Mordred — 2 Minion slots needed, 1 available', () => {
    const r = validateConfigForPlayerCount(5, {
      ...baseConfig,
      useMordred: true,
      useMorganaPercival: true,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('not_enough_minion_slots');
  });

  it('accepts 7p + MorganaPercival + Mordred', () => {
    expect(
      validateConfigForPlayerCount(7, {
        ...baseConfig,
        useMordred: true,
        useMorganaPercival: true,
      }).ok,
    ).toBe(true);
  });

  it('accepts 10p + everything (3 specials + Lady)', () => {
    expect(
      validateConfigForPlayerCount(10, {
        useMordred: true,
        useMorganaPercival: true,
        useOberon: true,
        useLadyOfTheLake: true,
      }).ok,
    ).toBe(true);
  });

  it('rolePool succeeds for every config that validates', () => {
    const flags: Array<keyof Omit<RoomConfig, 'rngSeed' | 'useLadyOfTheLake'>> = [
      'useMordred',
      'useMorganaPercival',
      'useOberon',
    ];
    for (let n = 5; n <= 10; n++) {
      for (let bits = 0; bits < 8; bits++) {
        const cfg: RoomConfig = { ...baseConfig };
        flags.forEach((f, i) => {
          cfg[f] = ((bits >> i) & 1) === 1;
        });
        const v = validateConfigForPlayerCount(n, cfg);
        if (v.ok) {
          const pool = rolePool(n, cfg);
          expect(pool.length).toBe(n);
          // Exactly one Merlin and one Assassin in every valid pool.
          expect(pool.filter((r) => r === Role.Merlin).length).toBe(1);
          expect(pool.filter((r) => r === Role.Assassin).length).toBe(1);
        }
      }
    }
  });
});
