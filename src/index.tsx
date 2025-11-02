
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("L'élément root est introuvable");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Enregistrement du Service Worker pour PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('✅ Service Worker enregistré avec succès:', registration.scope);
        
        // Gérer les mises à jour du Service Worker
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Un nouveau Service Worker est disponible
                console.log('🔄 Nouvelle version disponible');
                // Optionnel: Notifier l'utilisateur qu'une mise à jour est disponible
                if (confirm('Une nouvelle version est disponible. Voulez-vous actualiser ?')) {
                  newWorker.postMessage({ type: 'SKIP_WAITING' });
                  window.location.reload();
                }
              }
            });
          }
        });
      })
      .catch((error) => {
        console.error('❌ Échec de l\'enregistrement du Service Worker:', error);
      });
  });

  // Recharger la page lorsqu'un nouveau Service Worker prend le contrôle
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}
