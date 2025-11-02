# Structure du projet Loup-Garou

## Organisation des dossiers

### Frontend (Loup-garou/)
```
Loup-garou/
├── public/                      # Assets statiques (manifest, service-worker, icons)
│   ├── manifest.json
│   ├── service-worker.js
│   └── icons/                   # À créer : icônes PWA 192x192 et 512x512
├── src/                         # Code source principal
│   ├── components/              # Composants React réutilisables
│   │   └── icons.tsx           # ✅ Déjà présent
│   ├── hooks/                   # Custom hooks React
│   ├── services/                # Wrappers API et logique externe
│   ├── data/                    # Données statiques (roles.json)
│   ├── App.tsx                  # ⚠️ À déplacer depuis racine
│   ├── index.tsx                # ⚠️ À déplacer depuis racine
│   ├── types.ts                 # ⚠️ À déplacer depuis racine
│   └── constants.ts             # ⚠️ À déplacer depuis racine
├── index.html                   # Point d'entrée HTML
├── vite.config.ts
├── tsconfig.json
├── package.json
├── PROJECT_GUIDELINES.md        # Guidelines produit et tech
└── README.md

⚠️ À supprimer :
- frontend_best_practices/       # Exemples temporaires (déjà intégrés)
- backend_best_practices/         # Exemples temporaires (déjà intégrés)
- backend/                        # Dossier backend mal placé (déjà créé séparément)
```

### Backend (Backend-loup-garou/)
```
Backend-loup-garou/
├── src/
│   ├── routes/                  # ✅ Routes Express
│   │   └── game.ts
│   ├── lib/                     # ✅ Utilitaires
│   │   └── store.ts
│   ├── socket.ts                # ✅ Config Socket.IO
│   ├── types.ts                 # ✅ Types TypeScript
│   └── index.ts                 # ✅ Point d'entrée
├── dist/                        # Build output (généré)
├── Dockerfile                   # ✅ Container config
├── .env.example                 # ✅ Variables d'env
├── .gitignore                   # ✅
├── tsconfig.json                # ✅
├── package.json                 # ✅
└── README.md                    # ✅
```

## Actions à faire manuellement

### 1. Déplacer les fichiers frontend vers src/
```bash
cd "c:\Users\emman\Downloads\Loup-garou"
mv App.tsx src/
mv index.tsx src/
mv types.ts src/
mv constants.ts src/
mv data src/
```

### 2. Mettre à jour les imports dans index.html
Modifier la ligne :
```html
<script type="module" src="/index.tsx"></script>
```
En :
```html
<script type="module" src="/src/index.tsx"></script>
```

### 3. Mettre à jour les imports relatifs dans les fichiers déplacés
- Dans `src/index.tsx` : `import App from './App'`
- Dans `src/App.tsx` : `import { ROLES } from './constants'`, `import type { ... } from './types'`

### 4. Supprimer les dossiers temporaires
```bash
rm -rf frontend_best_practices
rm -rf backend_best_practices
rm -rf backend
```

### 5. Créer les icônes PWA
Générer deux icônes (192x192 et 512x512) et les placer dans `public/icons/`.

## Prochaines étapes techniques

1. ✅ Backend opérationnel sur port 5174
2. ⏳ Intégrer Socket.IO client dans frontend
3. ⏳ Connecter frontend aux endpoints backend
4. ⏳ Enregistrer le service worker dans index.tsx
5. ⏳ Ajouter endpoint de distribution sécurisée des rôles
