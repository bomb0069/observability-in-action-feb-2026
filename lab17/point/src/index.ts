import express, { Request, Response } from "express";
import mysql from "mysql2/promise";

const app = express();
const port = process.env.PORT || 8001;

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

// Middleware
app.use(express.json());

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "healthy", service: "point-service" });
});

// Get all points
app.get("/api/v1/points", async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM points ORDER BY created_at DESC",
    );
    res.json(rows);
  } catch (error: any) {
    console.error("Error fetching points:", error);
    res
      .status(500)
      .json({ error: "Internal server error", message: error.message });
  }
});

// Get point by user ID
app.get("/api/v1/points/user/:userId", async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);

    if (isNaN(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const [rows]: any = await pool.query(
      "SELECT * FROM points WHERE user_id = ? ORDER BY created_at DESC",
      [userId],
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Points not found for user" });
    }

    res.json(rows[0]);
  } catch (error: any) {
    console.error("Error fetching user points:", error);
    res
      .status(500)
      .json({ error: "Internal server error", message: error.message });
  }
});

// Get total points for a user
app.get(
  "/api/v1/points/user/:userId/total",
  async (req: Request, res: Response) => {
    // Simulate request error (1 in 5 requests)
    if (Math.floor(Math.random() * errorSimulationRate) === 0) {
      console.error("Simulated error: Failed to fetch points");
      return res.status(500).json({ error: "Failed to fetch points for user" });
    }

    try {
      const userId = parseInt(req.params.userId);

      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      const [rows]: any = await pool.query(
        "SELECT SUM(points) as total_points, COUNT(*) as transaction_count FROM points WHERE user_id = ?",
        [userId],
      );

      if (rows.length === 0 || rows[0].total_points === null) {
        return res.status(404).json({
          userId,
          totalPoints: 0,
          transactionCount: 0,
        });
      }

      res.json({
        userId,
        totalPoints: rows[0].total_points || 0,
        transactionCount: rows[0].transaction_count || 0,
      });
    } catch (error: any) {
      console.error("Error calculating total points:", error);
      res
        .status(500)
        .json({ error: "Internal server error", message: error.message });
    }
  },
);

// Add points for a user
app.post("/api/v1/points", async (req: Request, res: Response) => {
  try {
    const { userId, points, description } = req.body;

    if (!userId || points === undefined) {
      return res.status(400).json({ error: "userId and points are required" });
    }

    const [result]: any = await pool.query(
      "INSERT INTO points (user_id, points, description) VALUES (?, ?, ?)",
      [userId, points, description || "Points added"],
    );

    res.status(201).json({
      id: result.insertId,
      userId,
      points,
      description: description || "Points added",
    });
  } catch (error: any) {
    console.error("Error adding points:", error);
    res
      .status(500)
      .json({ error: "Internal server error", message: error.message });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Point service listening on port ${port}`);
  console.log(
    `Database: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`,
  );
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server");
  pool.end();
  process.exit(0);
});
