import { getStore } from "@netlify/blobs";

const STORE_NAME = "hayotzer-analytics-v1";

export const env = (key, fallback = "") => {
  const netlifyValue = globalThis.Netlify?.env?.get?.(key);
  return netlifyValue ?? process.env[key] ?? fallback;
};

export const corsHeaders = () => ({
  "Access-Control-Allow-Origin": env("ANALYTICS_ALLOWED_ORIGIN", "*"),
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Telegram-Bot-Api-Secret-Token",
  "Vary": "Origin"
});

export const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), {
  status,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...corsHeaders(),
    ...headers
  }
});

export const getAnalyticsStore = () => getStore(STORE_NAME);

export const getTimeZone = () => env("ANALYTICS_TIMEZONE", "Asia/Jerusalem");

export const dateKey = (timestamp = Date.now(), timeZone = getTimeZone()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date(timestamp));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

export const lastDateKeys = (days, now = Date.now(), timeZone = getTimeZone()) => {
  const keys = new Set();
  for (let index = 0; index < days; index += 1) {
    keys.add(dateKey(now - index * 24 * 60 * 60 * 1000, timeZone));
  }
  return [...keys];
};

export const randomId = () => {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
};

const safeString = (value, limit = 220) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, limit);

const deviceCategoryFromUa = (ua = "") => {
  if (/ipad|tablet/i.test(ua)) return "tablet";
  if (/mobile|iphone|android/i.test(ua)) return "mobile";
  return "desktop";
};

export const normalizeEvent = (body, req, context) => {
  const now = Date.now();
  const ua = req.headers.get("user-agent") || "";
  const type = safeString(body?.type || "event", 64).replace(/[^a-z0-9:_-]/gi, "_");
  const payload = body?.payload && typeof body.payload === "object" ? body.payload : {};
  const geo = context?.geo || {};

  return {
    id: randomId(),
    type,
    timestamp: new Date(now).toISOString(),
    date: dateKey(now),
    visitorId: safeString(body?.visitorId, 90),
    sessionId: safeString(body?.sessionId, 90),
    page: safeString(body?.page || req.headers.get("referer") || "", 500),
    referrer: safeString(body?.referrer, 500),
    language: safeString(body?.language || req.headers.get("accept-language") || "", 120),
    timezone: safeString(body?.timezone, 80),
    viewport: {
      width: Number(body?.viewport?.width || 0),
      height: Number(body?.viewport?.height || 0)
    },
    device: {
      category: safeString(body?.device?.category || deviceCategoryFromUa(ua), 40),
      touch: Boolean(body?.device?.touch),
      memory: Number(body?.device?.memory || 0),
      cores: Number(body?.device?.cores || 0)
    },
    browser: {
      userAgent: safeString(ua, 420)
    },
    geo: {
      city: safeString(geo.city, 120),
      country: safeString(geo.country?.name || geo.country?.code || "", 120),
      timezone: safeString(geo.timezone, 120)
    },
    payload: {
      shot: safeString(payload.shot, 90),
      title: safeString(payload.title, 180),
      url: safeString(payload.url, 500),
      durationMs: Number(payload.durationMs || 0),
      progress: Number(payload.progress || 0),
      score: Number(payload.score || 0),
      href: safeString(payload.href, 500),
      label: safeString(payload.label, 160)
    }
  };
};

export const saveEvent = async (event) => {
  const store = getAnalyticsStore();
  const key = `events/${event.date}/${Date.now()}-${event.id}.json`;
  await store.setJSON(key, event);
  return key;
};

export const listEventKeys = async (prefix) => {
  const store = getAnalyticsStore();
  const keys = [];
  let cursor;
  do {
    const result = await store.list({ prefix, cursor });
    const entries = result.blobs || result.entries || [];
    entries.forEach((entry) => keys.push(entry.key || entry.name || entry));
    cursor = result.cursor;
  } while (cursor);
  return keys;
};

