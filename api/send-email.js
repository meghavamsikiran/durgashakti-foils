const nodemailer = require('nodemailer');

module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, subject, body, smtp_user, smtp_pass } = req.body;

  if (!to || !subject || !body || !smtp_user || !smtp_pass) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  // Try Port 587 (TLS)
  try {
    console.log(`Vercel Relay: Connecting to Gmail SMTP on port 587...`);
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // TLS
      auth: {
        user: smtp_user,
        pass: smtp_pass,
      },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
    });

    await transporter.sendMail({
      from: `DurgaShakti Foils <${smtp_user}>`,
      to,
      subject,
      html: body,
    });

    console.log(`Vercel Relay: SUCCESS on port 587!`);
    return res.status(200).json({ message: 'Email sent successfully via Vercel Port 587!' });
  } catch (error587) {
    console.warn(`Vercel Relay: Port 587 failed (${error587.message}). Attempting fallback to Port 465 (SSL)...`);

    // Try Port 465 (SSL)
    try {
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true, // SSL
        auth: {
          user: smtp_user,
          pass: smtp_pass,
        },
        connectionTimeout: 8000,
        greetingTimeout: 8000,
      });

      await transporter.sendMail({
        from: `DurgaShakti Foils <${smtp_user}>`,
        to,
        subject,
        html: body,
      });

      console.log(`Vercel Relay: SUCCESS on fallback port 465!`);
      return res.status(200).json({ message: 'Email sent successfully via Vercel Fallback Port 465!' });
    } catch (error465) {
      console.error(`Vercel Relay: Both ports failed.`);
      return res.status(500).json({
        error: `Port 587 failed: ${error587.message}. Port 465 failed: ${error465.message}`
      });
    }
  }
};
