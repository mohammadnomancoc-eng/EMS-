import { Resend } from "resend";

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

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    console.error("[Resend API] Missing RESEND_API_KEY env var.");
    return res.status(500).json({ error: "Resend API key is missing on the server." });
  }

  const resend = new Resend(RESEND_API_KEY);
  const fromEmail = process.env.RESEND_FROM_EMAIL || "Royals EMS <onboarding@resend.dev>";

  try {
    const data = await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      html,
    });

    if (data.error) {
      console.error("[Resend API] Resend returned error:", data.error);
      return res.status(400).json({ error: data.error.message || "Failed to send email" });
    }

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("[Resend API] Catch error sending email:", err);
    return res.status(500).json({ error: err.message || "Failed to send email via Resend" });
  }
}
