import fs from "fs";
import admin from "firebase-admin";
import { env } from "./env";

let app: admin.app.App | null = null;

export function getFirebaseApp(): admin.app.App | null {
  if (app) return app;
  if (!env.ENABLE_NOTIFICATIONS) return null;

  let credential: admin.credential.Credential;
  if (env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    credential = admin.credential.cert(JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON));
  } else if (env.FIREBASE_SERVICE_ACCOUNT_PATH && fs.existsSync(env.FIREBASE_SERVICE_ACCOUNT_PATH)) {
    const json = JSON.parse(fs.readFileSync(env.FIREBASE_SERVICE_ACCOUNT_PATH, "utf8"));
    credential = admin.credential.cert(json);
  } else {
    console.warn("[firebase] notifications enabled but no service account configured");
    return null;
  }

  app = admin.initializeApp({ credential });
  return app;
}
