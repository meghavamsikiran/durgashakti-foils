const nodemailer = require('nodemailer');

const fromEmail = (fallback) => process.env.EMAIL_FROM || process.env.SMTP_FROM || fallback;
const fromName = () => process.env.EMAIL_FROM_NAME || 'Durga Shakti Foils';

const normalizeAttachments = (attachments = []) => Array.isArray(attachments)
  ? attachments
      .filter((att) => att && att.content)
      .map((att) => {
        const rawContent = String(att.content);
        const base64Content = rawContent.includes(',') ? rawContent.split(',').pop() : rawContent;
        return {
          filename: att.filename || 'attachment.pdf',
          content: base64Content,
          contentType: att.contentType || 'application/pdf',
        };
      })
  : [];

async function sendViaApiProvider({ to, subject, body, attachments, sender }) {
  const providers = [
    {
      name: 'Resend',
      key: process.env.RESEND_API_KEY,
      url: 'https://api.resend.com/emails',
      headers: (key) => ({ Authorization: `Bearer ${key}` }),
      payload: () => ({
        from: `${fromName()} <${sender}>`,
        to: [to],
        subject,
        html: body,
        ...(attachments.length ? { attachments: attachments.map((att) => ({ filename: att.filename, content: att.content })) } : {}),
      }),
    },
    {
      name: 'Brevo',
      key: process.env.BREVO_API_KEY || process.env.SENDINBLUE_API_KEY,
      url: 'https://api.brevo.com/v3/smtp/email',
      headers: (key) => ({ 'api-key': key, accept: 'application/json' }),
      payload: () => ({
        sender: { name: fromName(), email: sender },
        to: [{ email: to }],
        subject,
        htmlContent: body,
        ...(attachments.length ? { attachment: attachments.map((att) => ({ name: att.filename, content: att.content })) } : {}),
      }),
    },
    {
      name: 'SendGrid',
      key: process.env.SENDGRID_API_KEY,
      url: 'https://api.sendgrid.com/v3/mail/send',
      headers: (key) => ({ Authorization: `Bearer ${key}` }),
      payload: () => ({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: sender, name: fromName() },
        subject,
        content: [{ type: 'text/html', value: body }],
        ...(attachments.length ? {
          attachments: attachments.map((att) => ({
            filename: att.filename,
            content: att.content,
            type: att.contentType,
            disposition: 'attachment',
          })),
        } : {}),
      }),
    },
  ];

  const preferred = String(process.env.EMAIL_PROVIDER || '').toLowerCase();
  if (preferred) providers.sort((a, b) => (a.name.toLowerCase() === preferred ? -1 : b.name.toLowerCase() === preferred ? 1 : 0));

  const errors = [];
  for (const provider of providers) {
    if (!provider.key) continue;
    try {
      const response = await fetch(provider.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...provider.headers(provider.key) },
        body: JSON.stringify(provider.payload()),
      });
      const text = await response.text();
      if (response.ok) {
        return { ok: true, message: `Email sent via ${provider.name}` };
      }
      errors.push(`${provider.name} returned ${response.status}: ${text.slice(0, 250)}`);
    } catch (error) {
      errors.push(`${provider.name} failed: ${error.message}`);
    }
  }
  return { ok: false, message: errors.length ? errors.join('; ') : 'No HTTPS email provider configured.' };
}

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

  const { to, subject, body, smtp_user, smtp_pass, attachments = [] } = req.body;

  if (!to || !subject || !body) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  const normalizedAttachments = normalizeAttachments(attachments);
  const sender = fromEmail(smtp_user);
  const apiResult = await sendViaApiProvider({ to, subject, body, attachments: normalizedAttachments, sender });
  if (apiResult.ok) {
    return res.status(200).json({ message: apiResult.message });
  }

  if (!smtp_user || !smtp_pass) {
    return res.status(500).json({ error: `${apiResult.message} SMTP credentials are not configured.` });
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
      from: `${fromName()} <${sender}>`,
      to,
      subject,
      html: body,
      attachments: normalizedAttachments.map((att) => ({ ...att, content: Buffer.from(att.content, 'base64') })),
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
        from: `${fromName()} <${sender}>`,
        to,
        subject,
        html: body,
        attachments: normalizedAttachments.map((att) => ({ ...att, content: Buffer.from(att.content, 'base64') })),
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
