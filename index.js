const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

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

// ================= RANDOM KEY =================
function generateKey(len = 8) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  for (let i = 0; i < len; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

// ================= CREATE KEY =================
app.post("/api/admin/create-key", async (req, res) => {
  try {
    let { key, expiry_date, device_limit } = req.body;

    if (!key) key = generateKey();
    device_limit = Number(device_limit) || 1;

    await Key.create({
      key,
      expiry_date,
      device_limit,
      device_ids: []
    });

    res.json({ success: true, key });
  } catch {
    res.json({ success: false });
  }
});

// ================= GET KEYS =================
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

// ================= VALIDATE (CRITICAL FIX) =================
app.post("/api/keys/validate", async (req, res) => {
  try {
    const { key, device_id } = req.body || {};

    if (!key) {
      return res.json({ valid: false, error: "Invalid key" });
    }

    const doc = await Key.findOne({ key });

    if (!doc) {
      return res.json({ valid: false, error: "Key not found" });
    }

    if (!doc.active) {
      return res.json({ valid: false, error: "Inactive key" });
    }

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

    // 🔥 IMPORTANT: EXACT FORMAT YOUR C++ NEEDS
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
