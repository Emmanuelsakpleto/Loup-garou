// Service pour gérer l'historique des parties dans localStorage

export interface GameHistory {
  id: string;
  code: string;
  date: string;
  type: 'created' | 'joined';
  playerCount?: number;
  roles?: Record<string, number>;
  myRole?: string;
}

export interface GameStats {
  totalGamesCreated: number;
  totalGamesJoined: number;
  rolesPlayed: Record<string, number>;
}

const HISTORY_KEY = 'loupgarou_history';
const STATS_KEY = 'loupgarou_stats';

// Récupérer l'historique
export const getHistory = (): GameHistory[] => {
  try {
    const data = localStorage.getItem(HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Erreur lecture historique:', error);
    return [];
  }
};

// Sauvegarder l'historique
const saveHistory = (history: GameHistory[]): void => {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Erreur sauvegarde historique:', error);
  }
};

// Ajouter une partie créée
export const addCreatedGame = (code: string, playerCount: number, roles: Record<string, number>): void => {
  const history = getHistory();
  
  // Vérifier si cette partie existe déjà dans l'historique
  const existingGameIndex = history.findIndex(game => game.code === code);
  
  if (existingGameIndex !== -1) {
    // Mettre à jour la partie existante
    history[existingGameIndex] = {
      ...history[existingGameIndex],
      type: 'created', // Priorité au type "created"
      playerCount,
      roles,
      date: new Date().toISOString(), // Mise à jour de la date
    };
    // Déplacer en première position
    const [updatedGame] = history.splice(existingGameIndex, 1);
    history.unshift(updatedGame);
  } else {
    // Créer une nouvelle entrée
    const newGame: GameHistory = {
      id: `created-${Date.now()}`,
      code,
      date: new Date().toISOString(),
      type: 'created',
      playerCount,
      roles,
    };
    
    // Ajouter au début de la liste (plus récent en premier)
    history.unshift(newGame);
  }
  
  // Limiter à 50 parties maximum
  if (history.length > 50) {
    history.pop();
  }
  
  saveHistory(history);
  updateStats('created');
};

// Ajouter une partie rejointe
export const addJoinedGame = (code: string, role?: string): void => {
  const history = getHistory();
  
  // Vérifier si cette partie existe déjà dans l'historique
  const existingGameIndex = history.findIndex(game => game.code === code);
  
  if (existingGameIndex !== -1) {
    // Si la partie existe déjà et qu'elle est de type "created", ne pas la modifier
    // (le créateur ne doit pas apparaître comme ayant "rejoint" sa propre partie)
    if (history[existingGameIndex].type === 'created') {
      console.log('Partie déjà créée, pas de duplication');
      return;
    }
    
    // Mettre à jour la partie existante de type "joined"
    history[existingGameIndex] = {
      ...history[existingGameIndex],
      myRole: role || history[existingGameIndex].myRole,
      date: new Date().toISOString(),
    };
    // Déplacer en première position
    const [updatedGame] = history.splice(existingGameIndex, 1);
    history.unshift(updatedGame);
  } else {
    // Créer une nouvelle entrée
    const newGame: GameHistory = {
      id: `joined-${Date.now()}`,
      code,
      date: new Date().toISOString(),
      type: 'joined',
      myRole: role,
    };
    
    history.unshift(newGame);
  }
  
  if (history.length > 50) {
    history.pop();
  }
  
  saveHistory(history);
  updateStats('joined', role);
};

// Récupérer les statistiques
export const getStats = (): GameStats => {
  try {
    const data = localStorage.getItem(STATS_KEY);
    return data ? JSON.parse(data) : {
      totalGamesCreated: 0,
      totalGamesJoined: 0,
      rolesPlayed: {},
    };
  } catch (error) {
    console.error('Erreur lecture stats:', error);
    return {
      totalGamesCreated: 0,
      totalGamesJoined: 0,
      rolesPlayed: {},
    };
  }
};

// Mettre à jour les statistiques
const updateStats = (type: 'created' | 'joined', role?: string): void => {
  try {
    const stats = getStats();
    
    if (type === 'created') {
      stats.totalGamesCreated++;
    } else {
      stats.totalGamesJoined++;
      if (role) {
        stats.rolesPlayed[role] = (stats.rolesPlayed[role] || 0) + 1;
      }
    }
    
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch (error) {
    console.error('Erreur mise à jour stats:', error);
  }
};

// Supprimer tout l'historique
export const clearHistory = (): void => {
  try {
    localStorage.removeItem(HISTORY_KEY);
    localStorage.removeItem(STATS_KEY);
  } catch (error) {
    console.error('Erreur suppression historique:', error);
  }
};

// Supprimer une partie spécifique
export const deleteGame = (gameId: string): void => {
  try {
    const history = getHistory();
    const filteredHistory = history.filter(game => game.id !== gameId);
    saveHistory(filteredHistory);
  } catch (error) {
    console.error('Erreur suppression partie:', error);
  }
};
