import type { Env } from './index';

const CURSOR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#F1948A',
];

interface UserInfo {
  userId: string;
  displayName: string;
  avatar: string;
  color: string;
  joinedAt: string;
  lastActivity: string;
}

interface RoomState {
  ownerId: string | null;
  ownerIp: string | null;
  createdAt: string;
  expiresAt: string;
  status: string;
}

export class RoomDurableObject {
  private state: DurableObjectState;
  private env: Env;
  private sessions: Map<WebSocket, UserInfo> = new Map();
  private serverSeq = 0;
  private roomState: RoomState | null = null;
  private lastActivityAt = Date.now();
  private availableColors: string[] = [...CURSOR_COLORS];

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const upgradeHeader = request.headers.get('Upgrade');

    if (upgradeHeader !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 });
    }

    // Extract user info from query params
    const userId = url.searchParams.get('userId') || `guest-${crypto.randomUUID().slice(0, 8)}`;
    const displayName = decodeParam(url.searchParams.get('displayName') || '');
    const avatar = url.searchParams.get('avatar') || '';
    const workspaceName = decodeParam(url.searchParams.get('workspaceName') || 'Untitled');
    const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';

    // Get or initialize room
    const roomId = url.pathname.split('/room/')[1];
    if (!this.roomState) {
      await this.initRoom(roomId, userId, clientIp, workspaceName);
    }

    // Check room status
    if (this.roomState!.status !== 'active') {
      return new Response(JSON.stringify({ error: 'ROOM_EXPIRED' }), {
        status: 410,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check max users
    const maxUsers = parseInt(this.env.MAX_ROOM_USERS || '10');
    if (this.sessions.size >= maxUsers) {
      return new Response(JSON.stringify({ error: 'ROOM_FULL' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check IP-based room limit for guests (non-authenticated)
    const isGuest = !url.searchParams.get('authToken');
    if (isGuest && this.sessions.size === 0) {
      // First connection = room creation. Check if this IP already has a room
      const existingRoom = await this.env.KV.get(`ip-rooms:${clientIp}`);
      if (existingRoom && existingRoom !== roomId) {
        return new Response(JSON.stringify({ error: 'ROOM_LIMIT_REACHED' }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      // Reserve this IP
      const ttlSeconds = parseInt(this.env.ROOM_TTL_HOURS || '3') * 3600;
      await this.env.KV.put(`ip-rooms:${clientIp}`, roomId, { expirationTtl: ttlSeconds });
    }

    // Assign color
    const color = this.availableColors.shift() || CURSOR_COLORS[this.sessions.size % CURSOR_COLORS.length];

    // Create WebSocket pair
    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];

    const userInfo: UserInfo = {
      userId,
      displayName: displayName || `User ${this.sessions.size + 1}`,
      avatar,
      color,
      joinedAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
    };

    this.state.acceptWebSocket(server);
    this.sessions.set(server, userInfo);

    // Send room-info to the new user
    this.sendTo(server, {
      type: 'room-info',
      roomId,
      adminUserId: this.roomState!.ownerId,
      expiresAt: this.roomState!.expiresAt,
      yourColor: color,
      users: Array.from(this.sessions.values()),
    });

    // Broadcast join to everyone else
    this.broadcast(server, {
      type: 'join',
      from: userId,
      displayName: userInfo.displayName,
      avatar: userInfo.avatar,
      color,
      serverSeq: ++this.serverSeq,
    });

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    const user = this.sessions.get(ws);
    if (!user) return;

    let msg: any;
    try {
      msg = JSON.parse(typeof raw === 'string' ? raw : new TextDecoder().decode(raw));
    } catch {
      this.sendTo(ws, { type: 'error', code: 'INVALID_MESSAGE' });
      return;
    }

    switch (msg.type) {
      case 'op':
        this.lastActivityAt = Date.now();
        user.lastActivity = new Date().toISOString();
        this.broadcast(ws, {
          type: 'op',
          from: user.userId,
          seq: msg.seq,
          serverSeq: ++this.serverSeq,
          payload: msg.payload,
        });
        break;

      case 'presence':
        this.broadcast(ws, {
          type: 'presence',
          from: user.userId,
          cursor: msg.cursor,
          displayName: user.displayName,
          color: user.color,
        });
        break;

      case 'sync-request':
        // Ask the first other connected client to provide a full sync
        for (const [otherWs, otherUser] of this.sessions) {
          if (otherWs !== ws) {
            this.sendTo(otherWs, {
              type: 'sync-needed',
              requestedBy: user.userId,
              lastServerSeq: msg.lastServerSeq || 0,
            });
            break;
          }
        }
        break;

      case 'sync-response':
        // Relay full sync to the requesting user
        for (const [otherWs, otherUser] of this.sessions) {
          if (otherUser.userId === msg.targetUserId) {
            this.sendTo(otherWs, {
              type: 'sync-response',
              serverSeq: this.serverSeq,
              payload: msg.payload,
            });
            break;
          }
        }
        break;

      case 'ping':
        this.sendTo(ws, { type: 'pong' });
        break;

      default:
        this.sendTo(ws, { type: 'error', code: 'INVALID_MESSAGE' });
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
    this.handleDisconnect(ws);
  }

  async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
    this.handleDisconnect(ws);
  }

  async alarm(): Promise<void> {
    if (!this.roomState) return;

    const now = Date.now();
    const expiresAt = new Date(this.roomState.expiresAt).getTime();
    const idleTimeoutMs = parseInt(this.env.IDLE_TIMEOUT_MINS || '40') * 60 * 1000;

    // Check session expiry (3h)
    if (now >= expiresAt) {
      this.closeRoom('ROOM_EXPIRED');
      return;
    }

    // Check idle timeout (40min)
    if (now - this.lastActivityAt >= idleTimeoutMs && this.sessions.size > 0) {
      this.closeRoom('ROOM_IDLE_TIMEOUT');
      return;
    }

    // Schedule next check in 5 minutes (or at expiry, whichever is sooner)
    const nextCheck = Math.min(5 * 60 * 1000, expiresAt - now);
    this.state.storage.setAlarm(Date.now() + nextCheck);
  }

  // --- Private helpers ---

  private async initRoom(roomId: string, ownerId: string, ownerIp: string, workspaceName: string = 'Untitled'): Promise<void> {
    const ttlHours = parseInt(this.env.ROOM_TTL_HOURS || '3');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlHours * 3600 * 1000);

    this.roomState = {
      ownerId,
      ownerIp,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      status: 'active',
    };

    // Persist to D1
    try {
      await this.env.DB.prepare(
        `INSERT OR IGNORE INTO rooms (id, owner_user_id, owner_ip, workspace_name, created_at, expires_at, status)
         VALUES (?, ?, ?, ?, ?, ?, 'active')`
      ).bind(roomId, ownerId, ownerIp, workspaceName, now.toISOString(), expiresAt.toISOString()).run();
    } catch {
      // Room may already exist from a previous session
    }

    // Persist to KV
    const kvTtl = ttlHours * 3600;
    await this.env.KV.put(`room:${roomId}:state`, JSON.stringify(this.roomState), {
      expirationTtl: kvTtl,
    });

    // Set first alarm check
    this.state.storage.setAlarm(Date.now() + 5 * 60 * 1000);
  }

  private handleDisconnect(ws: WebSocket): void {
    const user = this.sessions.get(ws);
    if (!user) return;

    // Recycle color
    this.availableColors.push(user.color);
    this.sessions.delete(ws);

    // Broadcast leave
    this.broadcast(null, {
      type: 'leave',
      from: user.userId,
      serverSeq: ++this.serverSeq,
    });

    // If room is empty, we let it expire naturally via alarm
  }

  private closeRoom(reason: string): void {
    // Broadcast to all connected clients
    for (const [ws] of this.sessions) {
      try {
        this.sendTo(ws, { type: 'error', code: reason });
        ws.close(1000, reason);
      } catch {}
    }
    this.sessions.clear();

    if (this.roomState) {
      this.roomState.status = 'expired';
    }
  }

  private broadcast(sender: WebSocket | null, message: object): void {
    const data = JSON.stringify(message);
    for (const [ws] of this.sessions) {
      if (ws !== sender) {
        try {
          ws.send(data);
        } catch {
          // Dead socket, will be cleaned up on close event
        }
      }
    }
  }

  private sendTo(ws: WebSocket, message: object): void {
    try {
      ws.send(JSON.stringify(message));
    } catch {}
  }
}

function decodeParam(value: string): string {
  try {
    return atob(value);
  } catch {
    return decodeURIComponent(value);
  }
}
