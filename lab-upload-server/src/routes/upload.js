const express = require("express");
const multer = require("multer");
const jwtAuth = require("../middleware/jwtAuth");
const ipAllowlist = require("../middleware/ipAllowlist");
const { validateFile } = require("../validation/fileValidation");

const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const s3 = new S3Client({ region: process.env.AWS_REGION });
console.log("UPLOAD ROUTE VERSION = S3_ROUTING");

function safeName(name = "file") {
  // מנקה תווים בעייתיים ל-key
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function isoForKey(d = new Date()) {
  // ":" בעייתי לפעמים בקריאה/כלים, אז מחליפים ל "-"
  return d.toISOString().replace(/:/g, "-");
}

async function putToS3({ bucket, key, body, contentType, metadata }) {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      Metadata: metadata, // keys+values must be strings
    })
  );
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

      const result = validateFile(req.file);

      const isValid = result.ok === true;
      const folder = isValid ? "valid" : "invalid";
      const bucket = isValid
        ? process.env.BUCKET_READY
        : process.env.BUCKET_INVALID;

      if (!bucket) {
        return res.status(500).json({
          status: "error",
          message:
            "Server misconfiguration: BUCKET_READY/BUCKET_INVALID missing",
        });
      }

      const original = safeName(req.file?.originalname || "unknown");
      const key = `lab/${labId}/user/${userId}/${folder}/${isoForKey()}-${original}`;

      // metadata values must be strings; keep small
      const metadata = {
        lab_id: String(labId),
        user_id: String(userId),
        validation: folder,
      };

      if (!isValid) {
        metadata.reason = String(result.reason || "invalid");
      }

      // אם אין בכלל קובץ, validateFile כבר מחזיר invalid, אבל פה צריך להגן
      if (!req.file) {
        return res.status(400).json({
          status: "invalid",
          labId,
          userId,
          reason: result.reason || "No file received",
        });
      }

      await putToS3({
        bucket,
        key,
        body: req.file.buffer,
        contentType: req.file.mimetype,
        metadata,
      });

      return res.status(isValid ? 200 : 400).json({
        status: isValid ? "stored" : "rejected",
        labId,
        userId,
        valid: isValid,
        bucket,
        key,
        reason: isValid ? null : result.reason,
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
