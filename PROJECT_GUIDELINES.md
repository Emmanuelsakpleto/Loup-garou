## Loup-Garou — Guidelines techniques, produit & monétisation

Ce document centralise :
- les bonnes pratiques pour les paramètres (sans création de compte),
- les instructions front-end et back-end concrètes (architecture, schéma, endpoints, sécurité, CI/CD, tests),
- des stratégies de monétisation (Play Store + idées complémentaires),
- une checklist minimale pour la V1 et propositions d'étapes suivantes.

> Rédigé en français. Utilisez ce fichier comme base pour le README produit, la roadmap technique, ou la spec pour un développeur backend.

---

## 1) Best practices pour les paramètres (sans compte utilisateur)

Objectif : garder l'app simple (pas d'auth), tout en étant sûre, personnalisable et conviviale.

### A. Mode sans compte — principes
- Aucun login obligatoire : les joueurs choisissent un pseudo à l'entrée.
- Propriété temporaire de la partie : la personne qui crée le jeu (narrateur) est l'"hôte" identifiée par un `hostToken` (jeton éphémère stocké côté client et côté serveur sous forme hashée).
- Sessions éphémères : la partie expire automatiquement après X heures d'inactivité (ex. 24–48 h).
- Données minimales stockées : `gameCode`, liste de joueurs (pseudo, id anonyme), rôles attribués (cachés), état du jeu. Pas de stockage d'informations personnelles.

