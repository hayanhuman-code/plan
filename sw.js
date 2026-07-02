/* 롯데월드 플랜 · service worker
   - HTML(페이지 이동): network-first → 온라인이면 항상 최신, 오프라인이면 캐시
   - 그 외 정적 자원: cache-first(백그라운드 갱신) */
var CACHE = 'lw-plan-v5';
var ASSETS = ['./', './index.html', './diary.html', './album.html', './manifest.json', './icon.svg', './html2canvas.min.js'];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){ return c.addAll(ASSETS); }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

function isHTML(req){
  return req.mode === 'navigate' ||
         (req.headers.get('accept') || '').indexOf('text/html') !== -1;
}

self.addEventListener('fetch', function(e){
  var req = e.request;
  if (req.method !== 'GET') return;

  /* 페이지(HTML)는 네트워크 우선 → 배포 즉시 최신 반영 */
  if (isHTML(req)) {
    e.respondWith(
      fetch(req).then(function(res){
        if (res && res.status === 200 && res.type === 'basic') {
          var copy = res.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copy); });
        }
        return res;
      }).catch(function(){
        return caches.match(req).then(function(c){ return c || caches.match('./index.html'); });
      })
    );
    return;
  }

  /* 정적 자원은 캐시 우선 + 백그라운드 갱신 */
  e.respondWith(
    caches.match(req).then(function(cached){
      var net = fetch(req).then(function(res){
        if (res && res.status === 200 && res.type === 'basic') {
          var copy = res.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copy); });
        }
        return res;
      }).catch(function(){ return cached; });
      return cached || net;
    })
  );
});
