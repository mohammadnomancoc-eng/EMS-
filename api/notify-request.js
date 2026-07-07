// RESEND — re-enable once domain is verified
// import { Resend } from "resend";

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { employeeName, requestType, leaveType, from, to, reason } = req.body || {};

  if (!employeeName || !requestType || !from || !to) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
  if (!ADMIN_EMAIL) {
    console.error("[Email] Missing ADMIN_EMAIL env var.");
    return res.status(500).json({ error: "Server configuration is missing." });
  }

  try {
    const subject = `New ${requestType} Request - ${employeeName}`;
    const dates = from === to ? from : `${from} to ${to}`;
    const html = `
      <div style="font-family: 'Mulish', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="font-family: 'Rajdhani', sans-serif; color: #CC0000; margin-top: 0; border-bottom: 2px solid #CC0000; padding-bottom: 10px;">Royals Webtech Pvt. Ltd.</h2>
        <p>Hello Admin,</p>
        <p>A new <strong>${requestType}</strong> request has been submitted. Details are below:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="background-color: #f8f8f8;">
            <td style="padding: 10px; border: 1px solid #e8e8e8; font-weight: bold; width: 150px;">Employee</td>
            <td style="padding: 10px; border: 1px solid #e8e8e8;">${employeeName}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e8e8e8; font-weight: bold;">Request Type</td>
            <td style="padding: 10px; border: 1px solid #e8e8e8;">${requestType} ${leaveType ? `(${leaveType})` : ''}</td>
          </tr>
          <tr style="background-color: #f8f8f8;">
            <td style="padding: 10px; border: 1px solid #e8e8e8; font-weight: bold;">Dates</td>
            <td style="padding: 10px; border: 1px solid #e8e8e8;">${dates}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e8e8e8; font-weight: bold;">Reason</td>
            <td style="padding: 10px; border: 1px solid #e8e8e8;">${reason || 'No reason provided'}</td>
          </tr>
        </table>
        <p style="margin-top: 25px;">
          <a href="https://royals-ems-portal.vercel.app/leave" style="background-color: #CC0000; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Log in to EMS to Review</a>
        </p>
        <hr style="border: 0; border-top: 1px solid #e8e8e8; margin-top: 30px;" />
        <p style="font-size: 11px; color: #888888; text-align: center;">This is an automated notification from the Royals Webtech Employee Management System.</p>
      </div>
    `;

    // ── Google Apps Script mailer (stopgap until Resend domain is verified) ──
    const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL;
    if (!GOOGLE_SCRIPT_URL) {
      console.error("[Email] Missing GOOGLE_SCRIPT_URL env var.");
      return res.status(500).json({ error: "Google Script URL is not configured." });
    }

    const gasRes = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: ADMIN_EMAIL, subject, html }),
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
