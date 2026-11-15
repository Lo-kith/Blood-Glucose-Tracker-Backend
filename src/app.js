const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes/auth.routes");
const readingsRoutes = require("./routes/readingsRoutes/readings.routes");
const reportsRoutes = require("./routes/reportRoutes/reports.routes");
const authenticateUser = require("./middleware/auth.middleware");
const errorHandler = require("./middleware/errorHandler");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get("/api/health", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Sweety API is running",
  });
});

// Authentication routes
app.use("/api/auth", authRoutes);
app.use("/api/readings", authenticateUser, readingsRoutes);
app.use("/api/reports", authenticateUser, reportsRoutes);

app.use(errorHandler);   // must be last

module.exports = app;