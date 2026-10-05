// Email Controller — SendGrid integration via the Mail Send API
// SECURITY: the SendGrid API key lives ONLY in server environment variables
// (SENDGRID_API_KEY). It is never returned in any response, never embedded in
// the frontend, and never logged. The status endpoint reports a boolean only.
const sgMail = require('@sendgrid/mail');

// ── BASIC EMAIL SHAPE CHECK (same rule enforced on the settings page) ──
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── SENDGRID CONFIG READ FROM ENV ON EVERY CALL (so .env edits apply after restart) ──
// SENDGRID_API_KEY    : full SendGrid API key (SG.xxxx...) — server-side secret
// SENDGRID_FROM_EMAIL : a Single Verified Sender address configured in SendGrid
// SENDGRID_FROM_NAME  : display name for outgoing mail (optional)
function _emailConfig() {
  return {
    apiKey: (process.env.SENDGRID_API_KEY || '').trim(),
    fromEmail: (process.env.SENDGRID_FROM_EMAIL || '').trim(),
    fromName: (process.env.SENDGRID_FROM_NAME || '').trim(),
  };
}

// ── SIMPLE PER-USER COOLDOWN so the test button cannot be spammed ──
const _lastSentAt = new Map(); // userId -> timestamp of last SUCCESSFUL send
const TEST_EMAIL_COOLDOWN_MS = 30 * 1000;

// @route   GET /api/email/status — SendGrid configuration status (no secrets returned)
exports.getEmailStatus = (req, res) => {
  const { apiKey, fromEmail, fromName } = _emailConfig();
  const configured = !!(apiKey && fromEmail);
  res.json({
    success: true,
    data: {
      configured,
      // the From address is not a secret (it appears on every sent email);
      // the API key itself is never included in any response
      fromEmail: configured ? fromEmail : null,
      fromName: fromName || null,
    },
  });
};

// @route   POST /api/email/test — send a test email through the SendGrid Mail Send API
exports.sendTestEmail = async (req, res, next) => {
  try {
    // ── RECIPIENT VALIDATION ──
    const to = String((req.body && req.body.to) || '').trim().toLowerCase();
    if (!to) {
      return res.status(400).json({ success: false, message: 'Recipient email address is required.' });
    }
    if (to.length > 254 || !EMAIL_RE.test(to)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    }

    // ── SERVER-SIDE SENDGRID CONFIG CHECK ──
    const { apiKey, fromEmail, fromName } = _emailConfig();
    if (!apiKey || !fromEmail) {
      return res.status(503).json({
        success: false,
        message: 'SendGrid is not configured on the server. Add SENDGRID_API_KEY and SENDGRID_FROM_EMAIL to server/.env, then restart the backend.',
      });
    }
    if (!EMAIL_RE.test(fromEmail)) {
      return res.status(503).json({
        success: false,
        message: 'SENDGRID_FROM_EMAIL in server/.env is not a valid email address. Fix it, then restart the backend.',
      });
    }

    // ── COOLDOWN CHECK (defence in depth behind the UI loading state) ──
    const uid = String(req.user._id);
    const last = _lastSentAt.get(uid) || 0;
    if (Date.now() - last < TEST_EMAIL_COOLDOWN_MS) {
      const wait = Math.ceil((TEST_EMAIL_COOLDOWN_MS - (Date.now() - last)) / 1000);
      return res.status(429).json({
        success: false,
        message: `Please wait ${wait} second${wait === 1 ? '' : 's'} before sending another test email.`,
      });
    }

    // ── SEND VIA THE SENDGRID MAIL SEND API (v3/mail/send) ──
    sgMail.setApiKey(apiKey);
    const sentAt = new Date().toLocaleString();
    const msg = {
      to,
      from: { email: fromEmail, name: fromName || 'PhotoPro AI' },
      subject: 'PhotoPro AI — Test Email',
      text: `Hello,\n\nThis is a test email sent from your PhotoPro AI Management System via the SendGrid Mail Send API.\n\nIf you received this message, your email integration is working correctly.\n\nSent at ${sentAt} · PhotoPro AI Management System`,
      html: `
        <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;border:1px solid #e5e5e5;border-radius:10px;overflow:hidden">
          <div style="background:#1f2937;color:#f4e8c1;padding:20px 24px">
            <h2 style="margin:0;font-size:18px">PhotoPro AI Management System</h2>
          </div>
          <div style="padding:24px;color:#333333;font-size:14px;line-height:1.6">
            <p>Hello,</p>
            <p>This is a <strong>test email</strong> sent via the <strong>SendGrid Mail Send API</strong>.</p>
            <p>If you received this message, your email integration is working correctly.</p>
            <p style="color:#888888;font-size:12px;margin-top:28px">Sent at ${sentAt} · PhotoPro AI Management System</p>
          </div>
        </div>`,
    };
    await sgMail.send(msg);

    _lastSentAt.set(uid, Date.now());
    res.json({ success: true, message: `Test email sent to ${to}. Please check the inbox (and spam folder).`, data: { to } });
  } catch (error) {
    // ── MAP SENDGRID API ERRORS TO FRIENDLY MESSAGES (never leak internals or the key) ──
    const status = error && error.code;
    const sgDetail = error && error.response && error.response.body
      && Array.isArray(error.response.body.errors) && error.response.body.errors[0]
      && error.response.body.errors[0].message;

    if (status === 401 || status === 403) {
      return res.status(400).json({
        success: false,
        message: `SendGrid rejected the request — check that SENDGRID_API_KEY is a valid Mail Send API key and that the sender email is verified in SendGrid. ${sgDetail ? `(${sgDetail})` : ''}`.trim(),
      });
    }
    if (status === 402) {
      return res.status(400).json({ success: false, message: 'SendGrid reports insufficient credits on the account.' });
    }
    if (status === 429) {
      return res.status(429).json({ success: false, message: 'SendGrid rate limit reached. Please wait a moment and try again.' });
    }
    // Network / DNS / unexpected failures
    return next(error);
  }
};