export const readEventsForDateKeys = async (keys) => {
  const store = getAnalyticsStore();
  const eventKeys = [];
  for (const key of keys) {
    eventKeys.push(...await listEventKeys(`events/${key}/`));
  }

  const events = [];
  for (const key of eventKeys) {
    try {
      const event = await store.get(key, { type: "json" });
      if (event) events.push(event);
    } catch (error) {
      console.warn("Could not read analytics event", key, error);
    }
  }
  return events.sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
};

const topEntries = (map, limit = 5) => [...map.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, limit);

export const formatDuration = (ms) => {
  const safeSeconds = Math.max(0, Math.round(Number(ms || 0) / 1000));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

export const summarizeEvents = (events) => {
  const visitors = new Set();
  const sessions = new Map();
  const devices = new Map();
  const referrers = new Map();
  const shots = new Map();
  const videos = new Map();
  const contacts = new Map();

  for (const event of events) {
    if (event.visitorId) visitors.add(event.visitorId);
    if (event.sessionId) {
      const session = sessions.get(event.sessionId) || {
        start: Number.POSITIVE_INFINITY,
        end: 0,
        durationMs: 0
      };
      const timestamp = Date.parse(event.timestamp);
      if (Number.isFinite(timestamp)) {
        session.start = Math.min(session.start, timestamp);
        session.end = Math.max(session.end, timestamp);
      }
      session.durationMs = Math.max(session.durationMs, Number(event.payload?.durationMs || 0));
      sessions.set(event.sessionId, session);
    }
    const device = event.device?.category || "unknown";
    devices.set(device, (devices.get(device) || 0) + 1);

    if (event.type === "session_start") {
      const referrer = event.referrer ? event.referrer.replace(/^https?:\/\//, "") : "direct";
      referrers.set(referrer, (referrers.get(referrer) || 0) + 1);
    }
    if (event.type === "shot_view" && event.payload?.shot) {
      shots.set(event.payload.shot, (shots.get(event.payload.shot) || 0) + 1);
    }
    if (event.type === "video_open" && event.payload?.title) {
      videos.set(event.payload.title, (videos.get(event.payload.title) || 0) + 1);
    }
    if (event.type === "contact_click" && event.payload?.label) {
      contacts.set(event.payload.label, (contacts.get(event.payload.label) || 0) + 1);
    }
  }

  let totalDuration = 0;
  let durationCount = 0;
  for (const session of sessions.values()) {
    const inferred = session.end > session.start ? session.end - session.start : 0;
    const duration = Math.max(session.durationMs, inferred);
    if (duration > 0) {
      totalDuration += duration;
      durationCount += 1;
    }
  }

  return {
    events: events.length,
    visitors: visitors.size,
    sessions: sessions.size,
    averageDurationMs: durationCount ? totalDuration / durationCount : 0,
    devices: topEntries(devices),
    referrers: topEntries(referrers),
    shots: topEntries(shots),
    videos: topEntries(videos),
    contacts: topEntries(contacts)
  };
};

const formatTopList = (title, entries, emptyText) => {
  if (!entries.length) return `${title}: ${emptyText}`;
  return `${title}:\n${entries.map(([name, count]) => `• ${name}: ${count}`).join("\n")}`;
};

export const reportText = (label, summary) => [
  `📊 ${label}`,
  "",
  `מבקרים ייחודיים: ${summary.visitors}`,
  `סשנים: ${summary.sessions}`,
  `אירועים שנמדדו: ${summary.events}`,
  `שהות ממוצעת: ${formatDuration(summary.averageDurationMs)}`,
  "",
  formatTopList("מכשירים", summary.devices, "אין מידע"),
  "",
  formatTopList("מקורות כניסה", summary.referrers, "אין מידע"),
  "",
  formatTopList("אזורים באתר", summary.shots, "אין מידע"),
  "",
  formatTopList("וידאו שנפתח", summary.videos, "עדיין לא נפתחו סרטונים"),
  "",
  formatTopList("יצירת קשר", summary.contacts, "אין לחיצות עדיין")
].join("\n");
