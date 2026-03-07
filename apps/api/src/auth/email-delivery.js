function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildVerificationEmail({ fullName, code, expiresInSec }) {
  const safeName = escapeHtml(fullName || 'there');
  const safeCode = escapeHtml(code);
  const minutes = Math.max(1, Math.round(Number(expiresInSec || 0) / 60));

  return {
    subject: 'Your Senpai Jepang verification code',
    text: [
      `Hi ${fullName || 'there'},`,
      '',
      `Your Senpai Jepang verification code is: ${code}`,
      '',
      `This code will expire in ${minutes} minute(s).`,
      '',
      'If you did not request this, you can ignore this email.'
    ].join('\n'),
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111827; line-height: 1.5;">
        <p>Hi ${safeName},</p>
        <p>Your Senpai Jepang verification code is:</p>
        <p style="font-size: 32px; font-weight: 700; letter-spacing: 6px; margin: 24px 0;">${safeCode}</p>
        <p>This code will expire in ${minutes} minute(s).</p>
        <p>If you did not request this, you can ignore this email.</p>
      </div>
    `
  };
}

class LogEmailDelivery {
  constructor({ logger }) {
    this.logger = logger;
    this.provider = 'log';
  }

  async sendVerificationCode({ to, fullName, code, expiresInSec }) {
    const payload = buildVerificationEmail({ fullName, code, expiresInSec });
    this.logger?.info('auth.email_verification.logged', {
      provider: this.provider,
      to,
      subject: payload.subject,
      code
    });
    return {
      provider: this.provider,
      accepted: true
    };
  }
}

class ResendEmailDelivery {
  constructor({ apiKey, fromEmail, logger }) {
    this.apiKey = apiKey;
    this.fromEmail = fromEmail;
    this.logger = logger;
    this.provider = 'resend';
  }

  async sendVerificationCode({ to, fullName, code, expiresInSec }) {
    const payload = buildVerificationEmail({ fullName, code, expiresInSec });
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: this.fromEmail,
        to: [to],
        subject: payload.subject,
        text: payload.text,
        html: payload.html
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger?.error('auth.email_verification.delivery_failed', {
        provider: this.provider,
        to,
        statusCode: response.status,
        errorText
      });
      throw new Error(`email delivery failed with status ${response.status}`);
    }

    const body = await response.json();
    this.logger?.info('auth.email_verification.sent', {
      provider: this.provider,
      to,
      emailId: body?.id || null
    });
    return {
      provider: this.provider,
      accepted: true,
      emailId: body?.id || null
    };
  }
}

export function createEmailDelivery({ env = process.env, logger } = {}) {
  const provider = String(env.AUTH_EMAIL_PROVIDER || env.EMAIL_PROVIDER || 'log')
    .trim()
    .toLowerCase();

  if (provider === 'resend') {
    const apiKey = String(env.AUTH_EMAIL_RESEND_API_KEY || env.RESEND_API_KEY || '').trim();
    const fromEmail = String(env.AUTH_EMAIL_FROM || env.EMAIL_FROM || '').trim();
    if (!apiKey || !fromEmail) {
      throw new Error('AUTH_EMAIL_PROVIDER=resend requires AUTH_EMAIL_RESEND_API_KEY and AUTH_EMAIL_FROM');
    }
    return new ResendEmailDelivery({
      apiKey,
      fromEmail,
      logger
    });
  }

  return new LogEmailDelivery({ logger });
}
