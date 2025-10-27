/* eslint-disable no-restricted-globals */

// --- Service Worker (sw.js) - Reverted Push Handling ---

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

// --- Inject Precache Manifest ---
precacheAndRoute(self.__WB_MANIFEST || []);

// --- Clean up old Workbox caches ---
cleanupOutdatedCaches();

// --- Optional: Runtime Caching Rules (Keep if needed) ---
registerRoute(
    ({url}) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
    new CacheFirst(/* ... options ... */)
);
registerRoute(
    ({request}) => request.destination === 'image',
    new CacheFirst(/* ... options ... */)
);

// --- Activate Event ---
self.addEventListener('activate', (event) => {
    console.log('[SW] Activate event');
    event.waitUntil(self.clients.claim());
});

// --- ✨ Push Event Listener (Reverted to Text) ✨ ---
self.addEventListener('push', (event) => {
    console.log('[SW] Push Received.');

    let title = 'Pawsome Rescue';
    let message = 'You have a new notification.'; // Default message
    const options = {
        body: message,
        icon: '/pawsome_app_icon.png', // Default icon
        badge: '/pawsome_app_icon.png', // Icon for Android notification bar
        // NO 'data' field here in the simple version
        // NO 'actions' field here in the simple version
    };

    if (event.data) {
        try {
            // Attempt to parse simple text
            const textPayload = event.data.text();
            console.log('[SW] Push payload (Text):', textPayload);

            // Basic parsing: Assume first line is title, rest is body
            const lines = textPayload.split('\n');
            if (lines.length > 0) {
                // You might want a specific delimiter or just use the whole text as body
                // Example: Use first line as title if contains ':', else use default title
                if (lines[0].includes(':')) {
                    title = lines[0];
                    options.body = lines.slice(1).join('\n').trim() || textPayload; // Use rest as body or full text
                } else {
                    options.body = textPayload; // Use full text as body
                }
            } else {
                options.body = textPayload; // Use full text if no newline
            }

        } catch (e) {
            console.error('[SW] Error processing push data text:', e);
            options.body = 'Error processing notification content.'; // Show error in body
        }
    } else {
        console.warn('[SW] Push event but no data');
    }

    // Show the notification
    event.waitUntil(
        self.registration.showNotification(title, options)
            .catch(err => console.error('[SW] Error showing simple notification:', err))
    );
});
// --- ✨ End Push Listener Revert ✨ ---


// --- ✨ Notification Click Event Listener (Simplified) ✨ ---
// Handle clicks on the notification body. Opens the base app URL.
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Simple Notification click Received.');

    // --- Basic URL - Always open the root of the app ---
    const targetUrl = '/#/'; // Open the base URL for HashRouter
    // ---

    // Close the notification
    event.notification.close();

    // --- Helper function to navigate or open window ---
    const handleNavigation = (url) => {
        console.log(`[SW] Attempting to navigate/open: ${url}`);
        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
                for (let i = 0; i < clientList.length; i++) {
                    const client = clientList[i];
                    if (client.url && 'focus' in client && client.visibilityState === "visible") {
                        console.log(`[SW] Found visible client, navigating to ${url} and focusing.`);
                        client.navigate(url); // Navigate existing window
                        return client.focus();
                    }
                }
                console.log(`[SW] No suitable client found, opening new window to ${url}.`);
                return clients.openWindow(url); // Open new window
            }).catch(err => console.error('[SW] Error handling simple navigation:', err))
        );
    };
    // ---

    // --- Always navigate to base URL on click ---
    // 'event.action' will be empty since no actions were defined
    handleNavigation(targetUrl);
    // ---
});
// --- ✨ End Notification Click Simplification ✨ ---


// --- Install Event ---
self.addEventListener('install', (event) => {
    console.log('[SW] Install event - skipping waiting');
    self.skipWaiting();
});

console.log('[SW] Service Worker Loaded (Reverted - Simple Push)');