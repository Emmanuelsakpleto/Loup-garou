// FIX: Corrected the React import by removing the extraneous 'a,'.
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { GameView, type GameState, type Player, type Role, Team } from './types';
import { ROLES } from './constants';
import { createGame, joinGame, getGame, assignRoles as assignRolesAPI, initSocket, joinGameRoom, getSocket } from './services/api';
import { getHistory, getStats, clearHistory, deleteGame, addCreatedGame, addJoinedGame, type GameHistory } from './services/history';
import {
  BookIcon,
  BookOpenIcon,
  CircusIcon,
  ClipboardIcon,
  CopyIcon,
  DoorOpenIcon,
  EmailIcon,
  EyeOffIcon,
  GamepadIcon,
  HistoryIcon,
  HomeIcon,
  MaskIcon,
  MinusIcon,
  MoonIcon,
  PeopleIcon,
  PlusIcon,
  ScrollIcon,
  SettingsIcon,
  SMSIcon,
  SwordsIcon,
  TrashIcon,
  UserIcon,
  UsersIcon,
  WerewolfIcon,
  WhatsAppIcon,
} from './components/icons';

const initialState: GameState = {
  view: GameView.HOME,
  isNarrator: false,
  gameCode: null,
  gameId: null,
  hostToken: null,
  players: [],
  selectedRoles: {},
  currentUser: null,
};

const teamColors: Record<Team, string> = {
    [Team.VILLAGER]: 'border-cyan-500',
    [Team.WEREWOLF]: 'border-red-500',
    [Team.SOLO]: 'border-slate-500',
}

const RoleCard: React.FC<{ role: Role, children?: React.ReactNode }> = ({ role, children }) => (
    <div className={`bg-slate-800 border border-slate-700 rounded-lg p-4 text-center transform transition-all duration-300 flex flex-col h-full border-t-4 card-3d hover:shadow-2xl ${teamColors[role.team]}`}>
        <role.icon className="w-16 h-16 mx-auto mb-3 text-cyan-400" />
        <h3 className="text-xl font-bold text-white mb-1 font-creepy">{role.name}</h3>
        <p className="text-cyan-300 text-sm font-semibold mb-2 font-typewriter">{role.power}</p>
        <p className="text-sm text-slate-400 mb-4 flex-grow">{role.description}</p>
        {children}
    </div>
);

const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

const groupRolesByCategory = (roles: Role[]) => {
    return roles.reduce((acc: Record<string, Role[]>, role) => {
        const category = role.category || 'AUTRES';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(role);
        return acc;
    }, {});
}

