import type { ClientMsg, ServerMsg } from '@avalon/game-core';
import { parseServerMsg } from '@avalon/protocol';

import type { ConnState, ServerMsgHandler, Session, Transport } from './types';

/**
 * Wait up to `timeoutMs` for ICE gathering to complete. Caps the failure
 * mode where a STUN server is unreachable and would otherwise hang offer
 * generation indefinitely. Translation of chess-web's
 * `wait_for_ice_complete` (transport/webrtc.rs:?? — same idea, different
 * language).
 */
function waitForIceComplete(pc: RTCPeerConnection, timeoutMs = 5000): Promise<void> {
  return new Promise((resolve) => {
    if (pc.iceGatheringState === 'complete') {
      resolve();
      return;
    }
    const timer = setTimeout(() => {
      pc.removeEventListener('icegatheringstatechange', onChange);
      resolve();
    }, timeoutMs);
    function onChange() {
      if (pc.iceGatheringState === 'complete') {
        clearTimeout(timer);
        pc.removeEventListener('icegatheringstatechange', onChange);
        resolve();
      }
    }
    pc.addEventListener('icegatheringstatechange', onChange);
  });
}

/** Poll until `dc.readyState === 'open'` or `timeoutMs` elapses. */
export function waitForDcOpen(dc: RTCDataChannel, timeoutMs = 10_000): Promise<boolean> {
  return new Promise((resolve) => {
    if (dc.readyState === 'open') {
      resolve(true);
      return;
    }
    const deadline = Date.now() + timeoutMs;
    const tick = () => {
      if (dc.readyState === 'open') {
        resolve(true);
        return;
      }
      if (Date.now() > deadline) {
        resolve(false);
        return;
      }
      setTimeout(tick, 50);
    };
    tick();
  });
}

/**
 * SDP envelope: `{ "type": "offer" | "answer", "sdp": "..." }` (JSON).
 * Survives clipboard normalisation of CRLF (SDP per RFC 4566 demands CRLF;
 * many transports strip the CR — JSON escaping with `\r\n` preserves it).
 */
export function encodeSdp(kind: 'offer' | 'answer', sdp: string): string {
  return JSON.stringify({ type: kind, sdp }, null, 2);
}

