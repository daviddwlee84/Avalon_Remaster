import {
  GameRoom,
  type ClientMsg,
  type Outbound,
  type PeerId,
  type RoomConfig,
  type ServerMsg,
} from '@avalon/game-core';
import { parseClientMsg } from '@avalon/protocol';

import type { ConnState, ServerMsgHandler, Session, Transport } from './types';

/**
 * Where a peer's outbound ServerMsgs go.
 *
 * - `local`: the host's own play UI. Delivery happens by invoking a callback
 *   that pushes into the host Session's subscriber set.
 * - `dc`: a remote joiner. Delivery happens by `RTCDataChannel.send(JSON)`.
 *
 * `attachLocalPeer` returns the local Session; `attachJoinerDataChannel`
 * is called once the host's data channel to a joiner has opened.
 *
 * Mirrors chess-web's `PeerSink::Local | Remote | Mock` enum (host_room.rs).
 */
export type PeerSink =
  | { kind: 'local'; deliver: (msg: ServerMsg) => void; close?: () => void }
  | { kind: 'dc'; dc: RTCDataChannel }
  | { kind: 'mock'; deliver: (msg: ServerMsg) => void; close?: () => void };

class HostSelfSession implements Session {
  /** Host-self loopback is always open while the bridge is alive. */
  readonly state: ConnState = 'open';
  private readonly handlers = new Set<ServerMsgHandler>();
  readonly transport: Transport;

  constructor(bridge: HostRoomBridge, selfPeerId: PeerId) {
    const handlers = this.handlers;
    this.transport = {
      send(msg: ClientMsg): boolean {
        bridge._handleSelfSend(selfPeerId, msg);
        return true;
      },
      close() {
        // No-op: tearing down the bridge tears down the whole room.
      },
    };
    bridge._registerLocalDelivery(selfPeerId, (msg) => {
      for (const h of handlers) h(msg);
    });
  }

  subscribe(handler: ServerMsgHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }
}

/**
 * Wraps a transport-agnostic GameRoom with per-peer sinks so the same
 * engine drives the host's local play UI AND remote joiners' RTCDataChannel.
 *
 * Pattern lifted from chess-web/src/host_room.rs: PeerSink enum, fanout
 * dispatcher, weak-ref DC handlers, attach_remote_player_dc.
 */
export class HostRoomBridge {
  private readonly room: GameRoom;
  private nextPeerId: PeerId = 1;
  private readonly sinks = new Map<PeerId, PeerSink>();
  /** Per-peer local-delivery callback installed by HostSelfSession. */
  private readonly localDeliveries = new Map<PeerId, (msg: ServerMsg) => void>();

  constructor(roomId: string, config: RoomConfig) {
    this.room = new GameRoom(roomId, config);
  }

  /**
   * Seat the host themselves and return a Session that PlayLayout can consume.
   * Must be called BEFORE attachJoinerDataChannel — addPeer needs to see the
   * host first so it becomes the host of the room.
   */
  attachLocalPeer(displayName: string): { session: Session; peerId: PeerId } {
    const peerId = this.nextPeerId++;
    const session = new HostSelfSession(this, peerId);
    this.sinks.set(peerId, {
      kind: 'local',
      deliver: (msg) => this.localDeliveries.get(peerId)?.(msg),
    });
    const out = this.room.addPeer(peerId, displayName);
    this._dispatch(out);
    return { session, peerId };
  }

  /** Attach a joiner. Requires `dc.readyState === 'open'`. */
  attachJoinerDataChannel(dc: RTCDataChannel, displayName: string): PeerId {
    const peerId = this.nextPeerId++;
    this.sinks.set(peerId, { kind: 'dc', dc });
    this._installDcHandlers(peerId, dc);
    const out = this.room.addPeer(peerId, displayName);
    this._dispatch(out);
    return peerId;
  }

  /**
   * Attach a peer whose sink is provided by the caller (testing). Bypasses
   * any network. Returns the peerId so tests can drive sends via
   * {@link _handleSelfSend} or inspect the sink's delivered queue directly.
   */
  attachMockPeer(displayName: string, mock: { deliver: (msg: ServerMsg) => void }): PeerId {
    const peerId = this.nextPeerId++;
    this.sinks.set(peerId, { kind: 'mock', deliver: mock.deliver });
    const out = this.room.addPeer(peerId, displayName);
    this._dispatch(out);
    return peerId;
  }

  /** Detach a peer (e.g. DataChannel closed). */
  dropPeer(peerId: PeerId): void {
    if (!this.sinks.has(peerId)) return;
    const out = this.room.removePeer(peerId);
    this._dispatch(out);
    const sink = this.sinks.get(peerId);
    if (sink?.kind === 'local' && sink.close) sink.close();
    this.sinks.delete(peerId);
    this.localDeliveries.delete(peerId);
  }

  peerCount(): number {
    return this.sinks.size;
  }

  /** Internal — invoked by HostSelfSession's transport.send(). */
  _handleSelfSend(peerId: PeerId, msg: ClientMsg): void {
    const out = this.room.apply(peerId, msg);
    this._dispatch(out);
  }

  /** Internal — invoked by HostSelfSession's constructor. */
  _registerLocalDelivery(peerId: PeerId, deliver: (msg: ServerMsg) => void): void {
    this.localDeliveries.set(peerId, deliver);
  }

  /**
   * Wire DataChannel handlers so incoming joiner ClientMsgs route through
   * the same GameRoom.apply path. Uses WeakRef so the DC closures don't
   * keep the bridge alive past tab close.
   */
  private _installDcHandlers(peerId: PeerId, dc: RTCDataChannel): void {
    const weakBridge = new WeakRef(this);
    dc.onmessage = (ev: MessageEvent) => {
      if (typeof ev.data !== 'string') return;
      let parsed: unknown;
      try {
        parsed = JSON.parse(ev.data);
      } catch {
        return;
      }
      const msg = parseClientMsg(parsed);
      if (!msg) return;
      const bridge = weakBridge.deref();
      if (!bridge) return;
      const out = bridge.room.apply(peerId, msg);
      bridge._dispatch(out);
    };
    dc.onclose = () => {
      weakBridge.deref()?.dropPeer(peerId);
    };
  }

  /** Fan a batch of Outbounds to the matching peer sinks. */
  private _dispatch(outs: Outbound[]): void {
    for (const o of outs) {
      const sink = this.sinks.get(o.peer);
      if (!sink) continue;
      if (sink.kind === 'local' || sink.kind === 'mock') {
        sink.deliver(o.msg);
      } else {
        try {
          sink.dc.send(JSON.stringify(o.msg));
        } catch {
          // DC may have closed between dispatch and send; the onclose handler
          // will run dropPeer shortly. Swallow here.
        }
      }
    }
  }
}
