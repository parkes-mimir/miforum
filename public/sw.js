/**
 * sw.js - MiForum Service Worker
 *
 * 缓存策略分层：
 *   静态资源（JS/CSS/图片）→ Cache First（缓存优先，版本更新时失效）
 *   页面 HTML → Network First（网络优先，失败回退缓存）
 *   API 请求 → Network Only（不缓存，避免泄露登录态）
 */

const CACHE_VERSION = 'miforum-static-v1.2.3';
const STATIC_ASSETS = [
  '/',
  '/css/tailwind.css',
  '/js/common.js',
  '/js/alpine.min.js',
  '/js/stores/app.js',
  '/js/components/theme.js',
  '/js/components/toast.js',
  '/js/components/auth-modal.js',
  '/js/components/change-password.js',
  '/js/components/lightbox.js',
  '/js/components/header.js',
  '/js/emoji-picker.js',
  '/js/share.js'
];

// 安装：预缓存静态资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// 激活：清理旧版本缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// 请求拦截
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 只处理 GET 请求
  if (event.request.method !== 'GET') return;

  // API 请求 → Network Only（不缓存）
  if (url.pathname.startsWith('/api/')) return;

  // 页面 HTML → Network First
  if (url.pathname === '/' || url.pathname.endsWith('.html') || url.pathname === '/shop' || url.pathname === '/messages' || url.pathname === '/profile.html' || url.pathname === '/post.html') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && response.type !== 'opaque') {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 上传的图片 → Cache First（长期缓存）
  if (url.pathname.startsWith('/uploads/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (!response || response.status !== 200 || response.type === 'opaque') return response;
          const clone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
          return response;
        });
      })
    );
    return;
  }

  // 其他静态资源（JS/CSS/字体）→ Cache First
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        // 不缓存 opaque 响应或非 200 响应
        if (!response || response.status !== 200 || response.type === 'opaque') return response;
        const clone = response.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
        return response;
      });
    })
  );
});
