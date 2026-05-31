import { env } from "./analytics-store.mjs";

export const telegramApi = async (method, payload) => {
  const token = env("TELEGRAM_BOT_TOKEN");
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is missing");
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) {
    throw new Error(data.description || `Telegram ${method} failed`);
  }
  return data;
};

export const telegramList = (value = "") => String(value)
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

export const mainKeyboard = () => ({
  inline_keyboard: [
    [
      { text: "📊 היום", callback_data: "report:today" },
      { text: "🕘 24 שעות", callback_data: "report:last24" }
    ],
    [
      { text: "📆 אתמול", callback_data: "report:yesterday" },
      { text: "📈 7 ימים", callback_data: "report:week" }
    ],
    [
      { text: "👤 קישור בעלים", callback_data: "owner_link" },
      { text: "🆔 Chat ID", callback_data: "whoami" }
    ]
  ]
});

export const sendMessage = (chatId, text, replyMarkup = mainKeyboard()) => telegramApi("sendMessage", {
  chat_id: chatId,
  text,
  disable_web_page_preview: true,
  reply_markup: replyMarkup
});

export const answerCallback = (callbackQueryId, text = "") => telegramApi("answerCallbackQuery", {
  callback_query_id: callbackQueryId,
  text
});
