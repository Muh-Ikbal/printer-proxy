// src/app.js
// Express app setup — middleware, logging, dan mount semua routes

const express = require("express");
const cors = require("cors");
const path = require("path");

const { requestLoggerMiddleware } = require("./helpers/logger");
const dotmatrixRoutes = require("./routes/dotmatrix");
const posboxRoutes = require("./routes/posbox");
const receiptRoutes = require("./routes/receipt");
const printRoutes = require("./routes/print");
const statusRoutes = require("./routes/status");

const app = express();

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));
app.use(express.text({ type: ["text/xml", "application/xml", "text/plain"], limit: "20mb" }));

// Persistent request & response file logger
app.use(requestLoggerMiddleware());

// Static frontend web dashboard
app.use(express.static(path.join(__dirname, "../public")));

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.use("/dotmatrix", dotmatrixRoutes);
app.use("/hw_proxy", posboxRoutes);
app.use("/:printer/hw_proxy", posboxRoutes);
app.use("/print/receipt", receiptRoutes);
app.use("/print", printRoutes);
app.use("/", statusRoutes);

module.exports = app;
