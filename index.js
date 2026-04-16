const express = require("express");
const mongoose = require("mongoose");

const app = express();
app.use(express.json());

// Connect MongoDB
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB connected"))
.catch(err => console.log(err));

// Schema
const Key = mongoose.model("Key", {
  key: String,
  device_id: String,
  exp_time: String,
  active: { type: Boolean, default: true }
});

// Validate API (IMPORTANT)
app.post("/api/keys/validate", async (req, res) => {
  const { key, device_id } = req.body;

  const found = await Key.findOne({ key });

  if (!found) {
    return res.json({ valid: false, error: "Invalid key" });
  }

  if (!found.active) {
    return res.json({ valid: false, error: "Key disabled" });
  }

  if (!found.device_id) {
    found.device_id = device_id;
    await found.save();
  } else if (found.device_id !== device_id) {
    return res.json({ valid: false, error: "Device mismatch" });
  }

  return res.json({
    valid: true,
    exp_time: found.exp_time || "Lifetime"
  });
});

// Create key (for testing)
app.get("/create-key", async (req, res) => {
  const newKey = Math.random().toString(36).substring(2, 10).toUpperCase();

  await Key.create({
    key: newKey,
    exp_time: "Lifetime"
  });

  res.send("Key: " + newKey);
});

app.listen(process.env.PORT || 3000);
