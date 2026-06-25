export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const {
    title,
    body,
    actionUrl = "/",
    targetRole = null,
    targetEmpId = null,
    targetDepartment = null,
  } = req.body || {};

  const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
  const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
    console.error("[OneSignal API] Missing ONESIGNAL_APP_ID or ONESIGNAL_REST_API_KEY env vars.");
    return res.status(500).json({ error: "OneSignal configuration is missing on the server." });
  }

  try {
    const filters = [];
    if (targetRole) {
      filters.push({ field: "tag", key: "role", relation: "=", value: targetRole });
    }
    if (targetEmpId) {
      if (filters.length > 0) filters.push({ operator: "AND" });
      filters.push({ field: "tag", key: "empId", relation: "=", value: targetEmpId });
    }
    if (targetDepartment) {
      if (filters.length > 0) filters.push({ operator: "AND" });
      filters.push({ field: "tag", key: "department", relation: "=", value: targetDepartment });
    }

    const payload = {
      app_id: ONESIGNAL_APP_ID,
      headings: { en: title },
      contents: { en: body },
      url: actionUrl,
    };

    if (filters.length > 0) {
      payload.filters = filters;
    } else {
      payload.included_segments = ["Subscribed Users"];
    }

    console.log("[OneSignal API] Dispatching push notification:", payload);

    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const resData = await response.json();
    return res.status(response.status).json(resData);
  } catch (err) {
    console.error("[OneSignal API] Error sending push notification:", err);
    return res.status(500).json({ error: err.message || "Failed to send OneSignal push notification" });
  }
}
