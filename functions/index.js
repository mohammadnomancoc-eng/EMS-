// ─────────────────────────────────────────────────────────────
//  functions/index.js
//
//  Firebase Cloud Functions for EMS Push Notifications.
//
//  Triggers:
//   1. onNotificationCreated — When a new doc is written to /notifications,
//      determines the audience (all admins, specific employee, department)
//      and sends FCM push notifications via the Admin SDK.
//
//  This replaces the broken client-side sendFCMPush / sendFCMPushToAdmins
//  calls that used the deprecated legacy FCM HTTP endpoint.
//
//  Deploy:
//    cd functions && npm install
//    firebase deploy --only functions
// ─────────────────────────────────────────────────────────────
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

// Initialize Firebase Admin SDK (auto-detects project credentials when deployed)
initializeApp();
const db = getFirestore();

/**
 * Collects all FCM device tokens for a given user UID.
 * Tokens are stored in /users/{uid}/devices/{deviceId}.token
 *
 * @param {string} uid  Firebase Auth UID
 * @returns {Promise<string[]>}  Array of FCM registration tokens
 */
async function getTokensForUser(uid) {
  const devicesSnap = await db.collection("users").doc(uid).collection("devices").get();
  const tokens = [];
  devicesSnap.forEach((doc) => {
    const data = doc.data();
    if (data.token) tokens.push(data.token);
  });
  return tokens;
}

/**
 * Sends an FCM notification to a list of device tokens.
 * Uses the Admin SDK's sendEachForMulticast — the modern, supported API.
 *
 * Automatically cleans up invalid / expired tokens from Firestore.
 *
 * @param {string[]} tokens       FCM registration tokens
 * @param {string}   title        Notification title
 * @param {string}   body         Notification body text
 * @param {string}   actionUrl    URL to open when notification is clicked
 * @param {string[]} [userUids]   Optional: UIDs that own the tokens (for cleanup)
 */
async function sendPushToTokens(tokens, title, body, actionUrl = "/", userUids = []) {
  if (!tokens.length) return;

  const messaging = getMessaging();

  const message = {
    notification: {
      title,
      body,
    },
    webpush: {
      notification: {
        title,
        body,
        icon: "/rwtlogo.png",
        badge: "/favicon.svg",
        tag: "ems-notification",
        renotify: true,
      },
      fcmOptions: {
        link: actionUrl,
      },
      data: {
        title,
        body,
        actionUrl,
      },
    },
  };

  // Send to each token individually for better error handling
  const results = await Promise.allSettled(
    tokens.map((token) =>
      messaging.send({ ...message, token })
    )
  );

  // Log results
  let successCount = 0;
  const failedTokens = [];

  results.forEach((result, idx) => {
    if (result.status === "fulfilled") {
      successCount++;
    } else {
      const errorCode = result.reason?.code;
      console.warn(
        `[FCM] Failed to send to token ${tokens[idx].substring(0, 20)}...: ${errorCode || result.reason?.message}`
      );
      // Mark invalid tokens for cleanup
      if (
        errorCode === "messaging/invalid-registration-token" ||
        errorCode === "messaging/registration-token-not-registered"
      ) {
        failedTokens.push(tokens[idx]);
      }
    }
  });

  console.log(
    `[FCM] Push sent: ${successCount}/${tokens.length} succeeded, ${failedTokens.length} invalid tokens`
  );

  // Clean up invalid tokens from Firestore
  if (failedTokens.length > 0) {
    await cleanupInvalidTokens(failedTokens);
  }
}

/**
 * Removes invalid/expired tokens from Firestore.
 * Searches all users' device subcollections for the matching token.
 */
async function cleanupInvalidTokens(invalidTokens) {
  try {
    const usersSnap = await db.collection("users").get();
    const batch = db.batch();
    let deleteCount = 0;

    for (const userDoc of usersSnap.docs) {
      const devicesSnap = await userDoc.ref.collection("devices").get();
      for (const deviceDoc of devicesSnap.docs) {
        if (invalidTokens.includes(deviceDoc.data().token)) {
          batch.delete(deviceDoc.ref);
          deleteCount++;
        }
      }
    }

    if (deleteCount > 0) {
      await batch.commit();
      console.log(`[FCM] Cleaned up ${deleteCount} invalid device tokens.`);
    }
  } catch (err) {
    console.error("[FCM] Token cleanup error:", err);
  }
}

