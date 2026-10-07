// Email Templates — PhotoPro AI Management System
// ADDED BY TEAM - Email Templates: reusable, PhotoPro-branded email bodies.
// Every builder returns { subject, html, text } so messages sent through the
// SendGrid Mail Send API carry a professional HTML body AND a plain-text
// fallback. All dynamic values are passed through escapeHtml() before they are
// interpolated into HTML, and the layout mirrors the app branding (dark
// #111111 header + gold #D4AF37 accent). The generic "This is a test email..."
// body that used to be inlined in emailController.js was replaced by these
// builders — production features call buildBookingEmail, the Settings test
// button uses buildTestEmail.
'use strict';

// ── BRAND CONSTANTS (kept in sync with the app theme) ──
const BRAND = {
  name: 'PhotoPro AI Management System',
  tagline: 'Photography Studio Management System',
  dark: '#111111',
  gold: '#D4AF37',
  goldLight: '#E8D48B',
  ink: '#111111',
  text: '#333333',
  muted: '#6B7280',
  faint: '#9CA3AF',
  border: '#E5E7EB',
  surface: '#F9FAFB',
  pageBg: '#F3F4F6',
  year: new Date().getFullYear(),
};

// ── HTML SANITISER — every dynamic value must go through this before HTML ──
function escapeHtml(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── VALUE FORMATTERS (shared by the HTML and plain-text bodies) ──
function _text(value) {
  return String(value === null || value === undefined ? '' : value).trim();
}

function formatDate(value) {
  const raw = _text(value);
  if (!raw) return '';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw; // not a parseable date — show as provided
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(value) {
  const raw = _text(value);
  if (!raw) return '';
  if (value instanceof Date || !isNaN(new Date(raw).getTime()) && /t|z|\d{4}-\d{2}-\d{2}/i.test(raw) && raw.includes(':')) {
    const d = value instanceof Date ? value : new Date(raw);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    }
  }
  if (/am|pm/i.test(raw)) return raw; // already human formatted
  const m = raw.match(/^(\d{1,2}):(\d{2})/); // "14:00" / "14:00:30" stored strings
  if (!m) return raw;
  let h = parseInt(m[1], 10);
  const suffix = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m[2]} ${suffix}`;
}

function formatAmount(value) {
  const raw = _text(value);
  if (!raw) return '';
  const n = Number(raw);
  if (isNaN(n)) return raw;
  return 'Rs. ' + n.toLocaleString('en-US');
}

// ── STATUS CHIP — colour mirrors the badge tones used across the app UI ──
function _statusTone(status) {
  const s = String(status || '').toLowerCase();
  if (/confirm|complete|paid|active/.test(s)) return { bg: '#ECFDF5', fg: '#065F46' };
  if (/pending|progress|unpaid/.test(s)) return { bg: '#FEF3C7', fg: '#92400E' };
  if (/cancel|overdue|fail/.test(s)) return { bg: '#FEF2F2', fg: '#991B1B' };
  if (/refund/.test(s)) return { bg: '#EFF6FF', fg: '#1E40AF' };
  return { bg: '#F3F4F6', fg: '#374151' };
}

function _statusChip(status) {
  const raw = _text(status);
  if (!raw) return '';
  const t = _statusTone(raw);
  return `<span style="display:inline-block;padding:3px 12px;border-radius:999px;background:${t.bg};color:${t.fg};font-size:12px;font-weight:bold;">${escapeHtml(raw)}</span>`;
}

// ── SHARED RESPONSIVE LAYOUT (table-based for email-client compatibility) ──
// Values passed in bodyHtml are expected to be already escaped/credential-free.
function _layout({ preheader, heading, bodyHtml }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(BRAND.name)}</title>
<style>
  @media only screen and (max-width: 620px) {
    .pp-outer { padding: 12px 6px !important; }
    .pp-pad { padding: 22px 18px !important; }
    .pp-h1 { font-size: 19px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${BRAND.pageBg};font-family:Arial,Helvetica,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader || '')}</div>
<table role="presentation" class="pp-outer" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.pageBg};padding:28px 12px;">
  <tr>
    <td align="center" style="padding:0 12px;">
      <!-- max-width lives on the DIV wrapper: some engines ignore max-width on <table>, which would force horizontal scrolling on phones -->
      <div style="width:100%;max-width:600px;margin:0 auto;background:#ffffff;border:1px solid ${BRAND.border};border-radius:12px;overflow:hidden;text-align:left;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;">
        <tr>
          <td style="background:${BRAND.dark};padding:20px 28px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size:19px;font-weight:bold;color:#ffffff;letter-spacing:0.3px;">PhotoPro <span style="color:${BRAND.gold};">AI</span></td>
                <td align="right" style="color:${BRAND.goldLight};font-size:10px;letter-spacing:1.5px;text-transform:uppercase;">Management System</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr><td style="height:3px;background:${BRAND.gold};font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr>
          <td class="pp-pad" style="padding:28px 32px;color:${BRAND.text};font-size:14px;line-height:1.65;">
            <h1 class="pp-h1" style="margin:0 0 14px;font-size:22px;line-height:1.3;color:${BRAND.ink};">${escapeHtml(heading || BRAND.name)}</h1>
${bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="background:${BRAND.surface};border-top:1px solid ${BRAND.border};padding:18px 28px;text-align:center;">
            <div style="font-size:12px;color:${BRAND.muted};line-height:1.6;">Thank you,<br><strong style="color:${BRAND.ink};">${escapeHtml(BRAND.name)}</strong><br>${escapeHtml(BRAND.tagline)}</div>
            <div style="font-size:11px;color:${BRAND.faint};margin-top:8px;">&copy; ${BRAND.year} PhotoPro AI. All rights reserved.</div>
          </td>
        </tr>
      </table>
      </div>
    </td>
  </tr>
</table>
</body>
</html>`;
}

