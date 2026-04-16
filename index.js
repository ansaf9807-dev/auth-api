const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());

// ✅ Serve static files ONLY (important fix)
app.use(express.static(path.join(__dirname, "public")));

console.log("SERVER START");

// ================= DATABASE =================
const MONGO_URI = process.env.MONGO_URI;

if (MONGO_URI) {
  mongoose.connect(MONGO_URI)
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.log(err));
} else {
  console.log("No MongoDB (test mode)");
}

// ================= SCHEMA =================
const KeySchema = new mongoose.Schema({
  key: String,
  active: { type: Boolean, default: true },
  expiry_date: String,
  device_limit: Number,
  device_ids: [String]
});

const Key = mongoose.model("Key", KeySchema);

// ================= LOGIN =================
app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body;

  if (username === "admin" && password === "1234") {
    return res.json({ success: true });
  }

  res.json({ success: false });
});

// ================= CREATE KEY =================
app.post("/api/admin/create-key", async (req, res) => {
  const { key, expiry_date, device_limit } = req.body;

  await Key.create({
    key,
    expiry_date,
    device_limit,
    device_ids: []
  });

  res.json({ success: true });
});

// ================= LIST KEYS =================
app.get("/api/admin/keys", async (req, res) => {
  const keys = await Key.find();
  res.json(keys);
});

// ================= VALIDATE =================
app.post("/api/keys/validate", async (req, res) => {
  const { key, device_id } = req.body;

  const doc = await Key.findOne({ key });

  if (!doc) return res.json({ valid: false, error: "Invalid key" });
  if (!doc.active) return res.json({ valid: false, error: "Inactive" });

  if (doc.device_ids.length >= doc.device_limit) {
    return res.json({ valid: false, error: "Device limit reached" });
  }

  if (device_id && !doc.device_ids.includes(device_id)) {
    doc.device_ids.push(device_id);
    await doc.save();
  }

  res.json({
    valid: true,
    exp_time: doc.expiry_date || "Lifetime"
  });
});

// ================= START =================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("RUNNING ON " + PORT));