// ════════════════════════════════════════════════════════════
//  CLOUD FUNCTION: onNotificationCreated
//
//  Triggers when a new document is created in /notifications.
//  Determines the audience and sends FCM push notifications.
//
//  Notification doc fields used:
//    type         : "all" | "employee" | "department"
//    recipientRole: "admin" | null
//    recipientId  : empId (for employee-targeted)
//    targetId     : empId or department name
//    title        : notification title
//    message/body : notification body
//    actionUrl    : URL to navigate to on click
// ════════════════════════════════════════════════════════════
exports.onNotificationCreated = onDocumentCreated(
  "notifications/{notifId}",
  async (event) => {
    const notif = event.data?.data();
    if (!notif) {
      console.log("[FCM] No notification data found, skipping.");
      return;
    }

    const title = notif.title || "EMS Notification";
    const body = notif.message || notif.body || "";
    const actionUrl = notif.actionUrl || "/";
    const type = notif.type || "all";
    const recipientRole = notif.recipientRole || null;
    const recipientId = notif.recipientId || notif.targetId || null;

    console.log(
      `[FCM] Processing notification: type=${type}, recipientRole=${recipientRole}, recipientId=${recipientId}, title="${title}"`
    );

    try {
      let allTokens = [];

      // ── Case 1: Send to all admins ──
      if (recipientRole === "admin" || (type === "all" && !recipientId)) {
        // Always notify admins for "all" type and explicitly admin-targeted
        const adminsSnap = await db
          .collection("users")
          .where("role", "==", "admin")
          .get();

        console.log(`[FCM] Found ${adminsSnap.size} admin user(s).`);

        for (const adminDoc of adminsSnap.docs) {
          const tokens = await getTokensForUser(adminDoc.id);
          allTokens.push(...tokens);
        }
      }

      // ── Case 2: Send to a specific employee ──
      if (type === "employee" && recipientId) {
        // Look up the user doc by empId
        const userSnap = await db
          .collection("users")
          .where("empId", "==", recipientId)
          .get();

        console.log(
          `[FCM] Found ${userSnap.size} user(s) for empId=${recipientId}.`
        );

        for (const userDoc of userSnap.docs) {
          const tokens = await getTokensForUser(userDoc.id);
          allTokens.push(...tokens);
        }
      }

      // ── Case 3: Send to a department ──
      if (type === "department" && recipientId) {
        // Find all employees in the department
        const empSnap = await db
          .collection("employees")
          .where("department", "==", recipientId)
          .get();

        const empIds = empSnap.docs.map((d) => d.id);
        console.log(
          `[FCM] Department "${recipientId}" has ${empIds.length} employee(s).`
        );

        // For each employee, find their user doc and get tokens
        for (const empId of empIds) {
          const userSnap = await db
            .collection("users")
            .where("empId", "==", empId)
            .get();

          for (const userDoc of userSnap.docs) {
            const tokens = await getTokensForUser(userDoc.id);
            allTokens.push(...tokens);
          }
        }
      }

      // ── Case 4: type === "all" and no specific recipientRole ──
      // Send to ALL users (admins + employees)
      if (type === "all" && !recipientRole) {
        const allUsersSnap = await db.collection("users").get();
        console.log(`[FCM] Broadcasting to all ${allUsersSnap.size} user(s).`);

        for (const userDoc of allUsersSnap.docs) {
          const tokens = await getTokensForUser(userDoc.id);
          allTokens.push(...tokens);
        }
      }

      // De-duplicate tokens
      allTokens = [...new Set(allTokens)];

      if (allTokens.length === 0) {
        console.log("[FCM] No device tokens found for target audience. Skipping push.");
        return;
      }

      console.log(`[FCM] Sending push to ${allTokens.length} device(s)...`);
      await sendPushToTokens(allTokens, title, body, actionUrl);

      // Update the notification doc to mark push as sent
      await event.data.ref.update({
        pushSent: true,
        pushSentAt: new Date(),
        pushDeviceCount: allTokens.length,
      });

      console.log(`[FCM] ✅ Push notification dispatched for notifId=${event.params.notifId}`);
    } catch (err) {
      console.error("[FCM] ❌ Error processing notification:", err);
    }
  }
);


