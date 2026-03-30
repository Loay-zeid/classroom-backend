import "apminsight";
import "dotenv/config";
import express from "express";
import subjectsRouter from "./routes/subjects.js";
import usersRouter from "./routes/users.js";
import classesRouter from "./routes/classes.js";
import cors, { type CorsOptions } from "cors";
import securityMiddleware from "./middleware/security.js";
import {toNodeHandler} from "better-auth/node";
import {auth} from "./lib/auth.js";


const app = express();
const PORT = Number(process.env.PORT) || 8000;

const rawOrigins =
  process.env.FRONTEND_URLS ?? process.env.FRONTEND_URL ?? "";
const allowedOrigins = rawOrigins
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS not allowed for origin: ${origin}`));
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
};

app.use(cors(corsOptions));
app.options("/*", cors(corsOptions));

app.all('/api/auth/*splat', toNodeHandler(auth));

app.use(express.json());
app.use(securityMiddleware);
  // @ts-ignore
app.use('/api/subjects',subjectsRouter );
app.use('/api/users', usersRouter);
app.use('/api/classes',classesRouter)

app.get("/", (_req, res) => {
  res.status(200).send("Classroom backend is running.");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running at http://0.0.0.0:${PORT}`);
});
