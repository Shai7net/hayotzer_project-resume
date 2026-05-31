import {
  env,
  json,
  lastDateKeys,
  readEventsForDateKeys,
  reportText,
  summarizeEvents
} from "./_shared/analytics-store.mjs";
import { mainKeyboard, sendMessage, telegramList } from "./_shared/telegram.mjs";

const rangeFor = (kind) => {
  const now = Date.now();
  if (kind === "today") return { label: "Daily control panel - today", keys: lastDateKeys(1), since: 0 };
  if (kind === "yesterday") return { label: "Daily control panel - yesterday", keys: lastDateKeys(2).slice(1), since: 0 };
  if (kind === "week") return { label: "Daily control panel - 7 days", keys: lastDateKeys(7), since: 0 };
  return {
    label: "Daily control panel - last 24 hours",
    keys: lastDateKeys(2),
    since: now - 24 * 60 * 60 * 1000
  };
};

const dailyTargets = () => {
  const explicitTargets = telegramList(env("TELEGRAM_DAILY_CHAT_IDS"));
  if (explicitTargets.length) return explicitTargets;

  const adminChat = env("TELEGRAM_ADMIN_CHAT_ID");
  return adminChat ? [adminChat] : [];
};

const buildDailyReport = async () => {
  const kind = env("TELEGRAM_DAILY_REPORT_KIND", "last24");
  const range = rangeFor(kind);
  let events = await readEventsForDateKeys(range.keys);
  if (range.since) {
    events = events.filter((event) => Date.parse(event.timestamp) >= range.since);
  }

  return [
    "Hayotzer analytics control panel",
    "The buttons below stay active for quick reports.",
    "",
    reportText(range.label, summarizeEvents(events))
  ].join("\n");
};

export default async () => {
  if (env("TELEGRAM_DAILY_REPORT_ENABLED", "false") !== "true") {
    return json({ ok: true, skipped: true, reason: "Daily Telegram report is disabled" });
  }

  const targets = dailyTargets();
  if (!targets.length) {
    return json({ ok: false, error: "TELEGRAM_DAILY_CHAT_IDS or TELEGRAM_ADMIN_CHAT_ID is required" }, 500);
  }

  const text = await buildDailyReport();
  const results = [];
  for (const chatId of targets) {
    try {
      await sendMessage(chatId, text, mainKeyboard());
      results.push({ chatId, ok: true });
    } catch (error) {
      console.error("Daily Telegram report failed", chatId, error);
      results.push({ chatId, ok: false, error: error.message });
    }
  }

  const failed = results.filter((result) => !result.ok);
  return json({ ok: failed.length === 0, results }, failed.length ? 207 : 200);
};

export const config = {
  schedule: "0 6 * * *"
};
