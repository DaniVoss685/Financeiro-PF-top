// Importar o Workbox carregado localmente
importScripts('/workbox/workbox-sw.js');

if (workbox) {
  console.log('Workbox carregado com sucesso localmente!');
  
  // Configurar para carregar módulos adicionais do Workbox da pasta local /workbox/
  workbox.setConfig({
    modulePathPrefix: '/workbox/',
    debug: false // Mudar para true se precisar de logs detalhados do Workbox em desenvolvimento
  });

  const { registerRoute } = workbox.routing;
  const { StaleWhileRevalidate, CacheFirst, NetworkFirst } = workbox.strategies;
  const { CacheableResponsePlugin } = workbox.cacheableResponse;
  const { ExpirationPlugin } = workbox.expiration;

  // Forçar o Service Worker recém-instalado a se tornar ativo imediatamente
  self.addEventListener('install', () => {
    self.skipWaiting();
  });

  // Limpar caches antigos quando um novo service worker for ativado
  self.addEventListener('activate', (event) => {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Se houver algum cache antigo que não seja o atual, deletamos
            if (cacheName !== 'financeiro-pf-static' && cacheName !== 'financeiro-pf-images' && cacheName !== 'financeiro-pf-pages') {
              console.log('Deletando cache antigo:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }).then(() => self.clients.claim())
    );
  });

  // 1. Estratégia para o arquivo HTML principal (index.html) e páginas de navegação
  // Queremos NetworkFirst para garantir que o usuário sempre veja o conteúdo mais recente se tiver conexão
  registerRoute(
    ({ request }) => request.mode === 'navigate',
    new NetworkFirst({
      cacheName: 'financeiro-pf-pages',
      plugins: [
        new CacheableResponsePlugin({
          statuses: [0, 200]
        }),
        new ExpirationPlugin({
          maxEntries: 10,
          maxAgeSeconds: 24 * 60 * 60 // Cache de 1 dia
        })
      ]
    })
  );

  // 2. Estratégia para Assets Estáticos (JS, CSS, Webmanifest e arquivos na pasta public)
  // Usamos StaleWhileRevalidate para que carregue rápido instantaneamente a partir do cache
  // e valide/atualize o cache em segundo plano se houver nova versão na rede.
  registerRoute(
    ({ request, url }) => {
      return (
        request.destination === 'script' ||
        request.destination === 'style' ||
        url.pathname.endsWith('.js') ||
        url.pathname.endsWith('.css') ||
        url.pathname.includes('/assets/') ||
        url.pathname.endsWith('manifest.json') ||
        url.pathname.endsWith('manifest.webmanifest')
      );
    },
    new StaleWhileRevalidate({
      cacheName: 'financeiro-pf-static',
      plugins: [
        new CacheableResponsePlugin({
          statuses: [0, 200]
        }),
        new ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 30 * 24 * 60 * 60 // Cache de 30 dias
        })
      ]
    })
  );

  // 3. Estratégia para Favicons, SVGs e Imagens (incluindo o ícone e favicons do PWA)
  // CacheFirst já que raramente mudam. Se mudarem, o nome do arquivo geralmente muda.
  registerRoute(
    ({ request, url }) => {
      return (
        request.destination === 'image' ||
        url.pathname.endsWith('.png') ||
        url.pathname.endsWith('.svg') ||
        url.pathname.endsWith('.ico')
      );
    },
    new CacheFirst({
      cacheName: 'financeiro-pf-images',
      plugins: [
        new CacheableResponsePlugin({
          statuses: [0, 200]
        }),
        new ExpirationPlugin({
          maxEntries: 60,
          maxAgeSeconds: 60 * 24 * 60 * 60 // Cache de 60 dias
        })
      ]
    })
  );

  // 4. Estratégia para fontes externas (como Google Fonts que importamos no index.css)
  registerRoute(
    ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
    new CacheFirst({
      cacheName: 'google-fonts',
      plugins: [
        new CacheableResponsePlugin({
          statuses: [0, 200]
        }),
        new ExpirationPlugin({
          maxEntries: 20,
          maxAgeSeconds: 365 * 24 * 60 * 60 // Cache de 1 ano
        })
      ]
    })
  );

} else {
  console.error('Falha ao carregar o Workbox local no Service Worker.');
}