### B. Paramètres exposés dans l'UI (bonnes pratiques UX)
- Nom de la partie (optionnel).
- Visibilité : public (n'importe qui avec le code) / privé (code + mot de passe optionnel).
- Nombre de joueurs — validation en temps réel (min/max selon roles sélectionnés).
- Pack de rôles : Classique, Avancé, Nuit courte, Fun + mode Custom (sélection manuelle).
- Options de distribution : aléatoire stricte / distribution contrôlée.
- Langue & localisation : interface + fiches rôles.
- Mode révélation : "Tap pour révéler" (sécurité physique) / "Full screen secret" (affichage plein écran, orientation verrouillée).
- Durée de la nuit / du jour (pour versions auto-narrées) — sliders.
- Son & notifications : son on/off, vibration, notifications push on/off.
- Politique de confidentialité accessible si analytics/ads.

### C. Controls & protections
- Host recovery : code de récupération (phrase courte) généré au create-game pour restaurer l'hôte (limiter usage et rotation).
- Kick / Ban simple : l'hôte peut exclure un pseudo (ban temporaire).
- Rate-limit pour création de parties / invitations.
- Log minimal d'événements pour debug, avec horizon de rétention (ex. 7 jours).

---

## 2) Frontend — instructions & best practices (PWA-ready)

### Stack recommandé
- Framework : React + Vite
- Styles : Tailwind CSS (CDN pour prototype ou intégration dev pour production)
- State : React Context ou Zustand pour UI; socket events pour état partagé
- Real-time : Firebase Realtime/Firestore ou backend Node.js + Socket.IO
- PWA : manifest.json, service worker (Workbox), offline shell
- Play Store (option) : empaqueter en TWA (Trusted Web Activity)

### Structure suggérée
```
/src
  /components
    RoleCard.tsx
    PlayerList.tsx
    HostPanel.tsx
    SecretRevealModal.tsx
  /pages
    Home.tsx
    CreateGame.tsx
    JoinGame.tsx
    GameRoom.tsx
    RolesLibrary.tsx
  /services
    api.ts       // fetch / socket wrappers
    pwa.ts
  /hooks
    useGameState.ts
  /data
    roles.json
  main.tsx
  manifest.json
  service-worker.js
```

### Composants & UX clés
- Home : CTA clair (Créer / Rejoindre)
- CreateGame : wizard (pack, customisation, preview). Génère code + lien partageable.
- GameRoom (host) : liste joueurs, config finale, bouton "Distribuer rôles".
- GameRoom (player) : bouton "Afficher mon rôle" — plein écran, verrouillage orientation.
- RolesLibrary : recherche/filtre (camp, difficulté), fiches roles.

### Accessibilité & i18n
- ARIA, contraste WCAG AA, navigation clavier.
- i18n (react-i18next) : fiches FR/EN par défaut.

### Offline & performance
- IndexedDB/localStorage pour reprise locale minimale.
- Lazy-load des images, optimiser formats (webp).

### Sécurité côté client
- Ne jamais garder le rôle secret dans le DOM accessible globalement. Rôle révélé uniquement après vérification serveur ou via socket pour l'ID de joueur.
- Sanitize pseudos et inputs.

---

## 3) Backend — instructions & best practices

Deux options viables selon budget et charge : Serverless (Firebase) pour MVP rapide, ou Node.js + Socket.IO + Postgres pour contrôle total.

### A. Endpoints & realtime (exemples)
- POST /create-game
  - body: { hostName, settings }
  - returns: { gameId, code, hostToken }

- POST /join-game
  - body: { code, pseudo }
  - returns: { playerId, gameState (sanitized) }

- POST /start-distribution  (host only)
  - body: { gameId, hostToken }
  - server : génère distribution, update server-side players.roleId (caché)

- GET /player-role?gameId=&playerId=&playerToken=
  - returns: { role } (unique au playerId) — vérifie token/session

WebSocket channel : `game-{gameId}` pour events (player-joined, roles-distributed, vote-started, night-end, etc.)

### B. Exemple de data model (minimal)
```
Game {
  id,
  code,
  hostTokenHash,
  settings: { pack, visibility, maxPlayers, language },
  players: [{ id, pseudo, isAlive, roleId (server-only), secretRevealAt }],
  status: 'lobby'|'playing'|'finished',
  logs: [...],
  createdAt
}
```

Ne jamais exposer `roleId` via API publique. Seul l'endpoint dédié renvoie le rôle au bon `playerId`.

### C. Sécurité & scalabilité
- HostToken : généré serveur, stocké hashé ; client conserve le token en clair localement.
- Rate-limit endpoints critiques.
- Validation server-side pour toutes règles de distribution.
- Logs d'audit et retention (rotation, TTL deletes).

### D. Notifications & push
- FCM pour mobile, Web Push (VAPID) pour navigateur.

### E. Privacy / conformité
- Consent banner si collecte analytics/ads.
- Privacy policy accessible et conformité GDPR/CCPA.

---

## 4) Tests, CI/CD, monitoring

### Tests
- Unit : Jest + React Testing Library
- E2E : Cypress (scénarios : créer/join/distribuer/révéler)
- Load : k6 pour endpoints critiques
- Security : Snyk / Dependabot

### CI/CD
- GitHub Actions : lint, build, test, déploiement
- Frontend hosting : Vercel / Netlify / Firebase Hosting
- Backend : Cloud Run / Firebase Functions / Supabase / Heroku

### Monitoring
- Erreurs : Sentry
- Usage : Google Analytics 4 / Firebase Analytics

---

## 5) Monétisation (Play Store & idées complémentaires)

### A. Modèles principaux
1. Freemium + IAP : packs de rôles premium, cosmétiques, thèmes.
2. Abonnement : "Pass Narrateur Pro" (packs illimités, sauvegardes, stats avancées).
3. Publicités (AdMob) : bannières discrètes / interstitiels hors moment sensible.
4. One-time paid app : moins recommandé.

### B. UX & compliance
- Ne pas interrompre la révélation du rôle avec pub.
- Respecter Play Billing pour ventes via Play Store (si TWA/native).
- Age-gate si contenu sensible.

### C. Idées avancées
- Marketplace de packs utilisateurs (commission)
- Évènements saisonniers payants

---

## 6) Rétention & growth

- Features : historique & stats, badges, challenges, parrainage.
- Acquisition : ASO (mots clés : loup-garou, werewolf, party game), landing page, vidéos courtes.
- Localisation prioritaire : FR/EN/ES/PT.

---

## 7) KPI à suivre
- DAU / MAU
- Retention D1/D7/D30
- Conversion (visiteur → joueur → acheteur)
- ARPU / LTV
- Session length
- Crash rate

---

## 8) Checklist technique minimale pour la V1

- [ ] PWA manifest + service worker + HTTPS
- [ ] Distribution des rôles server-side sécurisée
- [ ] Share API + génération liens / codes (4–6 chars)
- [ ] Mode "Afficher mon rôle" sécurisé en full screen
- [ ] RolesLibrary FR/EN + images optimisées
- [ ] Tests unitaires + E2E
- [ ] Privacy policy + consent banner
- [ ] Analytics basique + consent
- [ ] Option "Remove Ads" (IAP) / packs premium
- [ ] Build TWA pour Play Store (option)
- [ ] Pipeline CI/CD + monitoring (Sentry)

---

## 9) Prochaines étapes / Je peux faire pour toi

Choix rapides :
- Générer un fichier `data/roles.json` (schéma recommandé, exportable pour backend).
- Générer le scaffold React + PWA (arborescence + composants RoleCard, HostPanel, GameRoom).
- Écrire une implémentation backend d'exemple (Node.js + Socket.IO + endpoints ci-dessus).
- Préparer les assets pour Play Store (icônes, screenshots, texte ASO).

Indiquez l'option que vous préférez et je génèrerai les fichiers correspondants dans le dépôt.

---

### Annexes rapides

Endpoint example (POST /create-game) — request/response JSON :
```
POST /create-game
Body: { hostName: "Paul", settings: { pack: "classique", visibility: "public" } }
Response: { gameId: "uuid", code: "AB12CD", hostToken: "<token>" }
```

Roles JSON schema recommandé (extrait) :
```
{
  "id": "werewolf",
  "name": { "fr": "Loup-Garou", "en": "Werewolf" },
  "camp": "WEREWOLF",
  "difficulty": "normal",
  "shortDesc": { "fr": "Vote la nuit", "en": "Votes at night" },
  "longDesc": { ... },
  "imagePath": "/assets/roles/werewolf.png",
  "isPremium": false,
  "tags": ["attack","team-play"]
}
```
