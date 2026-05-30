import { env, json, normalizeEvent, saveEvent } from "./_shared/analytics-store.mjs";
import { sendMessage } from "./_shared/telegram.mjs";

const safeEquals = (a = "", b = "") => a.length > 0 && b.length > 0 && a === b;

const notifyVisit = async (event) => {
  if (env("TELEGRAM_NOTIFY_VISITS", "false") !== "true") return;
  const chatId = env("TELEGRAM_ADMIN_CHAT_ID");
  if (!chatId || !env("TELEGRAM_BOT_TOKEN")) return;

  const device = event.device?.category || "unknown";
  const place = [event.geo?.city, event.geo?.country].filter(Boolean).join(", ") || "unknown location";
  await sendMessage(chatId, [
    "✨ כניסה חדשה לאתר",
    `מכשיר: ${device}`,
    `מיקום כללי: ${place}`,
    `מקור: ${event.referrer || "direct"}`
  ].join("\n"));
};

export default async (req, context) => {
  if (req.method === "OPTIONS") {
    return json({ ok: true });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (body?.type === "owner_check") {
    return json({
      owner: safeEquals(String(body.ownerToken || ""), env("ANALYTICS_OWNER_SECRET"))
    });
  }

  if (body?.owner === true) {
    return json({ ok: true, skipped: true });
  }

  const event = normalizeEvent(body, req, context);
  const work = saveEvent(event).then(() => {
    if (event.type === "session_start") {
      return notifyVisit(event);
    }
    return undefined;
  });

  if (typeof context?.waitUntil === "function") {
    context.waitUntil(work);
    return json({ ok: true, queued: true }, 202);
  }

  await work;
  return json({ ok: true });
};

export const config = {
  path: "/api/analytics",
  method: ["POST", "OPTIONS"]
};
