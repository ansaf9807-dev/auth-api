const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

console.log("BOOT START");

// ================= DATABASE =================
const MONGO_URI = process.env.MONGO_URI;

if (MONGO_URI) {
  mongoose.connect(MONGO_URI)
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.log("MongoDB Error:", err.message));
} else {
  console.log("⚠️ MONGO_URI not set (running without DB)");
}

// ================= SCHEMA =================
const KeySchema = new mongoose.Schema({
  key: String,
  active: { type: Boolean, default: true },
  expiry_date: String,
  device_limit: { type: Number, default: 1 },
  device_ids: { type: [String], default: [] }
});

const Key = mongoose.model("Key", KeySchema);

// ================= ROUTES =================

// Home -> login
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/login.html"));
});

// Dashboard
app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "public/dashboard.html"));
});

// ================= ADMIN LOGIN =================
app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body;

  if (username === "admin" && password === "1234") {
    return res.json({ success: true });
  }

  return res.json({ success: false, error: "Invalid login" });
});

// ================= CREATE KEY =================
app.post("/api/admin/create-key", async (req, res) => {
  try {
    const { key, expiry_date, device_limit } = req.body;

    const newKey = new Key({
      key,
      expiry_date,
      device_limit,
      device_ids: []
    });

    await newKey.save();

    res.json({ success: true });
  } catch (e) {
    res.json({ success: false });
  }
});

// ================= LIST KEYS =================
app.get("/api/admin/keys", async (req, res) => {
  const keys = await Key.find();
  res.json(keys);
});

// ================= VALIDATE KEY (C++ / APP) =================
app.post("/api/keys/validate", async (req, res) => {
  try {
    const { key, device_id } = req.body;

    if (!key) {
      return res.json({ valid: false, error: "Invalid key" });
    }

    const doc = await Key.findOne({ key });

    if (!doc) {
      return res.json({ valid: false, error: "Invalid key" });
    }

    if (!doc.active) {
      return res.json({ valid: false, error: "Key inactive" });
    }

    if (doc.expiry_date && new Date(doc.expiry_date) < new Date()) {
      return res.json({ valid: false, error: "Key expired" });
    }

    if (doc.device_ids.length >= doc.device_limit) {
      return res.json({ valid: false, error: "Device limit reached" });
    }

    if (device_id && !doc.device_ids.includes(device_id)) {
      doc.device_ids.push(device_id);
      await doc.save();
    }

    return res.json({
      valid: true,
      exp_time: doc.expiry_date || "Lifetime",
      label: "premium"
    });

  } catch (e) {
    return res.json({ valid: false, error: "Server error" });
  }
});

// ================= START =================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
