import "dotenv/config";
import { runPipeline } from "../jobs/scheduler";

runPipeline()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
