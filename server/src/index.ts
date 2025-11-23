import "dotenv/config";
import express from "express";
import cors from "cors";
import roomsRouter from "./routes/rooms";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/rooms", roomsRouter);

app.listen(PORT, () => {
  console.log(`NAMELESS App Server running on http://localhost:${PORT}`);
});
