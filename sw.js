/* 宜配离线查询 Service Worker —— 缓存优先，装一次永久离线可用
   v13 关键改动：db.json(约7MB) 移出「安装预缓存」(install addAll)。
   原因：大文件一次下载失败会导致整个 SW 更新中断，手机端因此长期卡在旧版。
   现在 SW 更新只预缓存几十 KB 小文件，几乎必然成功；
   db.json 在版本切换（旧缓存被删除）后由首次访问自动联网获取并缓存，
   之后离线秒开。数据推送时记得同步递增 CACHE 版本号。 */
const CACHE = 'yiparts-offline-v14';
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
  e.respondWith(
    caches.match(e.request).then((hit) => {
      if (hit) return hit;
      return fetch(e.request).then((res) => {
        const copy = res.clone();
        if (res.ok && e.request.url.startsWith(self.location.origin)) {
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
