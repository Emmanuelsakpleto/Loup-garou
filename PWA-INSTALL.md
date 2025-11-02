# 📱 Installation PWA - Loup-Garou

## ✅ Service Worker Activé

Le service worker est maintenant enregistré et actif ! Votre application Loup-Garou fonctionne en mode PWA (Progressive Web App).

## 🚀 Fonctionnalités PWA

### 1. **Mode Hors Ligne**
- Les assets statiques (JS, CSS, fonts) sont mis en cache
- L'application reste accessible même sans connexion Internet
- Les parties en cours sont sauvegardées localement

### 2. **Installation sur Mobile/Desktop**
- **Android (Chrome)** : Appuyez sur le menu ⋮ → "Installer l'application"
- **iOS (Safari)** : Appuyez sur le bouton de partage → "Sur l'écran d'accueil"
- **Desktop (Chrome/Edge)** : Cliquez sur l'icône ⊕ dans la barre d'adresse

### 3. **Mises à Jour Automatiques**
- Le service worker vérifie les nouvelles versions
- Notification automatique quand une mise à jour est disponible
- Rechargement proposé pour appliquer les mises à jour

## 🎨 Stratégies de Cache

### Cache-First (Assets Statiques)
- JavaScript, CSS compilés
- Polices Google Fonts
- Images, icônes SVG
- Tailwind CSS CDN

### Network-First (Données Dynamiques)
- Appels API REST
- Connexions Socket.IO
- Pages HTML de navigation

## 🔧 Configuration

### Service Worker
- Fichier : `public/service-worker.js`
- Caches : `loup-garou-v1` (statique) + `loup-garou-runtime-v1` (dynamique)
- Enregistrement : `src/index.tsx`

### Manifest PWA
- Fichier : `public/manifest.json`
- Nom : "Loup-Garou — Maître du Jeu"
- Thème : Cyan (#06b6d4) + Slate (#0f172a)
- Icônes : 192x192 et 512x512 (à créer)

## 📊 Vérification

### Console DevTools
Ouvrez la console du navigateur pour voir :
- `✅ Service Worker enregistré avec succès`
- `[SW] Installation`
- `[SW] Activation`

### Application Tab (Chrome DevTools)
- **Service Workers** : Vérifier l'état (activé/en attente)
- **Cache Storage** : Voir les ressources mises en cache
- **Manifest** : Vérifier les métadonnées PWA

## 🎯 Prochaine Étape

Pour finaliser la PWA, il reste à créer les icônes :
- `public/icons/icon-192.png` (192x192)
- `public/icons/icon-512.png` (512x512)

Ces icônes permettront l'installation complète sur mobile avec un logo personnalisé.

## 🐛 Dépannage

### Service Worker ne s'enregistre pas
1. Vérifiez que l'application est servie en HTTPS (ou localhost)
2. Ouvrez DevTools → Application → Service Workers
3. Cochez "Update on reload" pour forcer la mise à jour

### Cache trop ancien
1. DevTools → Application → Cache Storage
2. Cliquez droit → "Clear storage"
3. Rechargez la page

### Mises à jour ne s'appliquent pas
1. Fermez tous les onglets de l'application
2. Rouvrez l'application
3. Le nouveau service worker sera activé automatiquement

## 📚 Ressources

- [MDN - Service Worker API](https://developer.mozilla.org/fr/docs/Web/API/Service_Worker_API)
- [Google - PWA Training](https://web.dev/progressive-web-apps/)
- [PWA Builder](https://www.pwabuilder.com/)
