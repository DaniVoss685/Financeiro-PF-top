if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('ServiceWorker registrado com sucesso! Escopo:', registration.scope);
        
        // Tratar atualizações do Service Worker
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  console.log('Nova versão disponível! Por favor, recarregue a página.');
                  // Opcional: Desparatar um evento customizado no app para avisar o usuário
                  window.dispatchEvent(new CustomEvent('sw-update-available'));
                } else {
                  console.log('Conteúdo em cache para uso offline.');
                }
              }
            });
          }
        });
      })
      .catch(error => {
        console.error('Falha ao registrar o ServiceWorker:', error);
      });
  });
}
