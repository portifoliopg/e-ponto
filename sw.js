// Nome do cache (versione para forçar a atualização de arquivos)
const CACHE_NAME = 'eponto-v1';

// Lista de arquivos essenciais para o funcionamento offline
const urlsToCache = [
    '/',
    '/index.html',
    '/styles.css',
    '/script.js',
    '/manifest.json',
    // Crie a pasta 'images' e adicione estes arquivos:
    '/images/icon-192.png',
    '/images/icon-512.png'
];

/**
 * Evento 'install': Instala o Service Worker e armazena os arquivos essenciais no cache.
 */
self.addEventListener('install', (event) => {
    // Força o novo Service Worker a assumir o controle imediatamente
    self.skipWaiting(); 
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Cache aberto, pré-armazenando arquivos...');
                return cache.addAll(urlsToCache);
            })
    );
});

/**
 * Evento 'activate': Limpa caches antigos, garantindo que apenas a versão atual esteja ativa.
 */
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[Service Worker] Deletando cache antigo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    // Assegura que o Service Worker comece a controlar os clientes imediatamente
    return self.clients.claim();
});

/**
 * Evento 'fetch': Intercepta requisições de rede. Se o arquivo estiver no cache, ele é retornado. Caso contrário, busca na rede.
 */
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Cache hit - retorna a resposta em cache
                if (response) {
                    return response;
                }
                // Não está no cache - busca na rede
                return fetch(event.request).catch(() => {
                    console.log('[Service Worker] Falha ao buscar na rede e não está em cache:', event.request.url);
                });
            })
    );
});