import crypto from "crypto";
import sendEmail from "./emailService.js";

const isTruthyFlag = (value) =>
  value === true || value === "true" || value === 1 || value === "1";

const pickRandomChar = (charset) => {
  const index = crypto.randomInt(0, charset.length);
  return charset[index];
};

export const generateTemporaryPassword = (length = 8) => {
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";

  const all = `${lower}${upper}${digits}`;
  const chars = [
    pickRandomChar(lower),
    pickRandomChar(upper),
    pickRandomChar(digits),
  ];

  while (chars.length < length) {
    chars.push(pickRandomChar(all));
  }

  // Fisher-Yates shuffle so the first four characters are not predictable.
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(0, i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join("");
};

export const sendNewAccountEmail = async ({
  to,
  fullName,
  username,
  temporaryPassword,
}) => {
  const displayName = fullName || username;

  await sendEmail({
    to,
    subject: "Your CyberLearn account is ready",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; color: #102a43;">
        <h2 style="color: #1976d2; margin-bottom: 8px;">Welcome to CyberLearn</h2>
        <p>Hello ${displayName},</p>
        <p>Your account has been created by an administrator.</p>
        <div style="background: #f5f9ff; border: 1px solid #d5e3ff; border-radius: 8px; padding: 14px; margin: 16px 0;">
          <p style="margin: 0 0 8px;"><strong>Username:</strong> ${username}</p>
          <p style="margin: 0;"><strong>Temporary Password:</strong> ${temporaryPassword}</p>
        </div>
        <p>Please sign in and change your password immediately for security.</p>
        
        <p style="color: #5f6c7b; font-size: 12px; margin-top: 24px;">This is an automated message from CyberLearn.</p>
      </div>
    `,
  });
};

export { isTruthyFlag };


