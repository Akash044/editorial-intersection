import "dotenv/config";
import express from "express";
import cors from "cors";
import articlesRouter from "./routes/articles";
import vocabularyRouter from "./routes/vocabulary";
import healthRouter from "./routes/health";
import syncRouter from "./routes/sync";
import { startScheduler } from "./jobs/scheduler";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/health", healthRouter);
app.use("/api/articles", articlesRouter);
app.use("/api/vocabulary", vocabularyRouter);
app.use("/api/sync", syncRouter);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[unhandled]", err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  console.log(`[server] listening on :${PORT}`);
  startScheduler();
});
