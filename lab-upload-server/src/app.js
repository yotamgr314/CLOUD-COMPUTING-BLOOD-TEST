require("dotenv").config({ override: true });

const express = require("express");
const multer = require("multer");
const path = require("path");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

const s3 = new S3Client({ region: process.env.AWS_REGION });

const BUCKET_READY = process.env.BUCKET_READY;
const BUCKET_INVALID = process.env.BUCKET_INVALID;

app.use(express.static(path.join(__dirname, "..", "public")));

function validateFile(file) {
  if (!file) return { ok: false, reason: "No file" };
  if (file.size <= 0) return { ok: false, reason: "Empty file" };

  const allowed = ["text/plain", "application/json"];
  if (!allowed.includes(file.mimetype)) {
    return { ok: false, reason: `Unsupported mimetype: ${file.mimetype}` };
  }
  return { ok: true };
}

async function uploadToS3(bucket, key, buffer, contentType) {
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));
}

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;

    const v = validateFile(file);
    const targetBucket = v.ok ? BUCKET_READY : BUCKET_INVALID;

    const key = `${Date.now()}-${file?.originalname || "unknown"}`;

    if (!file) return res.status(400).json({ ok: false, error: v.reason });

    await uploadToS3(targetBucket, key, file.buffer, file.mimetype);

    console.log(`[UPLOAD] valid=${v.ok} bucket=${targetBucket} key=${key}`);

    ress.tatus(200).json({
      ok: true,
      valid: v.ok,
      bucket: targetBucket,
      key,
      reason: v.ok ? null : v.reason,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Server error" });
  }
});

app.listen(3000, () => console.log("Server on http://localhost:3000"));