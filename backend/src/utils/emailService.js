import nodemailer from 'nodemailer';

/**
 * Send email using configured transport
 * @param {Object} options - Email options (to, subject, html)
 * @returns {Promise} - Resolves with info about sent email
 */
const sendEmail = async (options) => {
  try {
    // Get email config with explicit fallbacks
    const emailHost = process.env.EMAIL_HOST || 'smtp.gmail.com';
    const emailPort = parseInt(process.env.EMAIL_PORT || '465');
    const emailSecure = process.env.EMAIL_SECURE === 'true';
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;
    
    // Log configuration for debugging
    console.log('Email configuration (fixed):', {
      host: emailHost,
      port: emailPort,
      secure: emailSecure,
      user: emailUser ? '***' : 'not set',
      pass: emailPass ? '***' : 'not set'
    });

    if (!emailUser || !emailPass) {
      throw new Error('Email credentials not configured. Check EMAIL_USER and EMAIL_PASS env variables.');
    }

    // Create transporter with fixed variables
    const transporter = nodemailer.createTransport({
      host: emailHost,
      port: emailPort,
      secure: emailSecure,
      auth: {
        user: emailUser,
        pass: emailPass,
      }
    });

    // Default from address
    const from = process.env.EMAIL_FROM || emailUser;

    // Email content
    const mailOptions = {
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
    };

    console.log(`Attempting to send email to: ${options.to}`);
    
    // Verify SMTP configuration before sending
    await transporter.verify();
    console.log('SMTP connection verified successfully');
    
    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('Email sending failed:', error);
    throw error; // Re-throw to handle in the calling function
  }
};

// Export as default for ES modules
export default sendEmail;