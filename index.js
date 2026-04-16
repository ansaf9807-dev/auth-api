const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// ================= DATABASE =================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

// ================= MODEL =================
const KeySchema = new mongoose.Schema({
  key: String,
  active: { type: Boolean, default: true },
  expiry_date: String,
  device_limit: Number,
  device_ids: [String]
});

const Key = mongoose.model("Key", KeySchema);

// ================= VALIDATE API =================
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

    // expiry check
    if (doc.expiry_date && new Date(doc.expiry_date) < new Date()) {
      return res.json({ valid: false, error: "Key expired" });
    }

    // device limit check
    if (doc.device_ids.length >= doc.device_limit) {
      return res.json({ valid: false, error: "Device limit reached" });
    }

    // bind device
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

// ================= START SERVER =================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
