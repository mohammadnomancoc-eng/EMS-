// public/firebase-messaging-sw.js
// Firebase Cloud Messaging Background Service Worker
// Initializes Firebase and handles background notifications dynamically via query parameters.

importScripts('https://www.gstatic.com/firebasejs/10.12.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.1/firebase-messaging-compat.js');

// Parse Firebase configuration from the query string parameters passed during registration
const urlParams = new URLSearchParams(location.search);
const apiKey = urlParams.get('apiKey');
const authDomain = urlParams.get('authDomain');
const projectId = urlParams.get('projectId');
const storageBucket = urlParams.get('storageBucket');
const messagingSenderId = urlParams.get('messagingSenderId');
const appId = urlParams.get('appId');

if (apiKey && messagingSenderId && projectId) {
  firebase.initializeApp({
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId
  });

  const messaging = firebase.messaging();

  // Background message handler
  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message: ', payload);

    const title = payload.notification?.title || payload.data?.title || 'EMS Notification';
    const body = payload.notification?.body || payload.data?.body || '';
    const icon = payload.notification?.icon || payload.data?.icon || '/rwtlogo.png';
    const badge = payload.data?.badge || '/favicon.svg';
    const tag = payload.data?.tag || 'ems-notification';
    const actionUrl = payload.data?.actionUrl || '/';
    
    const notificationOptions = {
      body,
      icon,
      badge,
      tag,
      renotify: true,
      data: {
        click_action: actionUrl,
        actionUrl: actionUrl
      },
      actions: [
        {
          action: 'open_action',
          title: 'View Details'
        }
      ]
    };

    return self.registration.showNotification(title, notificationOptions);
  });
} else {
  console.warn('[firebase-messaging-sw.js] Missing Firebase initialization parameters in URL query.');
}

// Notification Click Handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const actionUrl = event.notification.data?.actionUrl || event.notification.data?.click_action || '/';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a tab is already open, focus it and redirect
      for (const client of clientList) {
        const clientUrl = new URL(client.url);
        if (clientUrl.origin === self.location.origin) {
          return client.focus().then(() => {
            if (client.navigate) {
              return client.navigate(actionUrl);
            }
          });
        }
      }
      // Otherwise open a new tab
      if (self.clients.openWindow) {
        return self.clients.openWindow(actionUrl);
      }
    })
  );
});
