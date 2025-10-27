/* eslint-disable no-restricted-globals */

// --- Service Worker (sw.js) ---

// Define a cache name
const CACHE_NAME = 'pawsome-cache-v1';
// List URLs to pre-cache (optional, useful for offline support)
const urlsToCache = [
    '/',
    '/index.html',
    '/manifest.json',
    '/pawsome_app_icon.png'
    // Add other essential assets like CSS, JS bundles if needed
    // Be careful not to cache API endpoints or dynamic content here
];

// --- Install Event ---
// Pre-cache essential assets when the service worker is installed.
self.addEventListener('install', (event) => {
    console.log('[SW] Install event');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Opened cache, caching core assets:', urlsToCache);
                // Use addAll for atomic caching. If one fails, none are cached.
                return cache.addAll(urlsToCache).catch(error => {
                    console.error('[SW] Failed to cache core assets during install:', error);
                    // Optionally, you could throw the error to fail the install
                    // throw error;
                });
            })
            .then(() => self.skipWaiting()) // Activate the new SW immediately
            .catch(error => {
                console.error('[SW] Cache open or skipWaiting failed during install:', error);
            })
    );
});

// --- Activate Event ---
// Clean up old caches when the new service worker activates.
self.addEventListener('activate', (event) => {
    console.log('[SW] Activate event');
    const cacheWhitelist = [CACHE_NAME]; // Only keep the current cache
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (!cacheWhitelist.includes(cacheName)) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                    return null; // Keep the current cache
                })
            );
        }).then(() => self.clients.claim()) // Take control of open clients immediately
            .catch(error => {
                console.error('[SW] Cache cleanup or claiming clients failed during activate:', error);
            })
    );
});

// --- Fetch Event ---
// Serve cached assets when offline, or fetch from network.
// This example uses a cache-first strategy for pre-cached assets.
self.addEventListener('fetch', (event) => {
    // Let the browser handle requests for scripts/assets needed for the page load itself
    // if it's a navigation request. Handle other requests (images, API etc.) potentially.
    // Let non-GET requests pass through
    if (event.request.method !== 'GET') {
        return;
    }

    // Example: Cache-first for assets, network-first for API (adjust as needed)
    const requestUrl = new URL(event.request.url);

    // If it's an API call, try network first, fallback to cache (or just fail offline)
    if (requestUrl.pathname.startsWith('/api/')) {
        // Network first for API calls is often better to get fresh data
        event.respondWith(
            fetch(event.request).catch(() => {
                // Optional: Try to return a cached response if network fails
                // return caches.match(event.request);
                // Or simply fail if offline for API calls
                console.warn('[SW] API fetch failed, network unavailable?', event.request.url);
                return new Response(JSON.stringify({ error: 'Network error' }), {
                    status: 503, headers: { 'Content-Type': 'application/json' }
                });
            })
        );
        return;
    }

    // For other GET requests (assets, potentially pages), try cache first
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Cache hit - return response
                if (response) {
                    return response;
                }
                // Not in cache - fetch from network
                return fetch(event.request).then(
                    (networkResponse) => {
                        // Optional: Cache the fetched resource dynamically
                        // Be careful what you cache here to avoid caching stale data
                        /*
                        if (networkResponse && networkResponse.status === 200) {
                            caches.open(CACHE_NAME).then((cache) => {
                                cache.put(event.request, networkResponse.clone());
                            });
                        }
                        */
                        return networkResponse;
                    }
                ).catch(error => {
                    console.error('[SW] Fetch failed:', error, event.request.url);
                    // Optional: Return a fallback offline page/asset
                });
            })
    );
});

// --- ✨ Push Event Listener (Updated) ---
// Handle incoming push notifications. Expects JSON payload.
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
        // Can add more context from payload.data if available (e.g., chat group name)
        // notificationOptions.title = `Mention in ${payload.data.chatName || 'Chat'}`;
    } else if (dataType === 'incident') {
        notificationOptions.actions.push({ action: 'view_incident', title: 'View Incident', icon: '/icons/view.png' });
    } else if (dataType === 'approval') {
        notificationOptions.actions.push({ action: 'view_approvals', title: 'View Approvals', icon: '/icons/approval.png' });
        // Ensure the URL in payload.data points to the approvals page, e.g., '/#/approvals'
    }
    // Add more conditions for other notification types (GENERAL, INVENTORY, etc.)

    const title = payload.notification?.title || 'Pawsome Rescue';

    // Show the notification
    event.waitUntil(
        self.registration.showNotification(title, notificationOptions)
            .catch(err => console.error('[SW] Error showing notification:', err))
    );
});

// --- ✨ Notification Click Event Listener (Updated) ---
// Handle clicks on the notification body or action buttons.
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification click Received.', event);

    const notificationData = event.notification.data;
    // --- IMPORTANT: Ensure URL includes the HashRouter prefix '/#/' ---
    const targetUrl = notificationData?.url || '/#/'; // Default to base URL if none provided

    // Close the notification regardless of action
    event.notification.close();

    // --- Helper function to navigate or open window ---
    const handleNavigation = (url) => {
        // Ensure the URL starts with /#/ for HashRouter compatibility
        const finalUrl = url.startsWith('/#/') ? url : `/#${url.startsWith('/') ? '' : '/'}${url}`;
        console.log(`[SW] Attempting to navigate/open: ${finalUrl}`);

        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
                // Check if there's a visible client matching the origin
                for (let i = 0; i < clientList.length; i++) {
                    const client = clientList[i];
                    // Use new URL(client.url).pathname to compare paths if needed,
                    // but focusing the first visible client is often sufficient.
                    if (client.url && 'focus' in client && client.visibilityState === "visible") {
                        console.log(`[SW] Found visible client, navigating to ${finalUrl} and focusing.`);
                        client.navigate(finalUrl);
                        return client.focus();
                    }
                }
                // If no suitable client found, open a new window
                console.log(`[SW] No suitable client found, opening new window to ${finalUrl}.`);
                return clients.openWindow(finalUrl);
            }).catch(err => console.error('[SW] Error handling navigation:', err))
        );
    };

    // --- Handle Action or Body Click ---
    const action = event.action; // e.g., 'reply', 'mark_read', 'view_incident' or empty for body click

    if (action === 'mark_read') {
        console.log('[SW] Mark Read action clicked.');
        // Simplest Approach: Navigate to the chat, let the app handle marking as read when loaded.
        handleNavigation(targetUrl);
        // Add console log if needed: console.log(`[SW] Navigating to ${targetUrl} for app to mark as read.`);

        // Complex (Requires Auth): Add SW fetch logic here if attempting direct mark read from SW
        // event.waitUntil(handleMarkReadFetch(notificationData));

    } else if (action === 'reply' || action === 'view_incident' || action === 'view_approvals') {
        // Actions that just require opening the relevant page
        console.log(`[SW] Action '${action}' clicked, navigating to: ${targetUrl}`);
        handleNavigation(targetUrl);

    } else {
        // Default action (clicking the notification body)
        console.log(`[SW] Notification body clicked, navigating to: ${targetUrl}`);
        handleNavigation(targetUrl);
    }
});

console.log('[SW] Service Worker Loaded');