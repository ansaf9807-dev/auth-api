const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// ================= DATABASE =================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

// ================= SCHEMA =================
const KeySchema = new mongoose.Schema({
  key: String,
  device_ids: [String],
  device_limit: { type: Number, default: 1 },
  created_at: { type: Date, default: Date.now },
  expiry_date: Date,
  active: { type: Boolean, default: true }
});

const Key = mongoose.model("Key", KeySchema);

// ================= VALIDATE =================
app.post("/api/keys/validate", async (req, res) => {
  const { key, device_id } = req.body;

  const k = await Key.findOne({ key });

  if (!k) return res.json({ valid: false, error: "Invalid key" });
  if (!k.active) return res.json({ valid: false, error: "Key disabled" });

  // Expiry check
  if (k.expiry_date && new Date() > k.expiry_date) {
    return res.json({ valid: false, error: "Key expired" });
  }

  // Device limit
  if (!k.device_ids.includes(device_id)) {
    if (k.device_ids.length >= k.device_limit) {
      return res.json({ valid: false, error: "Device limit reached" });
    }
    k.device_ids.push(device_id);
    await k.save();
  }

  return res.json({
    valid: true,
    exp_time: k.expiry_date
      ? new Date(k.expiry_date).toISOString().split("T")[0]
      : "Lifetime"
  });
});

// ================= CREATE KEY =================
app.post("/api/admin/create", async (req, res) => {
  const { days, device_limit } = req.body;

  const newKey = Math.random().toString(36).substring(2, 10).toUpperCase();

  let expiry = null;
  if (days && days > 0) {
    expiry = new Date();
    expiry.setDate(expiry.getDate() + days);
  }

  await Key.create({
    key: newKey,
    device_limit: device_limit || 1,
    expiry_date: expiry
  });

  res.json({ key: newKey });
});

// ================= GET ALL KEYS =================
app.get("/api/admin/keys", async (req, res) => {
  const keys = await Key.find().sort({ created_at: -1 });
  res.json(keys);
});

// ================= DELETE KEY =================
app.delete("/api/admin/delete/:key", async (req, res) => {
  await Key.deleteOne({ key: req.params.key });
  res.json({ success: true });
});

// ================= TOGGLE ENABLE/DISABLE =================
app.post("/api/admin/toggle", async (req, res) => {
  const { key } = req.body;

  const k = await Key.findOne({ key });
  if (!k) return res.json({ error: "Not found" });

  k.active = !k.active;
  await k.save();

  res.json({ active: k.active });
});

// ================= HOME =================
app.get("/", (req, res) => {
  res.send("License API Running");
});

// ================= START =================
app.listen(process.env.PORT || 3000, () => {
  console.log("Server running");
});
