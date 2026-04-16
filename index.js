const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const rateLimit = require("express-rate-limit");

const app = express();
app.use(express.json());

// Rate limiter
app.use("/api/", rateLimit({
  windowMs: 60 * 1000,
  max: 30
}));

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

// Schema
const KeySchema = new mongoose.Schema({
  key_hash: String,
  expires_at: Date,
  device_id: String,
  active: { type: Boolean, default: true }
});

const Key = mongoose.model("Key", KeySchema);

// Validate API
app.post("/api/validate", async (req, res) => {
  const { key, device_id } = req.body;

  const keys = await Key.find({ active: true });

  for (let k of keys) {
    if (await bcrypt.compare(key, k.key_hash)) {

      if (k.expires_at && k.expires_at < new Date())
        return res.json({ status: "expired" });

      if (k.device_id && k.device_id !== device_id)
        return res.json({ status: "device_mismatch" });

      if (!k.device_id)
        k.device_id = device_id;

      await k.save();

      return res.json({ status: "valid" });
    }
  }

  res.json({ status: "invalid" });
});

// Simple route
app.get("/", (req, res) => {
  res.send("Auth API Running");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port " + PORT));
