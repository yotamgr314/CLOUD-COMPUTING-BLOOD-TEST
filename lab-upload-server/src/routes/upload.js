const express = require("express");
const multer = require("multer");
const jwtAuth = require("../middleware/jwtAuth");
const ipAllowlist = require("../middleware/ipAllowlist");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
const { validateFile } = require("../validation/fileValidation");

/**
 * IMPORTANT ORDER:
 * jwtAuth must run BEFORE ipAllowlist
 * because ipAllowlist will validate the client's IP based on req.auth.lab_id + req.auth.user_id
 */
router.post("/", jwtAuth, ipAllowlist, upload.single("file"), (req, res) => {
  const result = validateFile(req.file);

  if (!result.ok) {
    return res.status(400).json({
      status: "invalid",
      labId: req.auth.lab_id,
      userId: req.auth.user_id,
      reason: result.reason,
    });
  }

  return res.status(200).json({
    status: "valid",
    labId: req.auth.lab_id,
    userId: req.auth.user_id,
    fileName: req.file.originalname,
    fileSize: req.file.size,
    mimeType: req.file.mimetype,
  });
});

module.exports = router;