export function decodeSdp(
  blob: string,
  expectedKind: 'offer' | 'answer',
): { sdp: string } | { error: string } {
  const trimmed = blob.trim();
  if (!trimmed.startsWith('{')) {
    return { error: 'Paste the JSON envelope produced by the other tab (raw SDP not accepted).' };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (e) {
    return { error: `Envelope is not valid JSON: ${(e as Error).message}` };
  }
  if (typeof parsed !== 'object' || parsed === null) {
    return { error: 'Envelope is not an object.' };
  }
  const obj = parsed as Record<string, unknown>;
  if (obj.type !== expectedKind) {
    return { error: `Envelope is a "${String(obj.type)}", expected "${expectedKind}".` };
  }
  if (typeof obj.sdp !== 'string') {
    return { error: 'Envelope is missing the "sdp" string field.' };
  }
  return { sdp: obj.sdp };
}

/**
 * WebRTC ICE config. Phase 4 ships LAN-only (no STUN); the type is left as
 * an enum so a STUN fallback can land later without an API change.
 */
export type IceMode = 'lan-only' | 'with-stun';

function makePeerConnection(mode: IceMode): RTCPeerConnection {
  const config: RTCConfiguration =
    mode === 'with-stun'
      ? {
          iceServers: [
            { urls: 'stun:stun.miwifi.com:3478' },
            { urls: 'stun:stun.qq.com:3478' },
            { urls: 'stun:stun.cloudflare.com:3478' },
            { urls: 'stun:stun.l.google.com:19302' },
          ],
        }
      : { iceServers: [] };
  return new RTCPeerConnection(config);
}

export interface HostHandshake {
  pc: RTCPeerConnection;
  dc: RTCDataChannel;
  offerBlob: string;
  /** Resolves once `dc.readyState === 'open'`. */
  acceptAnswer(answerBlob: string): Promise<{ ok: true } | { ok: false; error: string }>;
}

/** Host side: create the data channel, generate the offer, await joiner's answer. */
export async function connectAsHost(mode: IceMode = 'lan-only'): Promise<HostHandshake> {
  const pc = makePeerConnection(mode);
  const dc = pc.createDataChannel('avalon', { ordered: true });
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  await waitForIceComplete(pc);
  const localSdp = pc.localDescription?.sdp ?? '';
  const offerBlob = encodeSdp('offer', localSdp);

  return {
    pc,
    dc,
    offerBlob,
    async acceptAnswer(answerBlob: string) {
      const decoded = decodeSdp(answerBlob, 'answer');
      if ('error' in decoded) return { ok: false as const, error: decoded.error };
      if (pc.signalingState !== 'have-local-offer') {
        return {
          ok: false as const,
          error: `PeerConnection state is "${pc.signalingState}" (expected "have-local-offer"). The offer may have been replaced or the answer already accepted.`,
        };
      }
      try {
        await pc.setRemoteDescription({ type: 'answer', sdp: decoded.sdp });
      } catch (e) {
        return { ok: false as const, error: (e as Error).message };
      }
      return { ok: true as const };
    },
  };
}

export interface JoinerHandshake {
  pc: RTCPeerConnection;
  session: WebRtcSession;
  answerBlob: string;
}

/** Joiner side: accept offer, generate answer, return a Session backed by the DataChannel. */
export async function connectAsJoiner(
  offerBlob: string,
  mode: IceMode = 'lan-only',
): Promise<{ ok: true; handshake: JoinerHandshake } | { ok: false; error: string }> {
  const decoded = decodeSdp(offerBlob, 'offer');
  if ('error' in decoded) return { ok: false, error: decoded.error };

  const pc = makePeerConnection(mode);
  const session = new WebRtcSession();

  // Wire ondatachannel BEFORE setRemoteDescription — the DC arrives as a
  // side-effect of applying the offer and we mustn't miss the event.
  // (chess-web pitfall: webrtc-set-remote-description-resolves-before-dc-open.)
  pc.ondatachannel = (ev) => {
    session._attachDataChannel(ev.channel);
  };

  await pc.setRemoteDescription({ type: 'offer', sdp: decoded.sdp });
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  await waitForIceComplete(pc);

  const localSdp = pc.localDescription?.sdp ?? '';
  const answerBlob = encodeSdp('answer', localSdp);
  return { ok: true, handshake: { pc, session, answerBlob } };
}

/**
 * Session backed by a single RTCDataChannel. Used by the joiner side
 * (the host side runs sessions through HostRoomBridge directly).
 */
export class WebRtcSession implements Session {
  state: ConnState = $state('connecting');
  private dc: RTCDataChannel | null = null;
  private readonly handlers = new Set<ServerMsgHandler>();
  /** Queue messages that arrive before any handler subscribes. */
  private readonly preSubscribeQueue: ServerMsg[] = [];

  readonly transport: Transport = {
    send: (msg: ClientMsg): boolean => {
      const dc = this.dc;
      if (!dc || dc.readyState !== 'open') return false;
      try {
        dc.send(JSON.stringify(msg));
        return true;
      } catch {
        return false;
      }
    },
    close: () => {
      try {
        this.dc?.close();
      } catch {
        // ignore
      }
      this.state = 'closed';
    },
  };

  /** Internal: invoked by `connectAsJoiner` once the host's DC arrives. */
  _attachDataChannel(dc: RTCDataChannel): void {
    this.dc = dc;
    if (dc.readyState === 'open') this.state = 'open';
    dc.onopen = () => {
      this.state = 'open';
    };
    dc.onclose = () => {
      this.state = 'closed';
    };
    dc.onmessage = (ev: MessageEvent) => {
      if (typeof ev.data !== 'string') return;
      let parsed: unknown;
      try {
        parsed = JSON.parse(ev.data);
      } catch {
        return;
      }
      const msg = parseServerMsg(parsed);
      if (!msg) return;
      if (this.handlers.size === 0) {
        this.preSubscribeQueue.push(msg);
        return;
      }
      for (const h of this.handlers) h(msg);
    };
  }

  subscribe(handler: ServerMsgHandler): () => void {
    this.handlers.add(handler);
    // Drain anything that arrived before the first subscriber landed.
    if (this.preSubscribeQueue.length > 0) {
      const drained = this.preSubscribeQueue.splice(0);
      for (const msg of drained) handler(msg);
    }
    return () => {
      this.handlers.delete(handler);
    };
  }
}
