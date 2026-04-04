import "apminsight";
import "dotenv/config";
import express from "express";
import subjectsRouter from "./routes/subjects.js";
import usersRouter from "./routes/users.js";
import classesRouter from "./routes/classes.js";
import departmentsRouter from "./routes/departments.js";
import enrollmentsRouter from "./routes/enrollments.js";
import cors, { type CorsOptions } from "cors";
import securityMiddleware from "./middleware/security.js";
import {toNodeHandler} from "better-auth/node";
import {auth} from "./lib/auth.js";


const app = express();
const PORT = Number(process.env.PORT) || 8080;

const allowedOriginPatterns = [
  /\.vercel\.app$/,
  /^https:\/\/classroom-frontend/,
  /^http:\/\/localhost:\d+$/,
];

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOriginPatterns.some((pattern) => pattern.test(origin))) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS not allowed for origin: ${origin}`));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(
  cors(corsOptions)
);

app.all('/api/auth/*splat', toNodeHandler(auth));

app.use(express.json());
app.use(securityMiddleware);
  // @ts-ignore
app.use('/api/subjects',subjectsRouter );
app.use('/api/users', usersRouter);
app.use('/api/classes',classesRouter)
app.use('/api/departments', departmentsRouter)
app.use('/api/enrollments', enrollmentsRouter)

app.get("/", (_req, res) => {
  res.status(200).send("Classroom backend is running.");
});

console.log("ENV PORT:", process.env.PORT);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
