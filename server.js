const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const authRoutes = require("./routes/auth");
const taskRoutes = require("./routes/tasks");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "AI Task Manager API is running" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});