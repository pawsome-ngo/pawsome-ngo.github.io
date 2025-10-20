// This file must be created in the `src` directory

import { precacheAndRoute } from 'workbox-precaching';

// This __WB_MANIFEST variable will be replaced by Vite/Workbox
// with the list of all your app's files (JS, CSS, images, etc.)
precacheAndRoute(self.__WB_MANIFEST || []);

// --- PUSH NOTIFICATION LOGIC ---

/**
 * Listen for push events from the server.
 */
self.addEventListener('push', (event) => {
    const payloadText = event.data ? event.data.text() : 'You have a new notification.';

    const options = {
        body: payloadText,
        icon: '/pawsome_app_icon.png', // Icon from public folder
        badge: '/pawsome_app_icon.png', // Icon for Android notification bar
        vibrate: [200, 100, 200], // Vibration pattern
        data: {
            url: '/#/notifications', // URL to open on click
        },
    };

    event.waitUntil(
        self.registration.showNotification('Pawsome Rescue', options)
    );
});

/**
 * Listen for clicks on the notification.
 */
self.addEventListener('notificationclick', (event) => {
    event.notification.close(); // Close the notification

    const urlToOpen = new URL(event.notification.data.url, self.location.origin).href;

    event.waitUntil(
        clients.matchAll({
            type: 'window',
            includeUncontrolled: true,
        }).then((clientList) => {
            // Check if the app is already open
            for (const client of clientList) {
                if (client.url.startsWith(self.location.origin) && 'focus' in client) {
                    // If open, focus it and navigate to the notifications page
                    return client.navigate(urlToOpen).then(client => client.focus());
                }
            }
            // If not open, open a new window
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});