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

    // Wait for the service worker to become active before returning.
    // getToken() requires an active SW; without this wait it fails with
    // "Subscription failed - no active Service Worker".
    if (registration.installing || registration.waiting) {
      await new Promise((resolve) => {
        const sw = registration.installing || registration.waiting;
        sw.addEventListener("statechange", function handler() {
          if (sw.state === "activated") {
            sw.removeEventListener("statechange", handler);
            resolve();
          }
        });
        // If the SW is already activated by the time we attach the listener
        if (sw.state === "activated") resolve();
      });
    }

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

/** Helper to convert PEM formatted private key to ArrayBuffer */
function pemToArrayBuffer(pem) {
  // Replace escaped newlines if any
  const cleanPem = pem
    .replace(/\\n/g, "\n")
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s+/g, "");
  
  const binaryString = window.atob(cleanPem);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/** Generates Google OAuth 2.0 Access Token using Web Crypto API */
async function getGoogleAccessToken(clientEmail, privateKey) {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 3600;

  const header = {
    alg: "RS256",
    typ: "JWT"
  };

  const payload = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    exp: exp,
    iat: iat
  };

  const base64url = (source) => {
    let encoded = window.btoa(JSON.stringify(source));
    return encoded.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  };

  const stringifiedHeader = base64url(header);
  const stringifiedPayload = base64url(payload);
  const tokenInput = `${stringifiedHeader}.${stringifiedPayload}`;

  const privateKeyBuffer = pemToArrayBuffer(privateKey);
  const cryptoKey = await window.crypto.subtle.importKey(
    "pkcs8",
    privateKeyBuffer,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: { name: "SHA-256" }
    },
    false,
    ["sign"]
  );

  const encoder = new TextEncoder();
  const signatureBuffer = await window.crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    encoder.encode(tokenInput)
  );

  const signatureBytes = new Uint8Array(signatureBuffer);
  let signatureString = "";
  for (let i = 0; i < signatureBytes.byteLength; i++) {
    signatureString += String.fromCharCode(signatureBytes[i]);
  }
  const encodedSignature = window.btoa(signatureString)
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const jwt = `${tokenInput}.${encodedSignature}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });

  const resData = await response.json();
  if (!response.ok) {
    throw new Error(`OAuth error: ${resData.error_description || resData.error}`);
  }
  return resData.access_token;
}

/** Sends an FCM push notification to all devices registered under a target user using FCM HTTP v1 */
export async function sendFCMPush(targetUserId, title, body, actionUrl = "/") {
  if (!targetUserId) return;
  
  const clientEmail = import.meta.env.VITE_FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL;
  const privateKey = import.meta.env.VITE_FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;

  if (!clientEmail || !privateKey || !projectId) {
    console.warn("[FCM] Client email, private key, or project ID not configured in .env. Skipping push notification.");
    return;
  }

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

    // Get signed OAuth access token
    const accessToken = await getGoogleAccessToken(clientEmail, privateKey);

    console.log(`[FCM] Sending push notification via HTTP v1 to ${tokens.length} devices for user ${targetUserId}...`);

    await Promise.all(tokens.map(async (token) => {
      try {
        const response = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            message: {
              token: token,
              notification: {
                title,
                body
              },
              webpush: {
                notification: {
                  title,
                  body,
                  icon: "/rwtlogo.png",
                  badge: "/favicon.svg",
                  tag: "ems-notification",
                  renotify: true
                },
                fcmOptions: {
                  link: actionUrl
                },
                data: {
                  title,
                  body,
                  actionUrl
                }
              }
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

/** Sends an FCM push notification to all registered admin users using FCM HTTP v1 */
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



