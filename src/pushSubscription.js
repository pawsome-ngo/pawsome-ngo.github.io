// File: src/pushSubscription.js
// (This is a NEW FILE you need to create in the `src` folder)

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

/**
 * Converts a VAPID key string to a Uint8Array.
 */
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

/**
 * Sends the subscription object to the backend server.
 */
async function sendSubscriptionToBackend(subscription, token) {
    const subJSON = subscription.toJSON();
    const payload = {
        endpoint: subJSON.endpoint,
        p256dh: subJSON.keys.p256dh,
        auth: subJSON.keys.auth,
    };

    try {
        const response = await fetch(`${API_BASE_URL}/api/notifications/subscribe`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        });

        if (response.ok) {
            console.log('Push subscription sent to backend successfully.');
            return true; // Return success
        } else {
            const data = await response.json();
            console.error('Failed to send push subscription to backend:', data.message);
            return false; // Return failure
        }
    } catch (error) {
        console.error('Error sending subscription to backend:', error);
        return false; // Return failure
    }
}

/**
 * Asks user for permission and subscribes them to push notifications.
 * Returns true on success, false on failure/denial.
 */
export async function subscribeToPushNotifications(token) {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('Push notifications are not supported by this browser.');
        alert('Push notifications are not supported by this browser.');
        return false;
    }
    if (!VAPID_PUBLIC_KEY) {
        console.error('VAPID Public Key is not defined. Cannot subscribe.');
        alert('Push notification setup is incomplete on the server.');
        return false;
    }

    try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.warn('Notification permission was not granted.');
            alert('Permission was not granted. Notifications will be disabled.');
            return false;
        }

        const registration = await navigator.serviceWorker.ready;
        let subscription = await registration.pushManager.getSubscription();

        if (subscription === null) {
            console.log('No subscription found, creating new one...');
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
            });
        } else {
            console.log('Existing subscription found.');
        }

        // Send the subscription to the backend
        return await sendSubscriptionToBackend(subscription, token);

    } catch (error) {
        console.error('Error during push subscription:', error);
        alert(`An error occurred: ${error.message}`);
        return false;
    }
}