import { getFirebaseApp } from "../config/firebase";
import { env } from "../config/env";
import { IVocabItem } from "../types/pipeline";
import { getMessaging } from "firebase-admin/messaging";

export async function sendDailyNotification(vocab: IVocabItem[]): Promise<void> {
  if (!env.ENABLE_NOTIFICATIONS) {
    console.log("[notifier] notifications disabled — skipping");
    return;
  }
  const app = getFirebaseApp();
  if (!app) {
    console.warn("[notifier] no firebase app — skipping");
    return;
  }
  const advanced = vocab.filter((v) => v.difficulty === "advanced");
  const sample = (advanced.length ? advanced : vocab).slice(0, 3).map((v) => v.word);
  if (sample.length === 0) {
    console.log("[notifier] no vocab to feature — skipping");
    return;
  }

  await getMessaging(app).send({
    topic: "daily_news",
    notification: {
      title: "Today's Editorial is Ready",
      body: `New words: ${sample.join(", ")}`,
    },
    data: {
      screen: "home",
      date: new Date().toISOString().split("T")[0],
    },
  });
  console.log(`[notifier] sent push (words: ${sample.join(", ")})`);
}
