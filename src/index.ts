import AgentAPI from "apminsight";
AgentAPI.config()
import "dotenv/config";
import express from "express";
import subjectsRouter from "./routes/subjects";
import cors from "cors";
import security from "./middleware/security";
import securityMiddleware from "./middleware/security";
import {toNodeHandler} from "better-auth/node";
import {auth} from "./lib/auth";

const app = express();
const PORT = 8000;

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

app.all('/api/auth/*splat', toNodeHandler(auth));

app.use(express.json());
app.use(securityMiddleware);
  // @ts-ignore
app.use('/api/subjects',subjectsRouter );

app.get("/", (_req, res) => {
  res.status(200).send("Classroom backend is running.");
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
