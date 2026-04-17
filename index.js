const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());

// 🔥 IMPORTANT: serve your existing pages
app.use(express.static(path.join(__dirname, "public")));

// ================= ROOT FIX =================
// THIS FIXES "Cannot GET /"
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ================= DATABASE =================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(() => console.log("MongoDB Error"));

// ================= SCHEMA =================
const KeySchema = new mongoose.Schema({
  key: String,
  active: { type: Boolean, default: true },
  expiry_date: { type: String, default: null },
  device_limit: { type: Number, default: 1 },
  device_ids: { type: [String], default: [] }
});

const Key = mongoose.model("Key", KeySchema);

// ================= KEEP YOUR OLD ADMIN LOGIN =================
app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body;

  if (username === "admin" && password === "1234") {
    return res.json({ success: true });
  }

  res.json({ success: false });
});

// ================= CREATE =================
app.post("/api/admin/create-key", async (req, res) => {
  try {
    let { key, expiry_date, device_limit } = req.body;

    if (!key) {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      key = "";
      for (let i = 0; i < 8; i++) {
        key += chars[Math.floor(Math.random() * chars.length)];
      }
    }

    await Key.create({
      key,
      expiry_date,
      device_limit: Number(device_limit) || 1
    });

    res.json({ success: true, key });
  } catch {
    res.json({ success: false });
  }
});

// ================= GET =================
app.get("/api/admin/keys", async (req, res) => {
  const keys = await Key.find();
  res.json(keys);
});

// ================= DELETE =================
app.delete("/api/admin/delete-key/:id", async (req, res) => {
  await Key.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

// ================= EDIT =================
app.put("/api/admin/edit-key/:id", async (req, res) => {
  const { key, expiry_date, device_limit, active } = req.body;

  await Key.findByIdAndUpdate(req.params.id, {
    key,
    expiry_date,
    device_limit: Number(device_limit) || 1,
    active
  });

  res.json({ success: true });
});

// ================= 🔥 VALIDATION (DO NOT CHANGE FORMAT) =================
app.post("/api/keys/validate", async (req, res) => {
  try {
    const { key, device_id } = req.body || {};

    if (!key) {
      return res.json({ valid: false, error: "Invalid key" });
    }

    const doc = await Key.findOne({ key });

    if (!doc) return res.json({ valid: false, error: "Key not found" });
    if (!doc.active) return res.json({ valid: false, error: "Inactive key" });

    if (doc.expiry_date && new Date(doc.expiry_date) < new Date()) {
      return res.json({ valid: false, error: "Expired key" });
    }

    if (doc.device_ids.length >= doc.device_limit) {
      return res.json({ valid: false, error: "Device limit reached" });
    }

    if (device_id && !doc.device_ids.includes(device_id)) {
      doc.device_ids.push(device_id);
      await doc.save();
    }

    // ✅ EXACT FORMAT YOUR keylogin.h NEEDS
    return res.json({
      valid: true,
      exp_time: doc.expiry_date || "Lifetime"
    });

  } catch {
    return res.json({
      valid: false,
      error: "Server error"
    });
  }
});

// ================= START =================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running"));