export default function App() {
    const [gameState, setGameState] = useState<GameState>(initialState);
    const [joinCode, setJoinCode] = useState('');
    const [playerName, setPlayerName] = useState('');
    const [narratorName, setNarratorName] = useState('Narrateur');
    const [showCopied, setShowCopied] = useState(false);
    const [isRoleRevealed, setIsRoleRevealed] = useState(false);
    const [roleFilter, setRoleFilter] = useState<Team | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');

    // Socket.IO event listeners
    useEffect(() => {
        // Initialiser le socket dès le montage du composant
        const socket = initSocket();

        // Écouter l'arrivée d'un nouveau joueur
        socket.on('player-joined', (data: { playerId: string; playerName: string }) => {
            console.log('🎮 Nouveau joueur reçu via Socket.IO:', data);
            setGameState(prev => {
                // Vérifier si le joueur n'existe pas déjà dans la liste
                const playerExists = prev.players.some(p => p.id === data.playerId);
                if (playerExists) {
                    console.log('ℹ️ Joueur déjà dans la liste, ignoré');
                    return prev;
                }
                return {
                    ...prev,
                    players: [...prev.players, { id: data.playerId, name: data.playerName }],
                };
            });
        });

        // Écouter les mises à jour de l'état du jeu
        socket.on('game-updated', (data: any) => {
            console.log('🔄 Mise à jour du jeu:', data);
            // TODO: synchroniser l'état du jeu avec les données du serveur
        });

        // Écouter l'attribution des rôles
        socket.on('roles-assigned', (data: { players: Array<{ id: string; name: string; roleId?: string }> }) => {
            console.log('🎭 Rôles attribués reçus via Socket.IO:', data);
            setIsLoading(false);
            setLoadingMessage('');
            setGameState(prev => {
                // Mettre à jour les joueurs avec leurs rôles
                const updatedPlayers = data.players.map(p => {
                    const role = p.roleId ? ROLES.find(r => r.id === p.roleId) : undefined;
                    return { id: p.id, name: p.name, role };
                });
                
                // Mettre à jour le currentUser avec son rôle
                const currentPlayerData = data.players.find(p => p.id === prev.currentUser?.id);
                const currentUserRole = currentPlayerData?.roleId ? ROLES.find(r => r.id === currentPlayerData.roleId) : undefined;
                const updatedCurrentUser = prev.currentUser ? { ...prev.currentUser, role: currentUserRole } : null;
                
                return {
                    ...prev,
                    players: updatedPlayers,
                    currentUser: updatedCurrentUser,
                    view: GameView.ROLE_REVEAL,
                };
            });
            setIsRoleRevealed(false);
        });

        // Nettoyage à la destruction du composant
        return () => {
            socket.off('player-joined');
            socket.off('game-updated');
            socket.off('roles-assigned');
        };
    }, []);

    const resetGame = () => {
        setGameState(initialState);
        setJoinCode('');
        setPlayerName('');
        setNarratorName('Narrateur');
        setIsRoleRevealed(false);
        setRoleFilter(null);
    };

    const handleCreateGame = () => {
        setGameState(prev => ({ ...prev, view: GameView.CREATE_GAME, isNarrator: true }));
    };
    
    const setView = (view: GameView) => {
      setGameState(prev => ({...prev, view}));
    }

    const updateRoleCount = (roleId: string, delta: number) => {
        setGameState(prev => {
            const currentCount = prev.selectedRoles[roleId] || 0;
            const newCount = Math.max(0, currentCount + delta);
            return {
                ...prev,
                selectedRoles: {
                    ...prev.selectedRoles,
                    [roleId]: newCount,
                },
            };
        });
    };

    const totalSelectedRoles = useMemo(() => {
        return Object.values(gameState.selectedRoles).reduce((sum: number, count: number) => sum + count, 0);
    }, [gameState.selectedRoles]);

    const handleStartLobby = async () => {
        setIsLoading(true);
        setLoadingMessage('Création de la partie...');
        
        try {
            const result = await createGame(narratorName, {
                selectedRoles: gameState.selectedRoles,
            });
            
            console.log('✅ Jeu créé:', result);
            
            // Récupérer les données complètes du jeu
            const gameData = await getGame(result.gameId);
            console.log('📋 Données du jeu:', gameData.game);
            
            // Enregistrer dans l'historique
            const playerCount = Object.values(gameState.selectedRoles).reduce((a: number, b: number) => a + b, 0);
            addCreatedGame(result.code, playerCount, gameState.selectedRoles);
            
            const narratorPlayer: Player = { id: result.hostToken, name: narratorName };
            
            setGameState(prev => ({
                ...prev,
                gameCode: result.code,
                gameId: result.gameId,
                hostToken: result.hostToken,
                players: gameData.game.players.map(p => ({ id: p.id, name: p.name })),
                view: GameView.LOBBY,
                currentUser: narratorPlayer,
                isNarrator: true,
            }));
            
            // Rejoindre la room Socket.IO (le socket est déjà initialisé)
            joinGameRoom(result.gameId);
            console.log('🎮 Room rejointe:', result.gameId);
        } catch (error) {
            console.error('❌ Erreur lors de la création du jeu:', error);
            alert('Impossible de créer le jeu. Vérifiez que le backend est bien lancé.');
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };

    const handleJoinLobby = async () => {
        if (joinCode.trim() && playerName.trim()) {
            setIsLoading(true);
            setLoadingMessage('Connexion à la partie...');
            
            try {
                const result = await joinGame(joinCode.trim().toUpperCase(), playerName);
                
                console.log('✅ Jeu rejoint:', result);
                
                // Récupérer la liste complète des joueurs depuis le backend
                const gameData = await getGame(result.gameId);
                console.log('📋 Liste complète des joueurs:', gameData.game.players);
                
                // Enregistrer dans l'historique (le rôle sera ajouté plus tard quand il sera révélé)
                addJoinedGame(joinCode.trim().toUpperCase());
                
                const newUser: Player = { id: result.playerId, name: playerName };
                
                setGameState(prev => ({
                    ...prev,
                    gameCode: joinCode.trim().toUpperCase(),
                    gameId: result.gameId,
                    hostToken: null,
                    isNarrator: false,
                    currentUser: newUser,
                    view: GameView.LOBBY,
                    // Afficher tous les joueurs déjà présents
                    players: gameData.game.players.map(p => ({ id: p.id, name: p.name })),
                }));
                
                // Rejoindre la room Socket.IO (le socket est déjà initialisé)
                joinGameRoom(result.gameId);
                console.log('🎮 Room rejointe:', result.gameId);
            } catch (error: any) {
                console.error('❌ Erreur lors de la connexion au jeu:', error);
                
                // Gérer l'erreur "partie pleine"
                if (error.message?.includes('game is full')) {
                    alert('❌ Cette partie est complète ! Le nombre maximum de joueurs est atteint.');
                } else {
                    alert('Impossible de rejoindre le jeu. Vérifiez le code et que le backend est bien lancé.');
                }
            } finally {
                setIsLoading(false);
                setLoadingMessage('');
            }
        }
    };
    
    const addSimulatedPlayer = () => {
      const simulatedName = `Joueur ${gameState.players.length}`;
      const newPlayer: Player = { id: `sim-${Date.now()}`, name: simulatedName };
      setGameState(prev => ({
        ...prev,
        players: [...prev.players, newPlayer],
      }));
    };

    const assignRoles = useCallback(async () => {
        if (!gameState.gameId || !gameState.hostToken) {
            console.error('❌ Impossible d\'assigner les rôles : gameId ou hostToken manquant');
            return;
        }

        setIsLoading(true);
        setLoadingMessage('Distribution des rôles...');
        
        try {
            console.log('🎭 Demande d\'attribution des rôles...');
            await assignRolesAPI(gameState.gameId, gameState.hostToken, gameState.selectedRoles);
            console.log('✅ Demande envoyée, en attente de la réponse via Socket.IO...');
            // L'événement 'roles-assigned' sera reçu via Socket.IO et mettra à jour l'état
        } catch (error) {
            console.error('❌ Erreur lors de l\'attribution des rôles:', error);
            alert('Impossible d\'attribuer les rôles. Vérifiez que le backend est bien lancé.');
            setIsLoading(false);
            setLoadingMessage('');
        }
    }, [gameState.gameId, gameState.hostToken, gameState.selectedRoles]);

    const handleShare = async () => {
        if(!gameState.gameCode) {
            console.warn('⚠️ Pas de code de jeu à partager');
            return;
        }
        
        const gameLink = `${window.location.origin}?join=${gameState.gameCode}`;
        const invitationText = `Rejoins ma partie de Loup-Garou !\n\nCode : ${gameState.gameCode}\nLien : ${gameLink}\n\nClique sur le lien ou entre le code pour nous rejoindre !`;
        
        try {
            await navigator.clipboard.writeText(invitationText);
            console.log('✅ Invitation copiée');
            setShowCopied(true);
            setTimeout(() => setShowCopied(false), 2000);
        } catch (err) {
            console.error('❌ Erreur copie invitation:', err);
            prompt('Copiez ce texte :', invitationText);
        }
    };

    const handleCopyCode = async () => {
        if(!gameState.gameCode) return;
        
        try {
            await navigator.clipboard.writeText(gameState.gameCode);
            console.log('✅ Code copié');
            setShowCopied(true);
            setTimeout(() => setShowCopied(false), 2000);
        } catch (err) {
            console.error('❌ Erreur copie code:', err);
            prompt('Copiez ce code :', gameState.gameCode);
        }
    };

    const handleShareWhatsApp = () => {
        if(!gameState.gameCode) return;
        const gameLink = `${window.location.origin}?join=${gameState.gameCode}`;
        // Message sans emoji pour éviter les problèmes d'encodage
        const text = encodeURIComponent(`Rejoins ma partie de Loup-Garou !\n\nCode : ${gameState.gameCode}\nLien : ${gameLink}`);
        window.open(`https://wa.me/?text=${text}`, '_blank');
    };

    const handleShareSMS = () => {
        if(!gameState.gameCode) return;
        const gameLink = `${window.location.origin}?join=${gameState.gameCode}`;
        const text = encodeURIComponent(`Rejoins ma partie de Loup-Garou !\n\nCode : ${gameState.gameCode}\nLien : ${gameLink}`);
        window.location.href = `sms:?body=${text}`;
    };

    const handleShareEmail = () => {
        if(!gameState.gameCode) return;
        const gameLink = `${window.location.origin}?join=${gameState.gameCode}`;
        const subject = encodeURIComponent('Rejoins ma partie de Loup-Garou !');
        const body = encodeURIComponent(`Salut !\n\nJe t'invite à rejoindre ma partie de Loup-Garou !\n\nCode : ${gameState.gameCode}\nLien : ${gameLink}\n\nClique sur le lien ou entre le code pour nous rejoindre !`);
        window.location.href = `mailto:?subject=${subject}&body=${body}`;
    };
    
    const filteredRoles = useMemo(() => {
        if (!roleFilter) return ROLES;
        return ROLES.filter(r => r.team === roleFilter);
    }, [roleFilter]);

    const renderView = () => {
        switch (gameState.view) {
            case GameView.HOME:
                return (
                    <div className="text-center">
                        <div className="mb-12">
                            <div className="relative w-48 h-48 md:w-56 md:h-56 mx-auto">
                                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 animate-pulse-glow"></div>
                                <div className="absolute inset-[3px] rounded-full bg-gray-900 flex items-center justify-center p-6">
                                    <img 
                                        src="/icons/page-accueil-loup-transparent.png" 
                                        alt="Loup-Garou Logo" 
                                        className="w-full h-full object-contain drop-shadow-2xl"
                                    />
                                </div>
                            </div>
                            <h1 className="text-3xl md:text-6xl font-bold font-horror mt-4 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 drop-shadow-lg">Loup-Garou</h1>
                            <p className="text-slate-400 mt-2 text-lg italic font-typewriter">Le village s'endort...</p>
                        </div>
                        <div className="space-y-4 max-w-sm mx-auto">
                            <button onClick={handleCreateGame} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-4 px-6 rounded-lg text-lg transition-all transform hover:scale-105 hover:shadow-lg btn-game flex items-center justify-center space-x-2">
                                <GamepadIcon className="w-6 h-6" />
                                <span>Créer une partie</span>
                            </button>
                            <div className="relative flex py-3 items-center">
                                <div className="flex-grow border-t border-slate-600"></div>
                                <span className="flex-shrink mx-4 text-slate-400 font-typewriter text-sm">ou</span>
                                <div className="flex-grow border-t border-slate-600"></div>
                            </div>
                            <div className="bg-slate-800/50 backdrop-blur-md p-6 rounded-2xl border border-slate-700 shadow-xl">
                                <div className="space-y-4">
                                    <div className="relative">
                                        <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                        <input
                                            type="text"
                                            placeholder="Ton nom de villageois"
                                            value={playerName}
                                            onChange={(e) => setPlayerName(e.target.value)}
                                            className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                                        />
                                    </div>
                                    <div className="relative">
                                        <GamepadIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                        <input
                                            type="text"
                                            placeholder="Code secret de la partie"
                                            value={joinCode}
                                            onChange={(e) => setJoinCode(e.target.value)}
                                            className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                                        />
                                    </div>
                                    <button 
                                        onClick={handleJoinLobby} 
                                        disabled={!joinCode.trim() || !playerName.trim()} 
                                        className="w-full bg-gradient-to-r from-slate-700 to-slate-600 hover:from-cyan-600 hover:to-cyan-500 text-white font-black py-4 px-6 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-cyan-500/20 flex items-center justify-center space-x-3 uppercase tracking-widest text-sm"
                                    >
                                        <DoorOpenIcon className="w-5 h-5" />
                                        <span>Rejoindre le village</span>
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <button onClick={() => setView(GameView.ROLE_DIRECTORY)} className="flex items-center justify-center space-x-2 text-cyan-400 hover:text-cyan-300 font-bold py-3 px-4 rounded-lg transition-all border border-cyan-800 hover:border-cyan-600 hover:scale-105 btn-game">
                                    <BookIcon className="w-5 h-5" />
                                    <span>Rôles</span>
                                </button>
                                <button onClick={() => setView(GameView.HISTORY)} className="flex items-center justify-center space-x-2 text-cyan-400 hover:text-cyan-300 font-bold py-3 px-4 rounded-lg transition-all border border-cyan-800 hover:border-cyan-600 hover:scale-105 btn-game">
                                    <ScrollIcon className="w-5 h-5" />
                                    <span>Historique</span>
                                </button>
                            </div>
                        </div>
                    </div>
                );
            case GameView.CREATE_GAME:
                const groupedRoles = groupRolesByCategory(ROLES);
                return (
                    <div className="pb-24">
                        <div className="text-center mb-6">
                            <SettingsIcon className="w-12 h-12 mx-auto mb-3 text-cyan-400" />
                            <h2 className="text-4xl font-bold font-creepy text-glow">Configuration</h2>
                        </div>
                        <p className="text-slate-400 text-center mb-8 text-lg font-typewriter">Choisissez les rôles pour votre partie</p>
                        <div className="mb-8 bg-slate-800/50 backdrop-blur-sm p-6 rounded-2xl border border-slate-700 shadow-xl">
                           <label htmlFor="narratorName" className="block text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Ton nom de Narrateur</label>
                            <div className="relative">
                                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-500/50" />
                                <input
                                    id="narratorName"
                                    type="text"
                                    placeholder="Ex: Le Vieux Sage"
                                    value={narratorName}
                                    onChange={(e) => setNarratorName(e.target.value)}
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-4 pl-10 pr-4 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all font-typewriter"
                                />
                            </div>
                        </div>
                        <div className="space-y-8">
                            {Object.entries(groupedRoles).map(([category, roles]) => (
                                <div key={category}>
                                    <h3 className="text-2xl font-creepy text-cyan-400 border-b-2 border-cyan-800 pb-2 mb-6">{category}</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {roles.map(role => (
                                            <div key={role.id} className={`bg-slate-800 border border-slate-700 rounded-lg p-4 flex flex-col items-center border-t-4 ${teamColors[role.team]}`}>
                                                <role.icon className="w-12 h-12 mx-auto mb-2 text-cyan-400" />
                                                <h3 className="text-lg font-bold text-white text-center font-typewriter">{role.name}</h3>
                                                <p className="text-cyan-300 text-xs font-semibold mb-3 text-center">{role.power}</p>
                                                <div className="flex items-center space-x-4 mt-auto">
                                                    <button onClick={() => updateRoleCount(role.id, -1)} className="bg-slate-700 p-2 rounded-full hover:bg-slate-600 transition-colors"><MinusIcon className="w-5 h-5"/></button>
                                                    <span className="text-2xl font-bold w-10 text-center">{gameState.selectedRoles[role.id] || 0}</span>
                                                    <button onClick={() => updateRoleCount(role.id, 1)} className="bg-slate-700 p-2 rounded-full hover:bg-slate-600 transition-colors"><PlusIcon className="w-5 h-5"/></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="fixed bottom-0 left-0 right-0 bg-gray-900/80 backdrop-blur-sm p-4 border-t border-slate-700">
                            <div className="max-w-4xl mx-auto flex justify-between items-center">
                                <div className="flex items-center space-x-2">
                                    <UsersIcon className="w-6 h-6 text-slate-400" />
                                    <span className="text-xl font-bold">{totalSelectedRoles} Rôles</span>
                                </div>
                                <button onClick={handleStartLobby} disabled={totalSelectedRoles === 0} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-6 rounded-lg text-lg transition-transform transform hover:scale-105 disabled:bg-slate-700 disabled:cursor-not-allowed">
                                    Créer le Salon
                                </button>
                            </div>
                        </div>
                    </div>
                );
            case GameView.LOBBY:
                 const canStartGame = gameState.players.length -1 === totalSelectedRoles;
                return (
                    <div className="max-w-md mx-auto text-center pb-24">
                        <div className="mb-6">
                            <CircusIcon className="w-12 h-12 mx-auto mb-3 text-cyan-400" />
                            <h2 className="text-4xl font-bold font-creepy text-glow">Salon</h2>
                        </div>
                        {gameState.isNarrator && gameState.gameCode && (
                          <div className="mb-8">
                            <p className="text-slate-400 mb-3 font-typewriter">Partage ce code avec tes amis :</p>
                            
                            <div 
                                onClick={handleCopyCode}
                                className="group relative bg-slate-800 border-2 border-dashed border-slate-600 hover:border-cyan-500 rounded-2xl p-8 mb-6 cursor-pointer transition-all duration-300 shadow-lg hover:shadow-cyan-500/10"
                            >
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-900 px-4 py-1 rounded-full border border-slate-700 text-[10px] font-black text-slate-500 group-hover:text-cyan-400 tracking-[0.2em] transition-colors">
                                    {showCopied ? "COPIÉ !" : "CLIQUE POUR COPIER"}
                                </div>
                                <span className={`text-6xl font-mono tracking-[0.2em] block transition-all duration-300 ${showCopied ? 'text-green-400 scale-110' : 'text-cyan-400 group-hover:text-cyan-300'}`}>
                                    {gameState.gameCode}
                                </span>
                                <div className="mt-4 flex items-center justify-center text-slate-500 group-hover:text-cyan-400 transition-colors">
                                    {showCopied ? <ClipboardIcon className="w-5 h-5 mr-2 text-green-400" /> : <CopyIcon className="w-5 h-5 mr-2" />}
                                    <span className={`text-xs font-bold uppercase tracking-widest ${showCopied ? 'text-green-400' : ''}`}>
                                        {showCopied ? "Code copié dans le presse-papiers" : "Copier le code"}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6">
                                <p className="text-slate-500 font-black mb-5 text-[10px] uppercase tracking-[0.3em] text-center">Inviter les villageois via</p>
                                <div className="flex justify-center gap-5">
                                    <button 
                                        onClick={handleShareWhatsApp}
                                        className="group flex flex-col items-center gap-2"
                                    >
                                        <div className="bg-green-600/10 group-hover:bg-green-600 text-green-500 group-hover:text-white p-4 rounded-xl transition-all duration-300 transform group-hover:-translate-y-1 shadow-lg">
                                            <WhatsAppIcon className="w-6 h-6"/>
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">WhatsApp</span>
                                    </button>
                                    <button 
                                        onClick={handleShareSMS}
                                        className="group flex flex-col items-center gap-2"
                                    >
                                        <div className="bg-blue-600/10 group-hover:bg-blue-600 text-blue-500 group-hover:text-white p-4 rounded-xl transition-all duration-300 transform group-hover:-translate-y-1 shadow-lg">
                                            <SMSIcon className="w-6 h-6"/>
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">SMS</span>
                                    </button>
                                    <button 
                                        onClick={handleShareEmail}
                                        className="group flex flex-col items-center gap-2"
                                    >
                                        <div className="bg-purple-600/10 group-hover:bg-purple-600 text-purple-500 group-hover:text-white p-4 rounded-xl transition-all duration-300 transform group-hover:-translate-y-1 shadow-lg">
                                            <EmailIcon className="w-6 h-6"/>
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Email</span>
                                    </button>
                                    <button 
                                        onClick={handleShare}
                                        className="group flex flex-col items-center gap-2"
                                    >
                                        <div className="bg-cyan-600/10 group-hover:bg-cyan-600 text-cyan-500 group-hover:text-white p-4 rounded-xl transition-all duration-300 transform group-hover:-translate-y-1 shadow-lg">
                                            <ClipboardIcon className="w-6 h-6"/>
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Lien</span>
                                    </button>
                                </div>
                            </div>
                          </div>
                        )}
                        {!gameState.isNarrator && (
                            <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6 mb-8 text-center">
                                <div className="flex justify-center space-x-4 mb-4">
                                    <div className="w-3 h-3 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                    <div className="w-3 h-3 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: '200ms' }}></div>
                                    <div className="w-3 h-3 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: '400ms' }}></div>
                                </div>
                                <p className="text-xl font-creepy text-cyan-400 mb-2">Le village s'endort...</p>
                                <p className="text-slate-400 font-typewriter">En attente que le narrateur distribue les rôles et lance la partie.</p>
                            </div>
                        )}
                        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                            <h3 className="text-xl font-bold mb-4 flex items-center justify-center space-x-2">
                                <UsersIcon className="w-6 h-6"/>
                                <span>Joueurs ({gameState.players.length})</span>
                            </h3>
                            <ul className="space-y-3 text-left">
                                {gameState.players.length <= 1 && (
                                    <li className="text-center py-4 text-slate-500 italic font-typewriter">
                                        Aucun villageois n'est encore arrivé...
                                    </li>
                                )}
                                {gameState.players.map(player => (
                                    <li key={player.id} className="bg-slate-900 p-3 rounded-md flex items-center space-x-3">
                                        <UserIcon className="w-6 h-6 text-slate-400"/>
                                        <span className="font-semibold text-white">{player.name} {player.id === gameState.currentUser?.id && '(Vous)'}</span>
                                        {player.id === 'narrator' && <span className="text-xs bg-cyan-800 text-cyan-200 px-2 py-0.5 rounded-full">Narrateur</span>}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        {gameState.isNarrator && (
                          <div className="mt-6 space-y-3">
                            <button onClick={addSimulatedPlayer} className="w-full border-2 border-cyan-600 hover:bg-cyan-600/20 text-cyan-400 font-bold py-3 px-4 rounded-lg transition-colors">
                                Ajouter un joueur (simulation)
                            </button>
                             <button 
                                onClick={assignRoles} 
                                disabled={!canStartGame} 
                                className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-4 rounded-lg text-lg transition-colors disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed"
                            >
                                {totalSelectedRoles === (gameState.players.length - 1) 
                                    ? "Distribuer les Rôles" 
                                    : totalSelectedRoles < (gameState.players.length - 1)
                                        ? `Sélectionnez encore ${ (gameState.players.length - 1) - totalSelectedRoles } rôle(s)`
                                        : `Retirez ${ totalSelectedRoles - (gameState.players.length - 1) } rôle(s)`
                                }
                            </button>
                          </div>  
                        )}
                    </div>
                );
            case GameView.ROLE_REVEAL:
                const myRole = gameState.currentUser?.role || null;
                
                if (gameState.isNarrator) {
                    return (
                        <div className="max-w-4xl mx-auto pb-24">
                            <div className="text-center mb-8">
                                <h2 className="text-4xl font-bold font-creepy text-glow mb-2">Rôles Distribués</h2>
                                <p className="text-slate-400 font-typewriter">Voici la liste des rôles pour cette partie.</p>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                                {gameState.players.filter(p => p.id !== 'narrator').map(player => (
                                    <div key={player.id} className="bg-slate-800 border border-slate-700 rounded-lg p-4 text-center shadow-lg">
                                        <h3 className="text-xl font-bold text-white mb-2">{player.name}</h3>
                                        {player.role ? (
                                            <div className="flex flex-col items-center">
                                                <player.role.icon className="w-12 h-12 mb-2 text-cyan-400" />
                                                <p className="text-lg font-semibold text-cyan-300">{player.role.name}</p>
                                            </div>
                                        ) : (
                                            <p className="text-slate-500 italic">Attribution en cours...</p>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-center">
                                <button 
                                    onClick={() => setGameState(prev => ({ ...prev, view: GameView.PLAYERS_LIST }))}
                                    className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-8 rounded-full text-lg transition-all transform hover:scale-105 shadow-glow"
                                >
                                    Commencer la Nuit 🌙
                                </button>
                            </div>
                        </div>
                    );
                }

                return (
                    <div className="max-w-md mx-auto text-center pb-24">
                         <div className="mb-6">
                            <MaskIcon className="w-12 h-12 mx-auto mb-3 text-cyan-400" />
                            <h2 className="text-4xl font-bold font-creepy text-glow">Ton Rôle</h2>
                         </div>
                         <p className="text-slate-400 mb-8 text-lg font-typewriter">Gardez-le secret !</p>
                         {myRole ? (
                             !isRoleRevealed ? (
                                 <div 
                                     onClick={() => setIsRoleRevealed(true)}
                                     className="bg-slate-800 border-2 border-dashed border-slate-600 rounded-lg p-4 text-center cursor-pointer transform hover:scale-105 transition-transform duration-300 flex flex-col items-center justify-center min-h-[320px]"
                                 >
                                     <EyeOffIcon className="w-20 h-20 mx-auto mb-4 text-slate-500" />
                                     <h3 className="text-2xl font-bold text-white mb-2 font-creepy">Rôle Caché</h3>
                                     <p className="text-slate-400 font-typewriter">Cliquez pour Révéler</p>
                                 </div>
                             ) : (
                                 <RoleCard role={myRole}/>
                             )
                         ) : (
                             <div className="bg-slate-800 border border-slate-700 rounded-lg p-8">
                                 <p className="text-slate-400 font-typewriter mb-4">Le narrateur prépare la distribution...</p>
                                 <p className="text-slate-500 text-sm">En attente...</p>
                             </div>
                         )}

                         {myRole && (
                            <button 
                                onClick={() => setGameState(prev => ({ ...prev, view: GameView.PLAYERS_LIST }))}
                                className="mt-8 text-cyan-500 hover:text-cyan-400 font-bold flex items-center justify-center mx-auto space-x-2 transition-colors"
                            >
                                <UsersIcon className="w-5 h-5" />
                                <span>Voir les survivants</span>
                            </button>
                         )}
                    </div>
                );
            case GameView.PLAYERS_LIST:
                 return (
                    <div className="max-w-4xl mx-auto pb-24">
                         <div className="text-center mb-6">
                            <PeopleIcon className="w-12 h-12 mx-auto mb-3 text-cyan-400" />
                            <h2 className="text-4xl font-bold font-creepy text-glow">Les Joueurs</h2>
                         </div>
                         {gameState.isNarrator ? (
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {gameState.players.filter(p => p.id !== 'narrator').map(player => (
                                    <div key={player.id} className="bg-slate-800 border border-slate-700 rounded-lg p-4 text-center">
                                        <h3 className="text-xl font-bold text-white mb-2">{player.name}</h3>
                                        {player.role ? (
                                            <>
                                                <player.role.icon className="w-12 h-12 mx-auto my-3 text-cyan-400" />
                                                <p className="text-lg font-semibold text-cyan-300">{player.role.name}</p>
                                            </>
                                        ) : (
                                            <p className="text-slate-500">Aucun rôle</p>
                                        )}
                                    </div>
                                ))}
                             </div>
                         ) : (
                             <div className="max-w-md mx-auto">
                                <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6 text-center shadow-lg">
                                    <div className="animate-pulse mb-4">
                                        <MoonIcon className="w-12 h-12 mx-auto text-indigo-400" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-2 font-creepy">La Nuit Tombe...</h3>
                                    <p className="text-slate-400 font-typewriter">Fermez tous les yeux. Écoutez attentivement les instructions du narrateur.</p>
                                </div>

                                <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                                    <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3 text-center">Survivants</h4>
                                    <ul className="space-y-2">
                                        {gameState.players.filter(p => p.id !== 'narrator').map(player => (
                                            <li key={player.id} className="bg-slate-900/50 p-3 rounded-md flex items-center justify-between">
                                                <div className="flex items-center space-x-3">
                                                    <UserIcon className="w-5 h-5 text-slate-500"/>
                                                    <span className="text-slate-300">{player.name} {player.id === gameState.currentUser?.id && <span className="text-cyan-500 text-xs ml-1">(Vous)</span>}</span>
                                                </div>
                                                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                         )}
                         <div className="mt-8 flex justify-center">
                            <button 
                                onClick={() => setGameState(prev => ({ ...prev, view: GameView.ROLE_REVEAL }))}
                                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 px-6 rounded-lg border border-slate-700 transition-all flex items-center space-x-2"
                            >
                                <MaskIcon className="w-5 h-5" />
                                <span>{gameState.isNarrator ? "Récapitulatif des Rôles" : "Voir mon Rôle"}</span>
                            </button>
                         </div>                    </div>
                )
            case GameView.ROLE_DIRECTORY:
                const groupedFilteredRoles = groupRolesByCategory(filteredRoles);
                return (
                    <div className="max-w-4xl mx-auto pb-24">
                        <div className="text-center mb-6">
                            <BookOpenIcon className="w-12 h-12 mx-auto mb-3 text-cyan-400" />
                            <h2 className="text-4xl font-bold font-creepy text-glow">Guide des Rôles</h2>
                        </div>
                        <div className="flex justify-center gap-2 mb-8">
                            <button onClick={() => setRoleFilter(null)} className={`px-4 py-2 rounded-full text-sm font-semibold ${!roleFilter ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>Tous</button>
                            <button onClick={() => setRoleFilter(Team.VILLAGER)} className={`px-4 py-2 rounded-full text-sm font-semibold ${roleFilter === Team.VILLAGER ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>Villageois</button>
                            <button onClick={() => setRoleFilter(Team.WEREWOLF)} className={`px-4 py-2 rounded-full text-sm font-semibold ${roleFilter === Team.WEREWOLF ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>Loups-Garous</button>
                            <button onClick={() => setRoleFilter(Team.SOLO)} className={`px-4 py-2 rounded-full text-sm font-semibold ${roleFilter === Team.SOLO ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>Solitaires</button>
                        </div>

                        <div className="space-y-8">
                           {Object.entries(groupedFilteredRoles).map(([category, roles]) => (
                                <div key={category}>
                                    <h3 className="text-2xl font-creepy text-cyan-400 border-b-2 border-cyan-800 pb-2 mb-6">{category}</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {roles.map(role => <RoleCard key={role.id} role={role} />)}
                                    </div>
                                </div>
                           ))}
                        </div>
                    </div>
                );
            case GameView.HISTORY:
                const history = getHistory();
                const stats = getStats();
                
                const formatDate = (dateString: string) => {
                    const date = new Date(dateString);
                    return date.toLocaleDateString('fr-FR', { 
                        day: 'numeric', 
                        month: 'short', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                    });
                };
                
                const handleClearHistory = () => {
                    if (confirm('Êtes-vous sûr de vouloir supprimer tout l\'historique ?')) {
                        clearHistory();
                        // Forcer le re-render
                        setGameState(prev => ({ ...prev }));
                    }
                };
                
                const handleDeleteGame = (gameId: string) => {
                    deleteGame(gameId);
                    setGameState(prev => ({ ...prev }));
                };
                
                return (
                    <div className="max-w-4xl mx-auto pb-24">
                        <div className="text-center mb-6">
                            <ScrollIcon className="w-12 h-12 mx-auto mb-3 text-cyan-400" />
                            <h2 className="text-4xl font-bold font-creepy text-glow">Historique</h2>
                        </div>
                        <p className="text-slate-400 text-center mb-8 text-lg font-typewriter">Vos parties précédentes</p>
                        
                        {/* Statistiques */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 text-center">
                                <p className="text-slate-400 text-sm mb-1">Parties créées</p>
                                <p className="text-3xl font-bold text-cyan-400">{stats.totalGamesCreated}</p>
                            </div>
                            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 text-center">
                                <p className="text-slate-400 text-sm mb-1">Parties rejointes</p>
                                <p className="text-3xl font-bold text-cyan-400">{stats.totalGamesJoined}</p>
                            </div>
                            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 text-center">
                                <p className="text-slate-400 text-sm mb-1">Total</p>
                                <p className="text-3xl font-bold text-white">{stats.totalGamesCreated + stats.totalGamesJoined}</p>
                            </div>
                        </div>
                        
                        {/* Rôles joués */}
                        {Object.keys(stats.rolesPlayed).length > 0 && (
                            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-8">
                                <h3 className="text-xl font-bold mb-4 font-creepy text-cyan-400">Rôles joués</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {Object.entries(stats.rolesPlayed)
                                        .sort((a, b) => b[1] - a[1])
                                        .map(([role, count]) => (
                                            <div key={role} className="bg-slate-900 rounded-lg p-3 flex justify-between items-center">
                                                <span className="text-sm">{role}</span>
                                                <span className="text-cyan-400 font-bold">×{count}</span>
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>
                        )}
                        
                        {/* Liste des parties */}
                        {history.length === 0 ? (
                            <div className="bg-slate-800 border border-slate-700 rounded-lg p-8 text-center">
                                <HistoryIcon className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                                <p className="text-slate-400">Aucune partie dans l'historique</p>
                                <p className="text-slate-500 text-sm mt-2">Créez ou rejoignez une partie pour commencer !</p>
                            </div>
                        ) : (
                            <>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xl font-bold">Parties ({history.length})</h3>
                                    <button 
                                        onClick={handleClearHistory}
                                        className="flex items-center space-x-2 text-red-400 hover:text-red-300 transition-colors text-sm"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                        <span>Tout supprimer</span>
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {history.map((game) => (
                                        <div 
                                            key={game.id} 
                                            className="bg-slate-800 border border-slate-700 rounded-lg p-4"
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <div className="flex items-center space-x-2 mb-2">
                                                        <span className="px-2 py-1 rounded text-xs font-semibold bg-cyan-900 text-cyan-300">
                                                            {game.type === 'created' ? '👑 Créée' : '🎮 Rejointe'}
                                                        </span>
                                                        <span className="text-slate-400 text-sm">{formatDate(game.date)}</span>
                                                    </div>
                                                    <p className="text-2xl font-mono font-bold text-white mb-2">{game.code}</p>
                                                    {game.playerCount && (
                                                        <p className="text-slate-400 text-sm">
                                                            {game.playerCount} joueur{game.playerCount > 1 ? 's' : ''}
                                                        </p>
                                                    )}
                                                    {game.myRole && (
                                                        <p className="text-cyan-400 text-sm font-semibold">
                                                            Rôle : {game.myRole}
                                                        </p>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteGame(game.id)}
                                                    className="text-slate-500 hover:text-red-400 transition-colors p-2"
                                                >
                                                    <TrashIcon className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                );
            default:
                return <p>Erreur: Vue inconnue</p>;
        }
    };
    
    const isGameScreen = ![GameView.HOME, GameView.CREATE_GAME].includes(gameState.view);

    return (
        <div className="min-h-screen text-gray-200 p-4 sm:p-6">
            {/* Indicateur de chargement */}
            {isLoading && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
                    <div className="bg-slate-800 border-2 border-cyan-600 rounded-lg p-8 text-center max-w-sm mx-4 shadow-2xl">
                        <div className="animate-spin-glow rounded-full h-16 w-16 border-4 border-slate-600 border-t-cyan-500 mx-auto mb-4"></div>
                        <p className="text-xl font-bold text-white mb-2 font-creepy">{loadingMessage}</p>
                        <p className="text-slate-400 text-sm font-typewriter">Veuillez patienter...</p>
                    </div>
                </div>
            )}
            
            <div className="max-w-5xl mx-auto">
                 {gameState.view !== GameView.HOME && (
                    <header className="mb-8">
                        <button onClick={resetGame} className="flex items-center space-x-2 text-slate-400 hover:text-white transition-colors">
                            <HomeIcon className="w-6 h-6" />
                            <span>Accueil</span>
                        </button>
                    </header>
                )}
                <main className="animate-fadeIn">
                    {renderView()}
                </main>

                {isGameScreen && (
                  <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/80 backdrop-blur-sm border-t border-slate-700 flex justify-around">
                      <button onClick={() => setView(gameState.isNarrator ? GameView.LOBBY : GameView.ROLE_REVEAL)} className={`flex flex-col items-center p-3 transition-colors ${[GameView.LOBBY, GameView.ROLE_REVEAL].includes(gameState.view) ? 'text-cyan-400' : 'text-slate-400 hover:text-cyan-400'}`}>
                          <SwordsIcon className="w-6 h-6 mb-1"/>
                          <span className="text-xs font-medium">Partie</span>
                      </button>
                      <button onClick={() => setView(GameView.PLAYERS_LIST)} className={`flex flex-col items-center p-3 transition-colors ${gameState.view === GameView.PLAYERS_LIST ? 'text-cyan-400' : 'text-slate-400 hover:text-cyan-400'}`}>
                          <UsersIcon className="w-6 h-6 mb-1"/>
                          <span className="text-xs font-medium">Joueurs</span>
                      </button>
                      <button onClick={() => setView(GameView.ROLE_DIRECTORY)} className={`flex flex-col items-center p-3 transition-colors ${gameState.view === GameView.ROLE_DIRECTORY ? 'text-cyan-400' : 'text-slate-400 hover:text-cyan-400'}`}>
                          <BookOpenIcon className="w-6 h-6 mb-1"/>
                          <span className="text-xs font-medium">Rôles</span>
                      </button>
                  </nav>
                )}
            </div>
        </div>
    );
}