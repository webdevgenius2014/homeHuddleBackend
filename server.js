const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const morgan = require("morgan");
const session = require("express-session");
const {
  responseOnFailure,
  HTTP_STATUS,
} = require("./src/helpers/responseHelper");

// Load environment variables early
dotenv.config();

// Import services/modules
const connectToDatabase = require("./src/config/db");
const routes = require("./src/routes");

// Initialize express app
const app = express();

// Security middleware
app.use(helmet()); // Sets various HTTP headers for security

app.use(
  cors({
    origin: "*", // Allow specific origins (e.g., frontend domain)
    credentials: true, // Allow cookies and credentials
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"], // Ensure headers are set for the request
  })
);

// Request parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Logging middleware
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// Base route for API health check
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Home Huddle API is operational",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000,
    },
    cookie: { httpOnly: true, secure: process.env.NODE_ENV === "production" },
  })
);

app.use("/api/v1", routes);

// Global error handler
app.use((err, req, res, next) => {
  console.error("Global error:", err);

  const statusCode = err.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const message = err.message || "Something went wrong";

  return responseOnFailure(res, statusCode, message, {
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

// Server startup function
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectToDatabase();
    console.log("📦 Connected to MongoDB successfully");

    // Start server
    const PORT = process.env.PORT || 8080;
    app.listen(PORT, () => {
      console.log(
        `✅ Server running on port ${PORT} in ${
          process.env.NODE_ENV || "development"
        } mode`
      );
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`🚀 API available at: http://localhost:${PORT}/api/v1`);
    });
  } catch (error) {
    console.error("❌ Server initialization failed:", error.message);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION! Shutting down...");
  console.error(err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION! Shutting down...");
  console.error(err);
  process.exit(1);
});

// Start server
startServer();

// For testing purposes
module.exports = app;
