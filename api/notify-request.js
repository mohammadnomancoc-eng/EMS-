// RESEND — re-enable once domain is verified
// import { Resend } from "resend";

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { employeeName, employeeEmail, requestType, leaveType, from, to, reason } = req.body || {};

  if (!employeeName || !requestType || !from || !to) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
  if (!ADMIN_EMAIL) {
    console.error("[Email] Missing ADMIN_EMAIL env var.");
    return res.status(500).json({ error: "Server configuration is missing." });
  }

  try {
    const subject = `New ${requestType} request from ${employeeName}`;
    const dates = from === to ? from : `${from} to ${to}`;
    const html = `
      <p>Hi Admin,</p>
      <p>${employeeName} has submitted a new ${requestType}${leaveType ? ` (${leaveType})` : ''} request.</p>
      <p>Dates: ${dates}</p>
      <p>Reason: ${reason || 'Not specified'}</p>
      <p>You can review this request in the <a href="https://royals-ems-portal.vercel.app/leave">EMS Portal</a>.</p>
    `;

    // ── Google Apps Script mailer (stopgap until Resend domain is verified) ──
    const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL;
    if (!GOOGLE_SCRIPT_URL) {
      console.error("[Email] Missing GOOGLE_SCRIPT_URL env var.");
      return res.status(500).json({ error: "Google Script URL is not configured." });
    }

    const payload = {
      to: ADMIN_EMAIL,
      subject,
      html,
      name: employeeName
    };
    if (employeeEmail) {
      payload.replyTo = employeeEmail;
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
    //   to: ADMIN_EMAIL,
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
