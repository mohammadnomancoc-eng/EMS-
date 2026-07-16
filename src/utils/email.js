/**
 * Sends a transactional email using secure Vercel Serverless Function and Resend.
 */
export async function sendEmail({ to, subject, html, name, replyTo }) {
  try {
    const response = await fetch("/api/sendEmail", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        to,
        subject,
        html,
        name,
        replyTo
      })
    });
    if (!response.ok) {
      console.warn(`[Email] API returned status ${response.status}`);
      return { success: false, status: response.status };
    }
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const data = await response.json();
      console.log("[Email] Email send response:", data);
      return data;
    } else {
      const text = await response.text();
      return { success: true, text };
    }
  } catch (err) {
    console.error("[Email] Failed to send email:", err);
  }
}

export async function notifyRequest(data) {
  try {
    const response = await fetch("/api/notify-request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      console.warn(`[Email] Request notification API returned status ${response.status}`);
      return { success: false, status: response.status };
    }
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return await response.json();
    } else {
      const text = await response.text();
      return { success: true, text };
    }
  } catch (err) {
    console.error("[Email] Failed to notify request:", err);
  }
}

export async function notifyStatus(data) {
  try {
    const response = await fetch("/api/notify-status", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      console.warn(`[Email] Status notification API returned status ${response.status}`);
      return { success: false, status: response.status };
    }
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return await response.json();
    } else {
      const text = await response.text();
      return { success: true, text };
    }
  } catch (err) {
    console.error("[Email] Failed to notify status:", err);
  }
}
