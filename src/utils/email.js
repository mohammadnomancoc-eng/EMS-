/**
 * Sends a transactional email using secure Vercel Serverless Function and Resend.
 */
export async function sendEmail({ to, subject, html }) {
  try {
    const response = await fetch("/api/sendEmail", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        to,
        subject,
        html
      })
    });
    const data = await response.json();
    console.log("[Email] Email send response:", data);
    return data;
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
    return await response.json();
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
    return await response.json();
  } catch (err) {
    console.error("[Email] Failed to notify status:", err);
  }
}
