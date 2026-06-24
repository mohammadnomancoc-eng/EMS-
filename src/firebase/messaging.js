// src/firebase/messaging.js
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore";
import app, { db } from "./config";

// Default public VAPID key. The user can customize this by setting VITE_FIREBASE_VAPID_KEY in .env.
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || "BPE-Z8r8uWoxZtN1JbpxQn-3h346617w5-f-b9k-R9hW9m0z-R5rM4y0F5dG9y7W4P-1y8_6N9_c_R9y-rV6-A8";

/** Helper to generate or retrieve a unique device ID for the current browser session. */
function getOrCreateDeviceId() {
  let deviceId = localStorage.getItem("ems_device_id");
  if (!deviceId) {
    deviceId = "dev_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem("ems_device_id", deviceId);
  }
  return deviceId;
}

/** Detects detailed device metadata from userAgent. */
function getDeviceInfo() {
  const ua = navigator.userAgent;
  let browser = "Unknown Browser";
  let platform = "Unknown OS";

  if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("SamsungBrowser")) browser = "Samsung Browser";
  else if (ua.includes("Opera") || ua.includes("OPR")) browser = "Opera";
  else if (ua.includes("Trident")) browser = "Internet Explorer";
  else if (ua.includes("Edge") || ua.includes("Edg")) browser = "Edge";
  else if (ua.includes("Chrome")) browser = "Chrome";
  else if (ua.includes("Safari")) browser = "Safari";

  if (ua.includes("Windows")) platform = "Windows";
  else if (ua.includes("Macintosh") || ua.includes("Mac OS")) platform = "macOS";
  else if (ua.includes("Android")) platform = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) platform = "iOS";
  else if (ua.includes("Linux")) platform = "Linux";

  return {
    deviceName: `${platform} Client (${browser})`,
    browser,
    platform
  };
}

/**
 * Registers the Service Worker with dynamic Firebase parameters.
 * This avoids hardcoding Firebase credentials inside public/firebase-messaging-sw.js.
 */
async function registerMessagingServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    throw new Error("Service Workers are not supported in this browser.");
  }

  const { apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId } = app.options;
  
  // Construct registration URL with query parameters
  const swUrl = `/firebase-messaging-sw.js?` + 
    `apiKey=${encodeURIComponent(apiKey)}&` +
    `authDomain=${encodeURIComponent(authDomain)}&` +
    `projectId=${encodeURIComponent(projectId)}&` +
    `storageBucket=${encodeURIComponent(storageBucket || "")}&` +
    `messagingSenderId=${encodeURIComponent(messagingSenderId)}&` +
    `appId=${encodeURIComponent(appId)}`;

  try {
    const registration = await navigator.serviceWorker.register(swUrl, { scope: "/" });
    console.log("[FCM Service Worker] Registered successfully with scope:", registration.scope);
    return registration;
  } catch (error) {
    console.error("[FCM Service Worker] Registration failed:", error);
    throw error;
  }
}

/**
 * Requests push notification permission and returns the FCM registration token.
 * Saves the token to Firestore under users/{uid}/devices/{deviceId}.
 * 
 * @param {string} userId - Firebase Authentication user UID.
 */
export async function setupFCM(userId) {
  if (!userId) return null;

  try {
    // 1. Check permission state
    let permission = Notification.permission;
    if (permission === "default") {
      permission = await Notification.requestPermission();
    }

    if (permission !== "granted") {
      console.warn("[FCM] Notification permission denied.");
      return null;
    }

    // 2. Register / retrieve the messaging Service Worker
    const serviceWorkerRegistration = await registerMessagingServiceWorker();

    // 3. Initialize Firebase Messaging
    const messaging = getMessaging(app);

    // 4. Get FCM Token
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration
    });

    if (!token) {
      console.warn("[FCM] No token retrieved.");
      return null;
    }

    console.log("[FCM] Device Token acquired:", token);

    // 5. Store/Update Token in Firestore under users/{uid}/devices/{deviceId}
    const deviceId = getOrCreateDeviceId();
    const info = getDeviceInfo();

    const deviceDocRef = doc(db, "users", userId, "devices", deviceId);
    await setDoc(deviceDocRef, {
      token,
      deviceName: info.deviceName,
      browser: info.browser,
      platform: info.platform,
      createdAt: serverTimestamp(),
      lastSeen: serverTimestamp()
    }, { merge: true });

    console.log("[FCM] Token stored in Firestore for user:", userId);
    return token;
  } catch (error) {
    console.error("[FCM] Error in setupFCM:", error);
    return null;
  }
}

/** Sets up real-time foreground message listener. */
export function listenForegroundMessages(onMessageReceived) {
  try {
    const messaging = getMessaging(app);
    return onMessage(messaging, (payload) => {
      console.log("[FCM] Foreground message received:", payload);
      if (onMessageReceived) {
        onMessageReceived(payload);
      }
    });
  } catch (error) {
    console.warn("[FCM] Messaging not supported or could not listen:", error.message);
    return () => {};
  }
}

/** Sends an FCM push notification to all devices registered under a target user. */
export async function sendFCMPush(targetUserId, title, body, actionUrl = "/") {
  if (!targetUserId) return;
  try {
    const devicesRef = collection(db, "users", targetUserId, "devices");
    const snap = await getDocs(devicesRef);
    if (snap.empty) {
      console.log(`[FCM] No registered devices for user ${targetUserId}`);
      return;
    }

    const tokens = [];
    snap.forEach((doc) => {
      const d = doc.data();
      if (d.token) tokens.push(d.token);
    });

    if (tokens.length === 0) return;

    // Fallback to API Key if VITE_FIREBASE_SERVER_KEY is not defined
    const serverKey = import.meta.env.VITE_FIREBASE_SERVER_KEY || import.meta.env.VITE_FIREBASE_API_KEY;

    console.log(`[FCM] Sending push notification to ${tokens.length} devices for user ${targetUserId}...`);

    await Promise.all(tokens.map(async (token) => {
      try {
        const response = await fetch("https://fcm.googleapis.com/fcm/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `key=${serverKey}`
          },
          body: JSON.stringify({
            to: token,
            notification: {
              title,
              body,
              icon: "/rwtlogo.png",
              click_action: actionUrl
            },
            data: {
              title,
              body,
              icon: "/rwtlogo.png",
              actionUrl
            }
          })
        });
        const resData = await response.json();
        console.log("[FCM] Push sent result:", resData);
      } catch (err) {
        console.error("[FCM] Error sending to token:", err);
      }
    }));
  } catch (error) {
    console.error("[FCM] Error in sendFCMPush:", error);
  }
}

/** Sends an FCM push notification to all registered admin users. */
export async function sendFCMPushToAdmins(title, body, actionUrl = "/") {
  try {
    const q = query(collection(db, "users"), where("role", "==", "admin"));
    const snap = await getDocs(q);
    const adminUids = [];
    snap.forEach((doc) => {
      adminUids.push(doc.id);
    });

    console.log(`[FCM] Found ${adminUids.length} admin users to notify via push.`);
    await Promise.all(adminUids.map((uid) => sendFCMPush(uid, title, body, actionUrl)));
  } catch (error) {
    console.error("[FCM] Error in sendFCMPushToAdmins:", error);
  }
}