// ── DETAILS TABLE — renders only the rows that have a value ──
// Row values are expected pre-built (escaped text or _statusChip markup).
function _detailsSection(title, rows) {
  const visible = rows.filter((r) => r.value);
  if (!visible.length) return '';
  const body = visible.map((r, i) => `
          <tr>
            <td style="padding:10px 16px;font-size:13px;color:${BRAND.muted};white-space:nowrap;vertical-align:top;${i === visible.length - 1 ? '' : `border-bottom:1px solid #F3F4F6;`}">${escapeHtml(r.label)}</td>
            <td style="padding:10px 16px;font-size:13px;font-weight:bold;color:${BRAND.ink};${i === visible.length - 1 ? '' : `border-bottom:1px solid #F3F4F6;`}">${r.value}</td>
          </tr>`).join('');
  return `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 8px;border:1px solid ${BRAND.border};border-radius:10px;overflow:hidden;">
          <tr><td colspan="2" style="background:${BRAND.dark};color:${BRAND.goldLight};font-size:11px;font-weight:bold;letter-spacing:1.2px;text-transform:uppercase;padding:10px 16px;">${escapeHtml(title)}</td></tr>${body}
        </table>`;
}

function _detailsText(title, rows) {
  const visible = rows.filter((r) => r.value);
  if (!visible.length) return '';
  return `\n${title}\n${'-'.repeat(46)}\n${visible.map((r) => `${r.label}: ${r.value}`).join('\n')}\n`;
}

function _closingHtml() {
  return `<p style="margin:16px 0 0;">Please contact PhotoPro if you have any questions or need assistance.</p>`;
}

// ── BOOKING EMAIL — reusable for any booking purpose (confirmation, update,
// reminder, cancellation...). Callers shape the content via `subject`,
// `heading` and `message`; booking fields are optional and render only when
// provided. The Payment block appears only when payment data is supplied.
function buildBookingEmail({ customerName, subject, heading, message, booking }) {
  const b = booking || {};
  const name = _text(customerName) || 'Customer';
  const body = _text(message) || 'Here are the details of your booking with PhotoPro AI.';
  const timeRange = [formatTime(b.startTime), formatTime(b.endTime)].filter(Boolean).join(' – ');

  const htmlRows = [
    { label: 'Booking ID', value: escapeHtml(_text(b.id)) },
    { label: 'Service', value: escapeHtml(_text(b.service)) },
    { label: 'Date', value: escapeHtml(formatDate(b.date)) },
    { label: 'Time', value: escapeHtml(timeRange) },
    { label: 'Photographer/Staff', value: escapeHtml(_text(b.staff)) },
    { label: 'Status', value: _statusChip(b.status) },
  ];
  const paymentRows = [
    { label: 'Payment status', value: _statusChip(b.paymentStatus) },
    { label: 'Amount', value: escapeHtml(formatAmount(b.amount)) },
  ];

  const textRows = [
    { label: 'Booking ID', value: _text(b.id) },
    { label: 'Service', value: _text(b.service) },
    { label: 'Date', value: formatDate(b.date) },
    { label: 'Time', value: timeRange },
    { label: 'Photographer/Staff', value: _text(b.staff) },
    { label: 'Status', value: _text(b.status) },
  ];
  const textPayment = [
    { label: 'Payment status', value: _text(b.paymentStatus) },
    { label: 'Amount', value: formatAmount(b.amount) },
  ];

  const bodyHtml = `
          <p style="margin:0;">Hello <strong>${escapeHtml(name)}</strong>,</p>
          <p style="margin:8px 0 0;">${escapeHtml(body)}</p>
          ${_detailsSection('Booking Details', htmlRows)}
          ${_detailsSection('Payment', paymentRows)}
          ${_closingHtml()}`;

  const text = [
    `${BRAND.name}`,
    `${'='.repeat(30)}`,
    '',
    `Hello ${name},`,
    '',
    body,
    _detailsText('Booking Details', textRows),
    _detailsText('Payment', textPayment),
    `Please contact PhotoPro if you have any questions or need assistance.`,
    '',
    'Thank you,',
    BRAND.name,
    BRAND.tagline,
    '',
    `\u00A9 ${BRAND.year} PhotoPro AI. All rights reserved.`,
  ].join('\n');

  return {
    subject: _text(subject) || `PhotoPro AI — Booking Details for ${name}`,
    html: _layout({ preheader: body, heading: heading || 'Booking Update', bodyHtml }),
    text,
  };
}

// ── TEST EMAIL — branded replacement for the old generic test body. It still
// identifies itself clearly as a test (it must never pose as business mail)
// but now looks like a real PhotoPro email and reports dynamic send details.
function buildTestEmail({ recipientName, recipientEmail, fromEmail, sentAt }) {
  const name = _text(recipientName) || 'there';
  const at = sentAt instanceof Date ? sentAt : new Date();
  const when = `${formatDate(at)}, ${formatTime(at)}`;
  const body = 'A test email was sent from the PhotoPro AI Management System. If you are reading this message in your inbox, the SendGrid email integration is configured and working correctly.';

  const htmlRows = [
    { label: 'Sent at', value: escapeHtml(when) },
    { label: 'Recipient', value: escapeHtml(_text(recipientEmail)) },
    { label: 'From', value: escapeHtml(_text(fromEmail)) },
    { label: 'Delivery system', value: 'SendGrid Mail Send API' },
  ];

  const bodyHtml = `
          <p style="margin:0;">Hello <strong>${escapeHtml(name)}</strong>,</p>
          <p style="margin:8px 0 0;">${escapeHtml(body)}</p>
          ${_detailsSection('Send Details', htmlRows)}
          <p style="margin:14px 0 0;color:${BRAND.muted};font-size:12px;">You received this email because a test send was triggered from the PhotoPro AI Settings page. No action is required.</p>
          ${_closingHtml()}`;

  const text = [
    `${BRAND.name}`,
    `${'='.repeat(30)}`,
    '',
    `Hello ${name},`,
    '',
    body,
    _detailsText('Send Details', [
      { label: 'Sent at', value: when },
      { label: 'Recipient', value: _text(recipientEmail) },
      { label: 'From', value: _text(fromEmail) },
      { label: 'Delivery system', value: 'SendGrid Mail Send API' },
    ]),
    'You received this email because a test send was triggered from the PhotoPro AI Settings page. No action is required.',
    'Please contact PhotoPro if you have any questions or need assistance.',
    '',
    'Thank you,',
    BRAND.name,
    BRAND.tagline,
    '',
    `\u00A9 ${BRAND.year} PhotoPro AI. All rights reserved.`,
  ].join('\n');

  return {
    subject: 'PhotoPro AI — Email Integration Test',
    html: _layout({ preheader: 'PhotoPro AI email integration test — your SendGrid connection is working.', heading: 'Email Integration Test', bodyHtml }),
    text,
  };
}

module.exports = { escapeHtml, buildBookingEmail, buildTestEmail };
