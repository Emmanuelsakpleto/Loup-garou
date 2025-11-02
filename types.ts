import type { ComponentType } from 'react';

export enum Team {
  VILLAGER = 'VILLAGEOIS',
  WEREWOLF = 'LOUP-GAROU',
  SOLO = 'SOLITAIRE',
}

export interface Role {
  id: string;
  name: string;
  description: string;
  team: Team;
  icon: ComponentType<{ className?: string }>;
  power: string;
  category: 'LOUPS-GAROUS' | 'VILLAGEOIS' | 'NEUTRES / SOLITAIRES';
}

export interface Player {
  id: string;
  name: string;
  role?: Role;
}

export enum GameView {
  HOME = 'HOME',
  CREATE_GAME = 'CREATE_GAME',
  LOBBY = 'LOBBY',
  ROLE_REVEAL = 'ROLE_REVEAL',
  ROLE_DIRECTORY = 'ROLE_DIRECTORY',
  PLAYERS_LIST = 'PLAYERS_LIST',
}

export interface GameState {
  view: GameView;
  isNarrator: boolean;
  gameCode: string | null;
  players: Player[];
  selectedRoles: { [roleId: string]: number };
  currentUser: Player | null;
}