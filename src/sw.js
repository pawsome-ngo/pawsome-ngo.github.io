/* eslint-disable no-restricted-globals */

// --- Service Worker (sw.js) ---

// --- ✨ ADD WORKBOX IMPORTS ✨ ---
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
// --- END ADD ---

// Define a cache name (Workbox typically handles naming based on strategy)
// const CACHE_NAME = 'pawsome-cache-v1'; // You might not need this if Workbox manages caches

// --- ✨ INJECT PRECACHE MANIFEST ✨ ---
// This line is crucial. Workbox build tools will replace self.__WB_MANIFEST
// with the actual list of files to precache during the build process.
precacheAndRoute(self.__WB_MANIFEST || []);
// --- END INJECT ---

// --- Clean up old Workbox caches ---
cleanupOutdatedCaches();

// --- Optional: Runtime Caching Rules ---
// Example: Cache Google Fonts with a CacheFirst strategy
registerRoute(
    ({url}) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
    new CacheFirst({
        cacheName: 'google-fonts',
        plugins: [
            new CacheableResponsePlugin({statuses: [0, 200]}),
            new ExpirationPlugin({maxEntries: 30, maxAgeSeconds: 30 * 24 * 60 * 60}), // 30 days
        ],
    })
);

// Example: Cache images with a CacheFirst strategy
registerRoute(
    ({request}) => request.destination === 'image',
    new CacheFirst({
        cacheName: 'images',
        plugins: [
            new CacheableResponsePlugin({statuses: [0, 200]}),
            new ExpirationPlugin({maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60}), // 30 days
        ],
    })
);

// Example: Network first for API calls (if needed beyond browser cache)
/*
registerRoute(
  ({url}) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    plugins: [
      new CacheableResponsePlugin({statuses: [0, 200]}),
      new ExpirationPlugin({maxAgeSeconds: 5 * 60}), // Cache for 5 minutes
    ]
  })
);
*/


// --- Activate Event ---
// Ensure the new service worker takes control immediately.
self.addEventListener('activate', (event) => {
    console.log('[SW] Activate event');
    event.waitUntil(self.clients.claim());
});

// --- Push Event Listener (Keep your existing push logic) ---
self.addEventListener('push', (event) => {
    console.log('[SW] Push Received.');

    let payload;
    try {
        if (event.data) {
            payload = event.data.json(); // Expecting JSON payload now
            console.log('[SW] Push payload (JSON):', payload);
        } else {
            console.warn('[SW] Push event but no data');
            return; // Exit if no data
        }
    } catch (e) {
        console.error('[SW] Failed to parse push payload as JSON:', event.data ? event.data.text() : 'No data', e);
        // Fallback: Show notification with raw text if JSON parsing fails
        const rawText = event.data ? event.data.text() : 'You have a new notification.';
        payload = {
            notification: { title: 'Pawsome Notification', body: rawText },
            data: { url: '/#/' } // Default URL
        };
    }

    // --- Prepare Notification Options ---
    const notificationOptions = {
        body: payload.notification?.body || 'New notification',
        icon: payload.notification?.icon || '/pawsome_app_icon.png', // Default icon
        badge: payload.notification?.badge || '/pawsome_app_icon.png', // Icon for Android notification bar (often monochrome)
        image: payload.notification?.image, // Optional image
        tag: payload.notification?.tag, // Optional tag for grouping/replacing
        renotify: payload.notification?.renotify || false, // Vibrate/sound again if replacing based on tag
        requireInteraction: payload.notification?.requireInteraction || false, // Keep notification until dismissed
        data: payload.data || { url: '/#/' }, // Crucial: Pass the whole custom data object
        actions: [] // Initialize actions array
    };

    // --- Add Actions Conditionally ---
    const dataType = payload.data?.type;
    if (dataType === 'chat') {
        notificationOptions.actions.push({ action: 'reply', title: 'Reply', icon: '/icons/reply.png' }); // Optional icon paths
        notificationOptions.actions.push({ action: 'mark_read', title: 'Mark Read', icon: '/icons/mark_read.png' });
    } else if (dataType === 'incident') {
        notificationOptions.actions.push({ action: 'view_incident', title: 'View Incident', icon: '/icons/view.png' });
    } else if (dataType === 'approval') {
        notificationOptions.actions.push({ action: 'view_approvals', title: 'View Approvals', icon: '/icons/approval.png' });
    }
    // Add more conditions for other notification types

    const title = payload.notification?.title || 'Pawsome Rescue';

    // Show the notification
    event.waitUntil(
        self.registration.showNotification(title, notificationOptions)
            .catch(err => console.error('[SW] Error showing notification:', err))
    );
});

// --- Notification Click Event Listener (Keep your existing click logic) ---
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification click Received.', event);

    const notificationData = event.notification.data;
    const targetUrl = notificationData?.url || '/#/'; // Default to base URL

    event.notification.close();

    const handleNavigation = (url) => {
        const finalUrl = url.startsWith('/#/') ? url : `/#${url.startsWith('/') ? '' : '/'}${url}`;
        console.log(`[SW] Attempting to navigate/open: ${finalUrl}`);
        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
                for (let i = 0; i < clientList.length; i++) {
                    const client = clientList[i];
                    if (client.url && 'focus' in client && client.visibilityState === "visible") {
                        console.log(`[SW] Found visible client, navigating to ${finalUrl} and focusing.`);
                        client.navigate(finalUrl);
                        return client.focus();
                    }
                }
                console.log(`[SW] No suitable client found, opening new window to ${finalUrl}.`);
                return clients.openWindow(finalUrl);
            }).catch(err => console.error('[SW] Error handling navigation:', err))
        );
    };

    const action = event.action;

    if (action === 'mark_read') {
        console.log('[SW] Mark Read action clicked.');
        handleNavigation(targetUrl); // Navigate to let the app handle it
    } else if (action === 'reply' || action === 'view_incident' || action === 'view_approvals') {
        console.log(`[SW] Action '${action}' clicked, navigating to: ${targetUrl}`);
        handleNavigation(targetUrl);
    } else {
        console.log(`[SW] Notification body clicked, navigating to: ${targetUrl}`);
        handleNavigation(targetUrl);
    }
});

// --- Install Event (Simplified - Workbox handles immediate activation) ---
self.addEventListener('install', (event) => {
    console.log('[SW] Install event - skipping waiting');
    self.skipWaiting();
});

console.log('[SW] Service Worker Loaded (with Workbox)');