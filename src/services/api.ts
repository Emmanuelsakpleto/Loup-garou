import { io, Socket } from 'socket.io-client';

const envApiBase = (import.meta.env.VITE_API_BASE_URL ?? '').trim();
const rawApiBase = envApiBase.length > 0 ? envApiBase : 'http://localhost:5174';
const sanitizedApiBase = rawApiBase.replace(/\/$/, '');
const API_BASE = sanitizedApiBase.endsWith('/api')
  ? sanitizedApiBase
  : `${sanitizedApiBase}/api`;

const envSocketUrl = (import.meta.env.VITE_SOCKET_URL ?? '').trim();
const SOCKET_URL = (envSocketUrl.length > 0 ? envSocketUrl : 'http://localhost:5174').replace(/\/$/, '');

console.info('[API config]', { API_BASE, SOCKET_URL });

// Types pour les réponses API
export interface CreateGameResponse {
  gameId: string;
  code: string;
  hostToken: string;
}

export interface JoinGameResponse {
  playerId: string;
  gameId: string;
}

export interface GameResponse {
  game: {
    id: string;
    code: string;
    players: Array<{ id: string; name: string; roleId?: string }>;
    status: string;
    settings?: Record<string, any>;
  };
}

// Singleton socket
let socket: Socket | null = null;

export async function createGame(hostName: string, settings?: Record<string, any>): Promise<CreateGameResponse> {
  const res = await fetch(`${API_BASE}/create-game`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hostName, settings }),
  });
  if (!res.ok) throw new Error('Failed to create game');
  return res.json();
}

export async function joinGame(code: string, pseudo: string): Promise<JoinGameResponse> {
  const res = await fetch(`${API_BASE}/join-game`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, pseudo }),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || 'Failed to join game');
  }
  return res.json();
}

export async function getGame(gameId: string): Promise<GameResponse> {
  const res = await fetch(`${API_BASE}/game/${gameId}`);
  if (!res.ok) throw new Error('Failed to get game');
  return res.json();
}

export async function assignRoles(gameId: string, hostToken: string, selectedRoles: Record<string, number>): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/game/${gameId}/assign-roles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hostToken, selectedRoles }),
  });
  if (!res.ok) throw new Error('Failed to assign roles');
  return res.json();
}

export function initSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
    });
    
    socket.on('connect', () => {
      console.log('✅ Socket.IO connecté:', socket?.id);
    });
    
    socket.on('disconnect', () => {
      console.log('❌ Socket.IO déconnecté');
    });
    
    socket.on('connect_error', (error) => {
      console.error('❌ Erreur de connexion Socket.IO:', error);
    });
  }
  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function joinGameRoom(gameId: string) {
  if (socket) {
    socket.emit('join-room', { gameId });
  }
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
