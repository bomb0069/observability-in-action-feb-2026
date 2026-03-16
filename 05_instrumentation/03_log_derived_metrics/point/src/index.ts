import express, { Request, Response } from "express";
import mysql from "mysql2/promise";
import { trace, SpanStatusCode } from "@opentelemetry/api";

const app = express();
const port = process.env.PORT || 8001;
const tracer = trace.getTracer("point-service");

// Random number generator for error simulation
const errorSimulationRate = 5; // 1 in 5 requests will fail

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "3306"),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "root",
  database: process.env.DB_NAME || "point",
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Structured JSON log helper
function logEvent(data: Record<string, unknown>) {
  console.log(JSON.stringify(data));
}

// Middleware
app.use(express.json());

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "healthy", service: "point-service" });
});

// Get all points
app.get("/api/v1/points", async (req: Request, res: Response) => {
  const start = Date.now();
  const span = tracer.startSpan("getAllPoints");

  logEvent({ function: "getAllPoints", event: "start" });

  try {
    const [rows] = await pool.query(
      "SELECT * FROM points ORDER BY created_at DESC",
    );
    const durationMs = Date.now() - start;
    logEvent({
      function: "getAllPoints",
      event: "end",
      duration_ms: durationMs,
      count: Array.isArray(rows) ? rows.length : 0,
    });
    span.setAttribute("duration_ms", durationMs);
    res.json(rows);
  } catch (error: any) {
    const durationMs = Date.now() - start;
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    span.recordException(error);
    logEvent({
      function: "getAllPoints",
      event: "end",
      duration_ms: durationMs,
      level: "ERROR",
      error: error.message,
    });
    res
      .status(500)
      .json({ error: "Internal server error", message: error.message });
  } finally {
    span.end();
  }
});

// Get point by user ID
app.get(
  "/api/v1/points/user/:userId",
  async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId);
    const start = Date.now();
    const span = tracer.startSpan("getPointsByUserId");
    span.setAttribute("user.id", userId);

    logEvent({ function: "getPointsByUserId", event: "start", user_id: userId });

    try {
      if (isNaN(userId)) {
        console.warn(`Invalid user ID provided: ${req.params.userId}`);
        return res.status(400).json({ error: "Invalid user ID" });
      }

      const [rows]: any = await pool.query(
        "SELECT * FROM points WHERE user_id = ? ORDER BY created_at DESC",
        [userId],
      );

      if (rows.length === 0) {
        console.warn(`Points not found for user: ${userId}`);
        return res.status(404).json({ error: "Points not found for user" });
      }

      const durationMs = Date.now() - start;
      logEvent({
        function: "getPointsByUserId",
        event: "end",
        duration_ms: durationMs,
        user_id: userId,
      });
      span.setAttribute("duration_ms", durationMs);
      res.json(rows[0]);
    } catch (error: any) {
      const durationMs = Date.now() - start;
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      span.recordException(error);
      logEvent({
        function: "getPointsByUserId",
        event: "end",
        duration_ms: durationMs,
        level: "ERROR",
        error: error.message,
      });
      res
        .status(500)
        .json({ error: "Internal server error", message: error.message });
    } finally {
      span.end();
    }
  },
);

// Get total points for a user
app.get(
  "/api/v1/points/user/:userId/total",
  async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId);
    const start = Date.now();
    const span = tracer.startSpan("getTotalPoints");
    span.setAttribute("user.id", userId);

    logEvent({ function: "getTotalPoints", event: "start", user_id: userId });

    // Simulate request error (1 in 5 requests)
    if (Math.floor(Math.random() * errorSimulationRate) === 0) {
      const durationMs = Date.now() - start;
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: "Simulated error",
      });
      logEvent({
        function: "getTotalPoints",
        event: "end",
        duration_ms: durationMs,
        level: "ERROR",
        error: `Simulated error: Failed to fetch points for user ${userId}`,
      });
      span.end();
      return res
        .status(500)
        .json({ error: "Failed to fetch points for user" });
    }

    try {
      if (isNaN(userId)) {
        console.warn(`Invalid user ID provided: ${req.params.userId}`);
        return res.status(400).json({ error: "Invalid user ID" });
      }

      const [rows]: any = await pool.query(
        "SELECT SUM(points) as total_points, COUNT(*) as transaction_count FROM points WHERE user_id = ?",
        [userId],
      );

      if (rows.length === 0 || rows[0].total_points === null) {
        console.warn(`No points found for user: ${userId}`);
        return res.status(404).json({
          userId,
          totalPoints: 0,
          transactionCount: 0,
        });
      }

      const durationMs = Date.now() - start;
      logEvent({
        function: "getTotalPoints",
        event: "end",
        duration_ms: durationMs,
        user_id: userId,
        total_points: rows[0].total_points || 0,
      });
      span.setAttribute("duration_ms", durationMs);

      res.json({
        userId,
        totalPoints: rows[0].total_points || 0,
        transactionCount: rows[0].transaction_count || 0,
      });
    } catch (error: any) {
      const durationMs = Date.now() - start;
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      span.recordException(error);
      logEvent({
        function: "getTotalPoints",
        event: "end",
        duration_ms: durationMs,
        level: "ERROR",
        error: error.message,
      });
      res
        .status(500)
        .json({ error: "Internal server error", message: error.message });
    } finally {
      span.end();
    }
  },
);

// Add points for a user
app.post("/api/v1/points", async (req: Request, res: Response) => {
  const start = Date.now();
  const span = tracer.startSpan("addPoints");

  logEvent({ function: "addPoints", event: "start" });

  try {
    const { userId, points, description } = req.body;

    if (!userId || points === undefined) {
      console.warn("Missing required fields: userId or points");
      return res.status(400).json({ error: "userId and points are required" });
    }

    span.setAttribute("user.id", userId);

    const [result]: any = await pool.query(
      "INSERT INTO points (user_id, points, description) VALUES (?, ?, ?)",
      [userId, points, description || "Points added"],
    );

    const durationMs = Date.now() - start;
    logEvent({
      function: "addPoints",
      event: "end",
      duration_ms: durationMs,
      user_id: userId,
      points: points,
    });
    span.setAttribute("duration_ms", durationMs);

    res.status(201).json({
      id: result.insertId,
      userId,
      points,
      description: description || "Points added",
    });
  } catch (error: any) {
    const durationMs = Date.now() - start;
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    span.recordException(error);
    logEvent({
      function: "addPoints",
      event: "end",
      duration_ms: durationMs,
      level: "ERROR",
      error: error.message,
    });
    res
      .status(500)
      .json({ error: "Internal server error", message: error.message });
  } finally {
    span.end();
  }
});

// Start server
app.listen(port, () => {
  console.log(`Point service listening on port ${port}`);
  console.log(
    `Database: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`,
  );
  console.log("Logging enabled with OpenTelemetry integration");
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server");
  pool.end();
  process.exit(0);
});
