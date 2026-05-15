# Svelte 5 `$effect` infinite loop when assigning to `$state` inside it (WebSocket "Insufficient resources")

**Symptoms** (grep this section): `WebSocket connection ... failed: Insufficient resources` · `WebSocket is closed before the connection is established` · Chrome DevTools showing dozens of WS connections per second · page locks up shortly after navigating to a Svelte 5 route that opens a network connection · `$effect` running repeatedly with no apparent dependency change
**First seen**: 2026-05-16 (during Phase 1 of Avalon Remaster)
**Affects**: Svelte 5 (any version with runes); independent of Chrome / Firefox / Safari
**Status**: workaround documented (use `onMount`); root cause is intentional Svelte 5 semantics

## Symptom

Page loads, the user navigates to a route that mounts a WebSocket session, and the page never settles. Console fills with hundreds of:

```
WebSocket connection to 'ws://localhost:3000/ws/<roomId>?name=Alice' failed:
  Insufficient resources
WebSocket connection to 'ws://localhost:3000/ws/<roomId>?name=Alice' failed:
  WebSocket is closed before the connection is established.
```

The server only sees the rapid open/close churn — nothing actually completes the handshake.

The triggering Svelte component looked like this:

```svelte
<script lang="ts">
  let session = $state<WsSession | null>(null);
  let store = $state<GameStore | null>(null);

  $effect(() => {
    session = new WsSession(buildRoomWsUrl(roomId, displayName));
    store = new GameStore(session);
    return () => {
      store?.dispose();
      session?.close();
    };
  });
</script>
```

## Root cause

Svelte 5 `$effect` tracks every `$state` rune **read OR written** during its synchronous body. Each effect run does:

1. **Reads** the current values of any `$state` it accesses (cleanup closure: `store?.dispose()`, `session?.close()` reads both).
2. **Writes** by assigning `session = new WsSession(...)` and `store = new GameStore(...)`.

Those writes invalidate the dependency on those signals, which **re-runs the effect**, which creates a new `WsSession`, which assigns again, which re-runs the effect, ad infinitum. Each iteration opens a new WebSocket before the previous one finishes the TLS/HTTP handshake → "Insufficient resources" after Chrome's per-origin limit.

This is intentional Svelte 5 behavior: effects ARE supposed to react to any signal they touch, including their own writes. It's just not what you want for one-shot side effects.

## Workaround

Use `onMount` for one-shot setup that should run exactly once on component mount:

```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  let session = $state<WsSession | null>(null);
  let store = $state<GameStore | null>(null);

  onMount(() => {
    const s = new WsSession(buildRoomWsUrl(roomId, displayName));
    session = s;
    store = new GameStore(s);
  });

  onDestroy(() => {
    store?.dispose();
    session?.close();
  });
</script>
```

`onMount` runs once, has no reactive tracking, and accepts a teardown return (though using `onDestroy` separately is clearer).

Alternative: `$effect` with `untrack()` wrapping the writes. Less readable and easy to forget.

## Prevention

**Heuristic**: if an effect is opening sockets, timers, observers, or any other handle that you keep referencing across the component's lifetime, you almost certainly want `onMount` / `onDestroy`, not `$effect`. Reserve `$effect` for things that should **react** to state changes (re-render canvas when prop changes, sync a derived field, etc.) — not for "set up X exactly once".

A useful rule: if your effect contains `=` (assignment), and the LHS is a `$state` you also read later, it's probably wrong.

## Related

- Svelte runes docs: https://svelte.dev/docs/svelte/$effect
- TODO entry tracking similar gotchas: N/A
- Sibling pitfalls: N/A
- Source code reference: `packages/web/src/routes/play/[roomId]/+page.svelte` — uses `onMount` after this lesson
