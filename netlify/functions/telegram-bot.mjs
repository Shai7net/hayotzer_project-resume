import {
  env,
  json,
  lastDateKeys,
  readEventsForDateKeys,
  reportText,
  summarizeEvents
} from "./_shared/analytics-store.mjs";
import { answerCallback, mainKeyboard, sendMessage } from "./_shared/telegram.mjs";

const allowedUserIds = () => env("TELEGRAM_ALLOWED_USER_IDS")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

const isAuthorized = (from, chat) => {
  const allowed = allowedUserIds();
  const adminChat = env("TELEGRAM_ADMIN_CHAT_ID");
  if (!allowed.length && !adminChat) return false;
  if (from?.id && allowed.includes(String(from.id))) return true;
  if (chat?.id && adminChat && String(chat.id) === String(adminChat)) return true;
  return false;
};

const setupText = (chat) => [
  "הבוט מחובר, אבל עוד לא הוגדרה הרשאה.",
  "",
  `Chat ID שלך: ${chat?.id || "לא ידוע"}`,
  "שים את הערך הזה ב-TELEGRAM_ADMIN_CHAT_ID בתוך Netlify Environment Variables וגם בקובץ .env המקומי."
].join("\n");

const ownerLinkText = () => {
  const siteUrl = env("SITE_PUBLIC_URL").replace(/\/+$/, "");
  const ownerSecret = env("ANALYTICS_OWNER_SECRET");
  if (!siteUrl || !ownerSecret) {
    return "חסר SITE_PUBLIC_URL או ANALYTICS_OWNER_SECRET. מלא אותם ב-Netlify ובקובץ .env.";
  }
  return [
    "👤 קישור בעלים",
    "פתח את הקישור הזה במכשירים שלך כדי שהכניסות שלך לא ייספרו באנליטיקה:",
    "",
    `${siteUrl}/?owner=${encodeURIComponent(ownerSecret)}`,
    "",
    "אל תשתף את הקישור הזה עם אחרים."
  ].join("\n");
};

const rangeFor = (kind) => {
  const now = Date.now();
  if (kind === "today") return { label: "דוח היום", keys: lastDateKeys(1), since: 0 };
  if (kind === "yesterday") return { label: "דוח אתמול", keys: lastDateKeys(2).slice(1), since: 0 };
  if (kind === "week") return { label: "דוח 7 ימים", keys: lastDateKeys(7), since: 0 };
  return { label: "דוח 24 שעות אחרונות", keys: lastDateKeys(2), since: now - 24 * 60 * 60 * 1000 };
};

const sendReport = async (chatId, kind = "today") => {
  const range = rangeFor(kind);
  let events = await readEventsForDateKeys(range.keys);
  if (range.since) {
    events = events.filter((event) => Date.parse(event.timestamp) >= range.since);
  }
  await sendMessage(chatId, reportText(range.label, summarizeEvents(events)));
};

const handleText = async (message) => {
  const chat = message.chat;
  const text = String(message.text || "").trim();

  if (!isAuthorized(message.from, chat)) {
    await sendMessage(chat.id, setupText(chat), { inline_keyboard: [[{ text: "🆔 Chat ID", callback_data: "whoami" }]] });
    return;
  }

  if (text === "/today" || text === "📊 היום") return sendReport(chat.id, "today");
  if (text === "/week" || text === "📈 7 ימים") return sendReport(chat.id, "week");
  if (text === "/last24" || text === "🕘 24 שעות") return sendReport(chat.id, "last24");
  if (text === "/yesterday" || text === "📆 אתמול") return sendReport(chat.id, "yesterday");
  if (text === "/owner") return sendMessage(chat.id, ownerLinkText());
  if (text === "/whoami") return sendMessage(chat.id, `Chat ID: ${chat.id}\nUser ID: ${message.from?.id || "unknown"}`);

  await sendMessage(chat.id, [
    "ברוך הבא לבוט האנליטיקה של Hayotzer.",
    "בחר דוח מהכפתורים או שלח /today /last24 /week /owner"
  ].join("\n"), mainKeyboard());
};

const handleCallback = async (query) => {
  const chat = query.message?.chat;
  if (!chat?.id) return;
  if (!isAuthorized(query.from, chat)) {
    await answerCallback(query.id, "אין הרשאה");
    await sendMessage(chat.id, setupText(chat), { inline_keyboard: [[{ text: "🆔 Chat ID", callback_data: "whoami" }]] });
    return;
  }

  const data = String(query.data || "");
  await answerCallback(query.id);

  if (data.startsWith("report:")) {
    return sendReport(chat.id, data.split(":")[1] || "today");
  }
  if (data === "owner_link") {
    return sendMessage(chat.id, ownerLinkText());
  }
  if (data === "whoami") {
    return sendMessage(chat.id, `Chat ID: ${chat.id}\nUser ID: ${query.from?.id || "unknown"}`);
  }
};

export default async (req) => {
  if (req.method !== "POST") {
    return json({ ok: true, message: "Telegram webhook endpoint" });
  }

  const webhookSecret = env("TELEGRAM_WEBHOOK_SECRET");
  if (webhookSecret && req.headers.get("x-telegram-bot-api-secret-token") !== webhookSecret) {
    return json({ ok: false, error: "Unauthorized" }, 401);
  }

  const update = await req.json().catch(() => null);
  if (!update) return json({ ok: false, error: "Invalid update" }, 400);

  if (update.callback_query) {
    await handleCallback(update.callback_query);
  } else if (update.message) {
    await handleText(update.message);
  }

  return json({ ok: true });
};

export const config = {
  path: "/api/telegram-bot",
  method: ["GET", "POST"]
};
