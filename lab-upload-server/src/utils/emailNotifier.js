const nodemailer = require("nodemailer");

function getRequiredEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

let cachedTransport = null;

function getTransport() {
  if (cachedTransport) return cachedTransport;

  const host = getRequiredEnv("SMTP_HOST");
  const port = Number(getRequiredEnv("SMTP_PORT"));
  const user = getRequiredEnv("SMTP_USER");
  const pass = getRequiredEnv("SMTP_PASS");

  cachedTransport = nodemailer.createTransport({
    host,
    port,
    secure: false, // 587 STARTTLS
    auth: { user, pass },
  });

  return cachedTransport;
}

async function sendSecurityAlertEmail({
  labId,
  userId,
  clientIp,
  fileName,
  fileSize,
  mimeType,
  reason,
  bucket,
  key,
  alertKey,
  etag,
}) {
  const to = getRequiredEnv("SECURITY_EMAIL_TO");
  const from = getRequiredEnv("SECURITY_EMAIL_FROM");

  const subject = `[SECURITY ALERT] Invalid upload lab=${labId} user=${userId}`;

  const text =
    `Invalid file upload detected\n\n` +
    `time: ${new Date().toISOString()}\n` +
    `labId: ${labId}\n` +
    `userId: ${userId}\n` +
    `clientIp: ${clientIp}\n` +
    `fileName: ${fileName}\n` +
    `fileSize: ${fileSize}\n` +
    `mimeType: ${mimeType}\n` +
    `reason: ${reason}\n\n` +
    `S3 invalid object:\n` +
    `bucket: ${bucket}\n` +
    `key: ${key}\n` +
    `etag: ${etag}\n\n` +
    `alert object:\n` +
    `bucket: ${process.env.BUCKET_INVALID}\n` +
    `alertKey: ${alertKey}\n`;

  const transport = getTransport();
  await transport.sendMail({ from, to, subject, text });

  return true;
}

module.exports = { sendSecurityAlertEmail };
