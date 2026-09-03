/* 宜配离线查询 Service Worker
   v13: db.json 移出安装预缓存（大文件会卡死 SW 更新）。
   v15: 页面导航改「网络优先」——HTML/UI 只有几十 KB，联网打开必拿最新版，
        彻底解决"手机一直跑旧页面、看不到新功能"的问题；
        db.json 等静态资源仍「缓存优先」，装一次永久离线可用。
   数据推送时记得同步递增 CACHE 版本号。 */
const CACHE = 'yiparts-offline-v15';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const req = e.request;

  /* 页面导航（HTML）：网络优先 → 每次联网打开都是最新 UI；
     离线时回退缓存（含根路径兜底），保证无网也能用。 */
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        if (res.ok && req.url.startsWith(self.location.origin)) {
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() =>
        caches.match(req).then((h) => h || caches.match('./index.html'))
      )
    );
    return;
  }

  /* 其余资源（db.json / 图标 / manifest）：缓存优先，miss 时联网并缓存 */
  e.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        const copy = res.clone();
        if (res.ok && req.url.startsWith(self.location.origin)) {
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
