import OneSignal from "react-onesignal";

const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID;

/**
 * Initializes OneSignal and registers/tags the logged-in user.
 */
export async function initOneSignal(user) {
  if (!ONESIGNAL_APP_ID) {
    console.warn("[OneSignal] App ID not configured in .env");
    return;
  }

  try {
    await OneSignal.init({
      appId: ONESIGNAL_APP_ID,
      allowLocalhostAsSecureOrigin: true,
      notifyButton: {
        enable: false
      }
    });

    if (user) {
      // Login the user session to OneSignal
      await OneSignal.login(user.uid);
      
      const role = user.role || (user.email === "admin@royalswebtech.com" ? "admin" : null);
      const empId = user.empId || (role === "admin" ? "admin" : null);

      // Tag the user for targeted push notifications
      if (role) {
        await OneSignal.User.addTag("role", role);
      }
      if (empId) {
        await OneSignal.User.addTag("empId", empId);
      }
      console.log("[OneSignal] Checking department tag. user.department =", user.department);
      if (user.department) {
        console.log(`[OneSignal] Calling OneSignal.User.addTag("department", "${user.department}")`);
        await OneSignal.User.addTag("department", user.department);
      }
      console.log(`[OneSignal] User ${user.uid} initialized with role: ${role}, empId: ${empId}, department: ${user.department || "none"}`);
    }
  } catch (err) {
    console.error("[OneSignal] Initialization error:", err);
  }
}

/**
 * Logs out the current user session from OneSignal.
 */
export async function logoutOneSignal() {
  if (!ONESIGNAL_APP_ID) return;
  try {
    await OneSignal.logout();
  } catch (err) {
    console.error("[OneSignal] Logout error:", err);
  }
}

/**
 * Sends a push notification using secure Vercel Serverless Function.
 */
export async function sendOneSignalPush({
  title,
  body,
  actionUrl = "/",
  targetRole = null,
  targetEmpId = null,
  targetDepartment = null
}) {
  try {
    const response = await fetch("/api/sendPushNotification", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title,
        body,
        actionUrl,
        targetRole,
        targetEmpId,
        targetDepartment
      })
    });
    const data = await response.json();
    console.log("[OneSignal] Push notification response from Vercel function:", data);
    return data;
  } catch (err) {
    console.error("[OneSignal] Failed to send push notification via Vercel function:", err);
  }
}
