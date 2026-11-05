/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: { url: string; revision: string | null }[] };

self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

const appScope = new URL(self.registration.scope);
const appShellUrl = new URL('index.html', appScope).pathname;
const shareTargetPath = new URL('share-target', appScope).pathname;

registerRoute(
  new NavigationRoute(createHandlerBoundToURL(appShellUrl), {
    denylist: [/\/api\//, new RegExp(`${shareTargetPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`)]
  })
);

registerRoute(({ url }) => url.pathname.includes('/tesseract/'), new CacheFirst({ cacheName: 'gastador-ocr-v1' }));

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'POST' || url.pathname !== shareTargetPath) return;
  event.respondWith(
    (async () => {
      try {
        const form = await event.request.formData();
        const file = form.get('image');
        if (file instanceof File && /^image\/(jpeg|png|webp)$/.test(file.type)) {
          const cache = await caches.open('gastador-share');
          await cache.put(new URL('shared-image', appScope).href, new Response(file, { headers: { 'Content-Type': file.type } }));
          return Response.redirect(new URL('snap?shared=1', appScope).href, 303);
        }
      } catch {
        return Response.redirect(new URL('snap', appScope).href, 303);
      }
      return Response.redirect(new URL('snap', appScope).href, 303);
    })()
  );
});
