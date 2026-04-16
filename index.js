const express = require("express");
const mongoose = require("mongoose");

const app = express();
app.use(express.json());

// Connect DB
mongoose.connect(process.env.MONGO_URI);

// Schema
const KeySchema = new mongoose.Schema({
  key: String,
  device_ids: [String],
  device_limit: { type: Number, default: 1 },
  exp_time: String,
  active: { type: Boolean, default: true }
});

const Key = mongoose.model("Key", KeySchema);

// ================= VALIDATE =================
app.post("/api/keys/validate", async (req, res) => {
  const { key, device_id } = req.body;

  const k = await Key.findOne({ key });

  if (!k) return res.json({ valid: false, error: "Invalid key" });
  if (!k.active) return res.json({ valid: false, error: "Key disabled" });

  // Device logic
  if (!k.device_ids.includes(device_id)) {
    if (k.device_ids.length >= k.device_limit) {
      return res.json({ valid: false, error: "Device limit reached" });
    }
    k.device_ids.push(device_id);
    await k.save();
  }

  return res.json({
    valid: true,
    exp_time: k.exp_time || "Lifetime"
  });
});

// ================= CREATE =================
app.post("/api/admin/create", async (req, res) => {
  const { expiry, device_limit } = req.body;

  const newKey = Math.random().toString(36).substring(2, 10).toUpperCase();

  await Key.create({
    key: newKey,
    exp_time: expiry || "Lifetime",
    device_limit: device_limit || 1
  });

  res.json({ key: newKey });
});

// ================= GET ALL =================
app.get("/api/admin/keys", async (req, res) => {
  const keys = await Key.find();
  res.json(keys);
});

// ================= DELETE =================
app.delete("/api/admin/delete/:key", async (req, res) => {
  await Key.deleteOne({ key: req.params.key });
  res.json({ success: true });
});

// ================= DISABLE =================
app.post("/api/admin/toggle", async (req, res) => {
  const { key } = req.body;
  const k = await Key.findOne({ key });
  k.active = !k.active;
  await k.save();
  res.json({ active: k.active });
});

app.listen(process.env.PORT || 3000);
