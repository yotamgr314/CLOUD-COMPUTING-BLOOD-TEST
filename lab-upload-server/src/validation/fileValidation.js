function getAllowedMimes() {
  return (process.env.ALLOWED_MIME_TYPES || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function isValidTimestamp(v) {
  // accepts ISO string or number (epoch ms)
  if (typeof v === "number") return Number.isFinite(v) && v > 0;
  if (typeof v !== "string") return false;
  const t = Date.parse(v);
  return Number.isFinite(t);
}

function validateJsonSchema(obj) {
  // 3–5 שדות חובה “אמיתיים” + מבנה בדיקות
  // חובה: reportId, patientId, timestamp, tests[]
  if (!obj || typeof obj !== "object") {
    return { ok: false, reason: "JSON root must be an object" };
  }

  if (!isNonEmptyString(obj.reportId)) {
    return { ok: false, reason: "Missing/invalid required field: reportId" };
  }

  // patientId יכול להיות string או number
  const patientIdOk =
    isNonEmptyString(obj.patientId) ||
    (typeof obj.patientId === "number" && Number.isFinite(obj.patientId));
  if (!patientIdOk) {
    return { ok: false, reason: "Missing/invalid required field: patientId" };
  }

  if (!isValidTimestamp(obj.timestamp)) {
    return { ok: false, reason: "Missing/invalid required field: timestamp" };
  }

  if (!Array.isArray(obj.tests) || obj.tests.length === 0) {
    return {
      ok: false,
      reason: "Missing/invalid required field: tests (non-empty array)",
    };
  }

  // בדיקת מבנה לכל בדיקה (test item)
  // חובה לכל test: testCode, value, unit
  for (let i = 0; i < obj.tests.length; i++) {
    const t = obj.tests[i];

    if (!t || typeof t !== "object") {
      return { ok: false, reason: `tests[${i}] must be an object` };
    }

    if (!isNonEmptyString(t.testCode)) {
      return { ok: false, reason: `tests[${i}] missing/invalid: testCode` };
    }

    // value יכול להיות מספר או string מספרי
    const valueOk =
      (typeof t.value === "number" && Number.isFinite(t.value)) ||
      (typeof t.value === "string" && t.value.trim().length > 0);
    if (!valueOk) {
      return { ok: false, reason: `tests[${i}] missing/invalid: value` };
    }

    if (!isNonEmptyString(t.unit)) {
      return { ok: false, reason: `tests[${i}] missing/invalid: unit` };
    }

    // אופציונלי: refRange כטקסט, flag כטקסט, name כטקסט
    if (t.refRange !== undefined && typeof t.refRange !== "string") {
      return {
        ok: false,
        reason: `tests[${i}] invalid: refRange must be string`,
      };
    }
    if (t.flag !== undefined && typeof t.flag !== "string") {
      return { ok: false, reason: `tests[${i}] invalid: flag must be string` };
    }
    if (t.name !== undefined && typeof t.name !== "string") {
      return { ok: false, reason: `tests[${i}] invalid: name must be string` };
    }
  }

  return { ok: true };
}

function validateJson(buffer) {
  try {
    const obj = JSON.parse(buffer.toString("utf8"));
    return validateJsonSchema(obj);
  } catch {
    return { ok: false, reason: "Invalid JSON format" };
  }
}

// CSV: נניח פורמט “שורה לכל בדיקה”, עם שדות חובה:
const CSV_REQUIRED_HEADERS = [
  "reportId",
  "patientId",
  "timestamp",
  "testCode",
  "value",
  "unit",
];

function parseCsvLine(line) {
  // parser בסיסי: מפריד בפסיקים בלי תמיכה מלאה ב-quotes
  // (מספיק לקורס; אם תרצו נביא parser חיצוני בהמשך)
  return line.split(",").map((s) => s.trim());
}

function validateCsv(buffer) {
  const text = buffer.toString("utf8");
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);

  if (lines.length < 2) {
    return {
      ok: false,
      reason: "CSV must include header + at least 1 data row",
    };
  }

  const header = parseCsvLine(lines[0]);
  const headerSet = new Set(header);

  for (const h of CSV_REQUIRED_HEADERS) {
    if (!headerSet.has(h)) {
      return { ok: false, reason: `CSV missing required column: ${h}` };
    }
  }

  // בדיקה בסיסית לשורה הראשונה (מספיק לשלב הזה)
  const firstRow = parseCsvLine(lines[1]);
  const idx = (name) => header.indexOf(name);

  const reportId = firstRow[idx("reportId")];
  const patientId = firstRow[idx("patientId")];
  const timestamp = firstRow[idx("timestamp")];
  const testCode = firstRow[idx("testCode")];
  const value = firstRow[idx("value")];
  const unit = firstRow[idx("unit")];

  if (!isNonEmptyString(reportId))
    return { ok: false, reason: "CSV invalid: reportId empty" };
  if (!isNonEmptyString(patientId))
    return { ok: false, reason: "CSV invalid: patientId empty" };
  if (!isValidTimestamp(timestamp))
    return { ok: false, reason: "CSV invalid: timestamp invalid" };
  if (!isNonEmptyString(testCode))
    return { ok: false, reason: "CSV invalid: testCode empty" };
  if (!isNonEmptyString(value))
    return { ok: false, reason: "CSV invalid: value empty" };
  if (!isNonEmptyString(unit))
    return { ok: false, reason: "CSV invalid: unit empty" };

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
    return { ok: false, reason: `File too large (${file.size} > ${maxSize})` };
  }

  const allowedMimes = getAllowedMimes();
  if (!allowedMimes.includes(file.mimetype)) {
    return { ok: false, reason: `Unsupported MIME type: ${file.mimetype}` };
  }

  if (file.mimetype === "application/json") return validateJson(file.buffer);
  if (file.mimetype === "text/csv") return validateCsv(file.buffer);

  return { ok: false, reason: "Unsupported MIME type" };
}

module.exports = { validateFile };
