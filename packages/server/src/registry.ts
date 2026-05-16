import {
  type ClientMsg,
  GameRoom,
  type Outbound,
  type RoomConfig,
  type RoomSummary,
  type ServerMsg,
} from '@avalon/game-core';

export interface PeerSink {
  peerId: number;
  send(msg: ServerMsg): boolean;
  close(): void;
}

interface PeerRegistration {
  peerId: number;
  roomId: string;
  sink: PeerSink;
}

/**
 * Owns all GameRooms in the server process plus the peer ↔ room mapping.
 * Routes incoming ClientMsgs to the right room and fans out resulting Outbound[].
 *
 * Phase 7a reconnection note: there is no explicit grace timer. While a peer
 * is in-game and disconnected, the engine keeps the player slot alive (with
 * `connected:false`) and the reconnect token in its private map. A returning
 * peer presenting the token via reattachPeer resumes the seat. If they never
 * return, the seat stays warm for the room's lifetime — which is bounded by
 * room GC (room destroys when all peers leave, except the 'main' room).
 */
export class RoomRegistry {
  private nextPeerId = 1;
  private readonly rooms: Map<string, GameRoom> = new Map();
  private readonly peers: Map<number, PeerRegistration> = new Map();
  /** Lobby subscribers receive `RoomList` push updates. */
  private readonly lobbySubscribers: Map<number, PeerSink> = new Map();

  allocatePeerId(): number {
    return this.nextPeerId++;
  }

  getOrCreateRoom(roomId: string, config: RoomConfig): GameRoom {
    let room = this.rooms.get(roomId);
    if (!room) {
      room = new GameRoom(roomId, config);
      this.rooms.set(roomId, room);
    }
    return room;
  }

  /** Register a peer into a room. The sink will receive any ServerMsg addressed to this peer. */
  joinRoom(roomId: string, displayName: string, sink: PeerSink): void {
    const room = this.rooms.get(roomId);
    if (!room) {
      sink.send({ type: 'Error', code: 'unknown_room', message: `Room ${roomId} not found` });
      return;
    }
    this.peers.set(sink.peerId, { peerId: sink.peerId, roomId, sink });
    const out = room.addPeer(sink.peerId, displayName);
    this.dispatch(out);
    this.notifyLobby();
  }

  /**
   * Re-attach a returning peer using the token + playerId they stashed on
   * their first join. Cancels any pending grace timer for that seat.
   */
  reattachPeer(roomId: string, playerId: string, token: string, sink: PeerSink): void {
    const room = this.rooms.get(roomId);
    if (!room) {
      sink.send({ type: 'Error', code: 'unknown_room', message: `Room ${roomId} not found` });
      return;
    }
    this.peers.set(sink.peerId, { peerId: sink.peerId, roomId, sink });
    const out = room.reattachPeer(sink.peerId, playerId, token);
    this.dispatch(out);
    const succeeded = out.some((o) => o.msg.type === 'Welcome');
    if (succeeded) this.notifyLobby();
  }

  applyToRoom(peerId: number, msg: ClientMsg): void {
    const reg = this.peers.get(peerId);
    if (!reg) return;
    const room = this.rooms.get(reg.roomId);
    if (!room) return;
    const out = room.apply(peerId, msg);
    this.dispatch(out);
  }

  removePeer(peerId: number): void {
    const reg = this.peers.get(peerId);
    if (!reg) {
      this.lobbySubscribers.delete(peerId);
      return;
    }
    this.peers.delete(peerId);
    const room = this.rooms.get(reg.roomId);
    if (room) {
      const out = room.removePeer(peerId);
      this.dispatch(out);
      if (room.isEmpty()) {
        // Don't garbage-collect the default 'main' room.
        if (reg.roomId !== 'main') this.rooms.delete(reg.roomId);
      }
    }
    this.notifyLobby();
  }

  subscribeLobby(sink: PeerSink): void {
    this.lobbySubscribers.set(sink.peerId, sink);
    sink.send({ type: 'RoomList', rooms: this.listRooms() });
  }

  listRooms(): RoomSummary[] {
    return Array.from(this.rooms.values()).map((r) => r.summary());
  }

  private dispatch(out: Outbound[]): void {
    for (const o of out) {
      const reg = this.peers.get(o.peer);
      if (reg) {
        reg.sink.send(o.msg);
      }
    }
  }

  private notifyLobby(): void {
    if (this.lobbySubscribers.size === 0) return;
    const rooms = this.listRooms();
    for (const sink of this.lobbySubscribers.values()) {
      sink.send({ type: 'RoomList', rooms });
    }
  }
}
