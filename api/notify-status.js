// RESEND — re-enable once domain is verified
// import { Resend } from "resend";

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { email, employeeName, requestType, status, dates } = req.body || {};

  if (!email || !employeeName || !requestType || !status || !dates) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const subject = `Your ${requestType} request has been ${status}`;

    const html = `
      <p>Hi ${employeeName},</p>
      <p>Your ${requestType} request for ${dates} has been ${status}.</p>
      <p>You can check the details anytime in the <a href="https://royals-ems-portal.vercel.app/my-leave">EMS Portal</a>.</p>
    `;

    // ── Google Apps Script mailer (stopgap until Resend domain is verified) ──
    const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL;
    if (!GOOGLE_SCRIPT_URL) {
      console.error("[Email] Missing GOOGLE_SCRIPT_URL env var.");
      return res.status(500).json({ error: "Google Script URL is not configured." });
    }

    const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
    const payload = {
      to: email,
      subject,
      html,
      name: "Royals EMS"
    };
    if (ADMIN_EMAIL) {
      payload.replyTo = ADMIN_EMAIL;
    }

    const gasRes = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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
    //   return res.status(500).json({ error: "Server configuration is missing." });
    // }
    // const resend = new Resend(RESEND_API_KEY);
    // const fromEmail = "Royals EMS <onboarding@resend.dev>";
    // const data = await resend.emails.send({
    //   from: fromEmail,
    //   to: email,
    //   subject,
    //   html,
    // });
    // if (data.error) {
    //   console.error("[Resend API] Error from Resend:", data.error);
    //   return res.status(400).json({ error: data.error.message });
    // }

    return res.status(200).json({ success: true, data: gasData });
  } catch (err) {
    console.error("[Email] Exception:", err);
    return res.status(500).json({ error: err.message });
  }
}
