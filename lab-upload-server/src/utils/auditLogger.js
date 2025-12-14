const fs = require("fs");
const path = require("path");

const LOG_DIR = path.join(__dirname, "..", "..", "logs");
const LOG_FILE = path.join(LOG_DIR, "audit.log");

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
}

function writeAudit(event) {
  try {
    ensureLogDir();
    const line = JSON.stringify(
      {
        time: new Date().toISOString(),
        ...event,
      },
      null,
      0
    );
    fs.appendFileSync(LOG_FILE, line + "\n", { encoding: "utf8" });
  } catch {
    // לא מפילים שרת בגלל לוג
  }
}

module.exports = { writeAudit };
