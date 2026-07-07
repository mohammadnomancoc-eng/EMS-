// RESEND — re-enable once domain is verified
// import { Resend } from "resend";

/**
 * Generic email handler — used by firestoreService.js for status update emails.
 * Currently routes through Google Apps Script; Resend code preserved below.
 */
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { to, subject, html } = req.body || {};

  if (!to || !subject || !html) {
    return res.status(400).json({ error: "Missing required fields: to, subject, html" });
  }

  try {
    // ── Google Apps Script mailer (stopgap until Resend domain is verified) ──
    const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL;
    if (!GOOGLE_SCRIPT_URL) {
      console.error("[Email] Missing GOOGLE_SCRIPT_URL env var.");
      return res.status(500).json({ error: "Google Script URL is not configured." });
    }

    const gasRes = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject, html }),
    });
    const gasData = await gasRes.json();

    if (!gasRes.ok) {
      console.error("[Google Script] Error:", gasData);
      return res.status(400).json({ error: gasData.error || "Failed to send email" });
    }

    // RESEND — re-enable once domain is verified
    // const RESEND_API_KEY = process.env.RESEND_API_KEY;
    // if (!RESEND_API_KEY) {
    //   console.error("[Resend API] Missing RESEND_API_KEY env var.");
    //   return res.status(500).json({ error: "Resend API key is missing on the server." });
    // }
    // const resend = new Resend(RESEND_API_KEY);
    // const fromEmail = process.env.RESEND_FROM_EMAIL || "Royals EMS <onboarding@resend.dev>";
    // const data = await resend.emails.send({
    //   from: fromEmail,
    //   to,
    //   subject,
    //   html,
    // });
    // if (data.error) {
    //   console.error("[Resend API] Resend returned error:", data.error);
    //   return res.status(400).json({ error: data.error.message || "Failed to send email" });
    // }

    return res.status(200).json({ success: true, data: gasData });
  } catch (err) {
    console.error("[Email] Exception:", err);
    return res.status(500).json({ error: err.message || "Failed to send email" });
  }
}
