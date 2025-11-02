// FIX: Corrected the React import by removing the extraneous 'a,'.
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { GameView, type GameState, type Player, type Role, Team } from './types';
import { ROLES } from './constants';
import { createGame, joinGame, getGame, assignRoles as assignRolesAPI, initSocket, joinGameRoom, getSocket } from './services/api';
import {
  BookOpenIcon,
  ClipboardIcon,
  CopyIcon,
  EmailIcon,
  EyeOffIcon,
  HomeIcon,
  MinusIcon,
  PlusIcon,
  SMSIcon,
  SwordsIcon,
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
    <div className={`bg-slate-800 border border-slate-700 rounded-lg p-4 text-center transform hover:scale-105 transition-transform duration-300 flex flex-col h-full border-t-4 ${teamColors[role.team]}`}>
        <role.icon className="w-16 h-16 mx-auto mb-3 text-cyan-400" />
        <h3 className="text-xl font-bold text-white mb-1 font-serif">{role.name}</h3>
        <p className="text-cyan-300 text-sm font-semibold mb-2">{role.power}</p>
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
            setGameState(prev => {
                // Mettre à jour les joueurs avec leurs rôles
                const updatedPlayers = data.players.map(p => {
                    const role = p.roleId ? ROLES.find(r => r.id === p.roleId) : undefined;
                    return { id: p.id, name: p.name, role };
                });
                return {
                    ...prev,
                    players: updatedPlayers,
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
        try {
            const result = await createGame(narratorName, {
                selectedRoles: gameState.selectedRoles,
            });
            
            console.log('✅ Jeu créé:', result);
            
            // Récupérer les données complètes du jeu
            const gameData = await getGame(result.gameId);
            console.log('📋 Données du jeu:', gameData.game);
            
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
        }
    };

    const handleJoinLobby = async () => {
        if (joinCode.trim() && playerName.trim()) {
            try {
                const result = await joinGame(joinCode.trim().toUpperCase(), playerName);
                
                console.log('✅ Jeu rejoint:', result);
                
                // Récupérer la liste complète des joueurs depuis le backend
                const gameData = await getGame(result.gameId);
                console.log('📋 Liste complète des joueurs:', gameData.game.players);
                
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

        try {
            console.log('🎭 Demande d\'attribution des rôles...');
            await assignRolesAPI(gameState.gameId, gameState.hostToken, gameState.selectedRoles);
            console.log('✅ Demande envoyée, en attente de la réponse via Socket.IO...');
            // L'événement 'roles-assigned' sera reçu via Socket.IO et mettra à jour l'état
        } catch (error) {
            console.error('❌ Erreur lors de l\'attribution des rôles:', error);
            alert('Impossible d\'attribuer les rôles. Vérifiez que le backend est bien lancé.');
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
                            <WerewolfIcon className="w-24 h-24 mx-auto text-red-500" />
                            <h1 className="text-4xl md:text-5xl font-bold font-serif mt-4 text-white">Loup-Garou</h1>
                            <p className="text-slate-400 mt-2">Le village s'endort...</p>
                        </div>
                        <div className="space-y-4 max-w-sm mx-auto">
                            <button onClick={handleCreateGame} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-4 rounded-lg text-lg transition-transform transform hover:scale-105">
                                Créer une partie
                            </button>
                            <div className="relative flex py-3 items-center">
                                <div className="flex-grow border-t border-slate-600"></div>
                                <span className="flex-shrink mx-4 text-slate-400">ou</span>
                                <div className="flex-grow border-t border-slate-600"></div>
                            </div>
                            <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                                <input
                                    type="text"
                                    placeholder="Nom du joueur"
                                    value={playerName}
                                    onChange={(e) => setPlayerName(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-600 rounded-md p-3 mb-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                />
                                <input
                                    type="text"
                                    placeholder="Code de la partie"
                                    value={joinCode}
                                    onChange={(e) => setJoinCode(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-600 rounded-md p-3 mb-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                />
                                <button onClick={handleJoinLobby} disabled={!joinCode.trim() || !playerName.trim()} className="w-full bg-slate-600 hover:bg-slate-700 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed">
                                    Rejoindre une partie
                                </button>
                            </div>
                             <button onClick={() => setView(GameView.ROLE_DIRECTORY)} className="w-full text-cyan-400 hover:text-cyan-300 font-bold py-3 px-4 rounded-lg transition-colors">
                                Consulter les rôles
                            </button>
                        </div>
                    </div>
                );
            case GameView.CREATE_GAME:
                const groupedRoles = groupRolesByCategory(ROLES);
                return (
                    <div className="pb-24">
                        <h2 className="text-3xl font-bold text-center mb-2 font-serif">Configuration de la Partie</h2>
                        <p className="text-slate-400 text-center mb-8">Choisissez les rôles pour votre partie.</p>
                        <div className="mb-6 bg-slate-800 p-4 rounded-lg border border-slate-700">
                           <label htmlFor="narratorName" className="block text-sm font-medium text-slate-300 mb-2">Votre nom (Narrateur)</label>
                            <input
                                id="narratorName"
                                type="text"
                                value={narratorName}
                                onChange={(e) => setNarratorName(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-600 rounded-md p-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                        </div>
                        <div className="space-y-8">
                            {Object.entries(groupedRoles).map(([category, roles]) => (
                                <div key={category}>
                                    <h3 className="text-2xl font-serif text-cyan-400 border-b-2 border-cyan-800 pb-2 mb-6">{category}</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {roles.map(role => (
                                            <div key={role.id} className={`bg-slate-800 border border-slate-700 rounded-lg p-4 flex flex-col items-center border-t-4 ${teamColors[role.team]}`}>
                                                <role.icon className="w-12 h-12 mx-auto mb-2 text-cyan-400" />
                                                <h3 className="text-lg font-bold text-white text-center">{role.name}</h3>
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
                        <h2 className="text-3xl font-bold font-serif mb-4">Salon de la Partie</h2>
                        {gameState.isNarrator && gameState.gameCode && (
                          <div className="mb-6">
                            <p className="text-slate-400 mb-2">Code de la partie :</p>
                            <div className="bg-slate-800 border-2 border-dashed border-slate-600 rounded-lg p-4 mb-4">
                                <span className="text-4xl font-mono tracking-widest text-cyan-400 block">{gameState.gameCode}</span>
                                <button 
                                    onClick={handleCopyCode} 
                                    className="mt-3 w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                                >
                                    <CopyIcon className="w-5 h-5"/>
                                    <span>Copier le code</span>
                                </button>
                            </div>
                            
                            <div className="bg-slate-800 border border-slate-600 rounded-lg p-4 mb-3">
                                <p className="text-slate-300 font-semibold mb-3 text-sm">📤 Inviter des joueurs</p>
                                <div className="grid grid-cols-2 gap-2 mb-3">
                                    <button 
                                        onClick={handleShareWhatsApp}
                                        className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-3 rounded-lg transition-colors flex items-center justify-center space-x-2 text-sm"
                                    >
                                        <WhatsAppIcon className="w-5 h-5"/>
                                        <span>WhatsApp</span>
                                    </button>
                                    <button 
                                        onClick={handleShareSMS}
                                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-3 rounded-lg transition-colors flex items-center justify-center space-x-2 text-sm"
                                    >
                                        <SMSIcon className="w-5 h-5"/>
                                        <span>SMS</span>
                                    </button>
                                    <button 
                                        onClick={handleShareEmail}
                                        className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-3 rounded-lg transition-colors flex items-center justify-center space-x-2 text-sm"
                                    >
                                        <EmailIcon className="w-5 h-5"/>
                                        <span>Email</span>
                                    </button>
                                    <button 
                                        onClick={handleShare}
                                        className="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-2 px-3 rounded-lg transition-colors flex items-center justify-center space-x-2 text-sm"
                                    >
                                        <ClipboardIcon className="w-5 h-5"/>
                                        <span>Copier</span>
                                    </button>
                                </div>
                                {showCopied && <p className="text-green-400 text-sm text-center animate-pulse">✅ Copié dans le presse-papiers !</p>}
                            </div>
                          </div>
                        )}
                        {!gameState.isNarrator && (
                            <p className="text-slate-400 mb-6">En attente du démarrage de la partie par le narrateur...</p>
                        )}
                        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                            <h3 className="text-xl font-bold mb-4 flex items-center justify-center space-x-2">
                                <UsersIcon className="w-6 h-6"/>
                                <span>Joueurs ({gameState.players.length})</span>
                            </h3>
                            <ul className="space-y-3 text-left">
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
                             <button onClick={assignRoles} disabled={!canStartGame} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-4 rounded-lg text-lg transition-colors disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed">
                                {canStartGame ? "Distribuer les Rôles" : `Ajoutez ${totalSelectedRoles - (gameState.players.length - 1)} joueur(s)`}
                            </button>
                          </div>  
                        )}
                    </div>
                );
            case GameView.ROLE_REVEAL:
                const myRole = gameState.currentUser?.id ? gameState.players.find(p => p.id === gameState.currentUser!.id)?.role : null;
                return (
                    <div className="max-w-md mx-auto text-center pb-24">
                         <h2 className="text-3xl font-bold font-serif mb-2">Votre Rôle est...</h2>
                         <p className="text-slate-400 mb-8">Gardez-le secret !</p>
                         {myRole ? (
                             !isRoleRevealed ? (
                                 <div 
                                     onClick={() => setIsRoleRevealed(true)}
                                     className="bg-slate-800 border-2 border-dashed border-slate-600 rounded-lg p-4 text-center cursor-pointer transform hover:scale-105 transition-transform duration-300 flex flex-col items-center justify-center min-h-[320px]"
                                 >
                                     <EyeOffIcon className="w-20 h-20 mx-auto mb-4 text-slate-500" />
                                     <h3 className="text-2xl font-bold text-white mb-2 font-serif">Rôle Caché</h3>
                                     <p className="text-slate-400">Cliquez pour Révéler</p>
                                 </div>
                             ) : (
                                 <RoleCard role={myRole}/>
                             )
                         ) : <p>Attente d'attribution...</p>}
                    </div>
                );
            case GameView.PLAYERS_LIST:
                 return (
                    <div className="max-w-4xl mx-auto pb-24">
                         <h2 className="text-3xl font-bold text-center mb-6 font-serif">Liste des Joueurs</h2>
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
                             <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 max-w-md mx-auto">
                                <ul className="space-y-3 text-left">
                                    {gameState.players.map(player => (
                                        <li key={player.id} className="bg-slate-900 p-3 rounded-md flex items-center space-x-3">
                                            <UserIcon className="w-6 h-6 text-slate-400"/>
                                            <span className="font-semibold text-white">{player.name} {player.id === gameState.currentUser?.id && '(Vous)'}</span>
                                            {player.id === 'narrator' && <span className="text-xs bg-cyan-800 text-cyan-200 px-2 py-0.5 rounded-full">Narrateur</span>}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                         )}
                    </div>
                )
            case GameView.ROLE_DIRECTORY:
                const groupedFilteredRoles = groupRolesByCategory(filteredRoles);
                return (
                    <div className="max-w-4xl mx-auto pb-24">
                        <h2 className="text-3xl font-bold text-center mb-4 font-serif">Guide des Rôles</h2>
                        <div className="flex justify-center gap-2 mb-8">
                            <button onClick={() => setRoleFilter(null)} className={`px-4 py-2 rounded-full text-sm font-semibold ${!roleFilter ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>Tous</button>
                            <button onClick={() => setRoleFilter(Team.VILLAGER)} className={`px-4 py-2 rounded-full text-sm font-semibold ${roleFilter === Team.VILLAGER ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>Villageois</button>
                            <button onClick={() => setRoleFilter(Team.WEREWOLF)} className={`px-4 py-2 rounded-full text-sm font-semibold ${roleFilter === Team.WEREWOLF ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>Loups-Garous</button>
                            <button onClick={() => setRoleFilter(Team.SOLO)} className={`px-4 py-2 rounded-full text-sm font-semibold ${roleFilter === Team.SOLO ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>Solitaires</button>
                        </div>

                        <div className="space-y-8">
                           {Object.entries(groupedFilteredRoles).map(([category, roles]) => (
                                <div key={category}>
                                    <h3 className="text-2xl font-serif text-cyan-400 border-b-2 border-cyan-800 pb-2 mb-6">{category}</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {roles.map(role => <RoleCard key={role.id} role={role} />)}
                                    </div>
                                </div>
                           ))}
                        </div>
                    </div>
                );
            default:
                return <p>Erreur: Vue inconnue</p>;
        }
    };
    
    const isGameScreen = ![GameView.HOME, GameView.CREATE_GAME].includes(gameState.view);

    return (
        <div className="min-h-screen text-gray-200 p-4 sm:p-6">
            <div className="max-w-5xl mx-auto">
                 {gameState.view !== GameView.HOME && (
                    <header className="mb-8">
                        <button onClick={resetGame} className="flex items-center space-x-2 text-slate-400 hover:text-white transition-colors">
                            <HomeIcon className="w-6 h-6" />
                            <span>Accueil</span>
                        </button>
                    </header>
                )}
                <main>
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