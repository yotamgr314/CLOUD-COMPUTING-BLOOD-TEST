require("dotenv").config({ override: true });

const express = require("express");
const path = require("path");

const app = express();

app.use(express.json()); // ✅ needed for /auth/token

app.use(express.static(path.join(__dirname, "..", "public")));

const uploadRouter = require("./routes/upload");
app.use("/upload", uploadRouter);

// ✅ new auth route
const authRouter = require("./routes/auth");
app.use("/auth", authRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server on http://localhost:${PORT}`));
