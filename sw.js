const CACHE_NAME = 'educenter-pro-cache-v2';
// Cần liệt kê các tệp cốt lõi để ứng dụng có thể khởi động
const APP_SHELL_URLS = [
  '/',
  '/index.html',
  '/logo.svg',
  '/manifest.json',
  // Các assets được build bởi Vite thường nằm trong thư mục /assets
  // Service worker sẽ tự động cache chúng trong sự kiện 'fetch' ở lần truy cập đầu tiên.
];

// Sự kiện install: cache các tệp App Shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Đang cache App Shell');
        return cache.addAll(APP_SHELL_URLS);
      })
      .catch(error => {
        console.error('Lỗi khi cache app shell:', error);
      })
  );
});

// Sự kiện activate: dọn dẹp các cache cũ
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Service Worker: Xóa cache cũ', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Sự kiện fetch: chiến lược cache-first, sau đó mới đến network
self.addEventListener('fetch', (event) => {
  // Bỏ qua các request không phải GET
  if (event.request.method !== 'GET') {
    return;
  }

  // Bỏ qua các request của extension trình duyệt
  if (!event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      
      // 1. Thử tìm trong cache trước
      const cachedResponse = await cache.match(event.request);
      if (cachedResponse) {
        return cachedResponse;
      }

      // 2. Nếu không có trong cache, thử lấy từ mạng
      try {
        const networkResponse = await fetch(event.request);

        // Nếu lấy thành công, lưu vào cache cho lần sau
        if (networkResponse.ok) {
          await cache.put(event.request, networkResponse.clone());
        }
        
        return networkResponse;
        
      } catch (error) {
        // Nếu cả cache và network đều thất bại (offline)
        console.log('Service Worker: Lỗi fetch từ mạng và không có trong cache.', event.request.url);

        // Đối với các yêu cầu điều hướng (vd: truy cập /students),
        // trả về index.html để React Router xử lý.
        if (event.request.mode === 'navigate') {
          console.log('Service Worker: Trả về index.html làm fallback khi offline.');
          const indexResponse = await cache.match('/index.html');
          return indexResponse;
        }
        
        // Trả về lỗi cho các tài nguyên khác
        return new Response("Lỗi mạng: Không thể tải tài nguyên.", {
          status: 408,
          headers: { "Content-Type": "text/plain" },
        });
      }
    })()
  );
});
