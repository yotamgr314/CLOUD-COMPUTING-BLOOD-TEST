function getAllowedMimes() {
  return (process.env.ALLOWED_MIME_TYPES || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function validateJson(buffer) {
  try {
    const obj = JSON.parse(buffer.toString("utf8"));
    if (typeof obj !== "object" || obj === null) {
      return { ok: false, reason: "JSON root must be an object" };
    }
    if (!obj.reportId) {
      return { ok: false, reason: "Missing required field: reportId" };
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: "Invalid JSON format" };
  }
}

function validateCsv(buffer) {
  const text = buffer.toString("utf8");
  const firstLine = text.split(/\r?\n/)[0] || "";
  const headers = firstLine.split(",").map((h) => h.trim());

  if (!headers.includes("reportId")) {
    return { ok: false, reason: "CSV must include reportId column" };
  }
  return { ok: true };
}

function validateFile(file) {
  if (!file) return { ok: false, reason: "No file received" };

  const maxSize = Number(process.env.MAX_FILE_SIZE_BYTES);
  if (!maxSize || Number.isNaN(maxSize)) {
    return {
      ok: false,
      reason: "Server misconfiguration: MAX_FILE_SIZE_BYTES",
    };
  }

  if (file.size > maxSize) {
    return {
      ok: false,
      reason: `File too large (${file.size} > ${maxSize})`,
    };
  }

  const allowedMimes = getAllowedMimes();
  if (!allowedMimes.includes(file.mimetype)) {
    return {
      ok: false,
      reason: `Unsupported MIME type: ${file.mimetype}`,
    };
  }

  if (file.mimetype === "application/json") {
    return validateJson(file.buffer);
  }

  if (file.mimetype === "text/csv") {
    return validateCsv(file.buffer);
  }

  // text/plain – אין מבנה חובה
  return { ok: true };
}

module.exports = { validateFile };
