import { Resend } from "resend";

// Initialize Resend with your API key
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send an email using the Resend API
 * @param {Object} options
 * @param {string|string[]} options.to       - Recipient email address(es)
 * @param {string}          options.subject  - Email subject
 * @param {string}          options.html     - HTML body
 * @param {string}          [options.from]   - Override sender (defaults to env)
 * @returns {Promise<Object>} Resend response { id }
 */
export default async function sendEmail({ to, subject, html, from }) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error(
      "RESEND_API_KEY is not set in environment variables. " +
        "Please add it to your .env file."
    );
  }

  // Strip any surrounding quotes that may come from .env parsing
  const rawFrom =
    from ||
    process.env.EMAIL_FROM ||
    "CyberLearn Support <noreply@cyberlearn.online>";

  const fromAddress = rawFrom.replace(/^["']|["']$/g, "").trim();

  console.log(`[emailService] Sending email via Resend to: ${to}`);
  console.log(`[emailService] From: ${fromAddress}`);
  console.log(`[emailService] Subject: ${subject}`);

  try {
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    });

    if (error) {
      console.error("[emailService] Resend API error:", JSON.stringify(error, null, 2));
      throw new Error(
        `Resend API error: ${error.message || JSON.stringify(error)}`
      );
    }

    console.log(`[emailService] Email sent successfully. ID: ${data?.id}`);
    return data;
  } catch (err) {
    console.error("[emailService] Failed to send email:", err.message);
    throw err;
  }
}