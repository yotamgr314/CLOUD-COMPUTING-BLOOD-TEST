require("dotenv").config({ override: true });

const express = require("express");
const path = require("path");

const app = express();

// serve static files (optional, keep if you use public/index.html)
app.use(express.static(path.join(__dirname, "..", "public")));

// ✅ Use the router that contains: jwtAuth → ipAllowlist → multer → handler
const uploadRouter = require("./routes/upload");
app.use("/upload", uploadRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server on http://localhost:${PORT}`));
