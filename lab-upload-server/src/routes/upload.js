const express = require("express");
const multer = require("multer");
const jwtAuth = require("../middleware/jwtAuth");
const ipAllowlist = require("../middleware/ipAllowlist");
const { validateFile } = require("../validation/fileValidation");

const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const s3 = new S3Client({ region: process.env.AWS_REGION });

function safeName(name = "file") {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function isoForKey(d = new Date()) {
  return d.toISOString().replace(/:/g, "-");
}

function getClientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  if (xff && typeof xff === "string") return xff.split(",")[0].trim();
  return req.ip;
}

async function putToS3({ bucket, key, body, contentType, metadata }) {
  return s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      Metadata: metadata,
    })
  );
}

async function writeAlertToS3({
  bucketInvalid,
  labId,
  userId,
  clientIp,
  file,
  reason,
  invalidObjectKey,
}) {
  if (!bucketInvalid) return;

  const alert = {
    type: "invalid_file",
    time: new Date().toISOString(),
    labId,
    userId,
    clientIp,
    fileName: file?.originalname || null,
    fileSize: file?.size ?? null,
    mimeType: file?.mimetype || null,
    reason: reason || "invalid",
    invalidObjectKey: invalidObjectKey || null,
  };

  const alertKey = `alerts/${isoForKey()}-lab${labId}-user${userId}.json`;

  await putToS3({
    bucket: bucketInvalid,
    key: alertKey,
    body: Buffer.from(JSON.stringify(alert, null, 2), "utf8"),
    contentType: "application/json",
    metadata: {
      type: "invalid_file",
      lab_id: String(labId),
      user_id: String(userId),
    },
  });

  return alertKey;
}

router.post(
  "/",
  jwtAuth,
  ipAllowlist,
  upload.single("file"),
  async (req, res) => {
    try {
      const labId = req.auth.lab_id;
      const userId = req.auth.user_id;
      const clientIp = getClientIp(req);

      const result = validateFile(req.file);
      const isValid = result.ok === true;

      const folder = isValid ? "valid" : "invalid";
      const bucket = isValid
        ? process.env.BUCKET_READY
        : process.env.BUCKET_INVALID;

      if (!process.env.BUCKET_READY || !process.env.BUCKET_INVALID) {
        return res.status(500).json({
          status: "error",
          message:
            "Server misconfiguration: BUCKET_READY/BUCKET_INVALID missing",
        });
      }

      if (!req.file) {
        // אין טעם לכתוב ל-S3 אם אין בכלל קובץ
        // (אפשר גם להחליט שכן כ-alert בלבד, אבל נשאיר פשוט)
        return res.status(400).json({
          status: "invalid",
          labId,
          userId,
          reason: result.reason || "No file received",
        });
      }

      const original = safeName(req.file.originalname);
      const objectKey = `lab/${labId}/user/${userId}/${folder}/${isoForKey()}-${original}`;

      const metadata = {
        lab_id: String(labId),
        user_id: String(userId),
        validation: folder,
      };
      if (!isValid) metadata.reason = String(result.reason || "invalid");

      const putRes = await putToS3({
        bucket,
        key: objectKey,
        body: req.file.buffer,
        contentType: req.file.mimetype,
        metadata,
      });

      // ✅ Security Notification (רק על invalid)
      let alertKey = null;
      if (!isValid) {
        alertKey = await writeAlertToS3({
          bucketInvalid: process.env.BUCKET_INVALID,
          labId,
          userId,
          clientIp,
          file: req.file,
          reason: result.reason,
          invalidObjectKey: objectKey,
        });
      }

      return res.status(isValid ? 200 : 400).json({
        status: isValid ? "stored" : "rejected",
        labId,
        userId,
        valid: isValid,
        bucket,
        key: objectKey,
        reason: isValid ? null : result.reason,
        etag: putRes?.ETag || null,
        alertKey, // null אם valid
      });
    } catch (e) {
      return res.status(500).json({
        status: "error",
        message: e?.message || "Server error",
      });
    }
  }
);

module.exports = router;
