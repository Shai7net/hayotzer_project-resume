(() => {
  "use strict";

  const STORAGE_OWNER = "hayotzerAnalyticsOwner";
  const STORAGE_VISITOR = "hayotzerVisitorId";
  const SESSION_KEY = "hayotzerSessionId";
  const STARTED_AT = Date.now();
  const GITHUB_PAGES_ANALYTICS_ENDPOINT = "https://resonant-horse-3ed3a6.netlify.app/api/analytics";
  const isGithubPages = /(^|\.)github\.io$/i.test(window.location.hostname);
  const canUseSameOriginEndpoint = /^https?:$/i.test(window.location.protocol)
    && !isGithubPages;
  const ENDPOINT = window.HAYOTZER_ANALYTICS_ENDPOINT
    || (isGithubPages ? GITHUB_PAGES_ANALYTICS_ENDPOINT : "")
    || (canUseSameOriginEndpoint ? "/api/analytics" : "");

  if (!ENDPOINT) return;

  const randomId = () => {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  };

  const visitorId = (() => {
    try {
      const existing = localStorage.getItem(STORAGE_VISITOR);
      if (existing) return existing;
      const next = randomId();
      localStorage.setItem(STORAGE_VISITOR, next);
      return next;
    } catch {
      return randomId();
    }
  })();

  const sessionId = (() => {
    try {
      const existing = sessionStorage.getItem(SESSION_KEY);
      if (existing) return existing;
      const next = randomId();
      sessionStorage.setItem(SESSION_KEY, next);
      return next;
    } catch {
      return randomId();
    }
  })();

  const isOwner = () => {
    try {
      return localStorage.getItem(STORAGE_OWNER) === "true";
    } catch {
      return false;
    }
  };

  const setOwner = () => {
    try {
      localStorage.setItem(STORAGE_OWNER, "true");
    } catch {
      // Storage can be disabled in private browsing.
    }
  };

  const cleanOwnerParam = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("owner");
    window.history.replaceState(null, document.title, url.toString());
  };

  const deviceCategory = () => {
    if (/ipad|tablet/i.test(navigator.userAgent)) return "tablet";
    if (/mobile|iphone|android/i.test(navigator.userAgent)) return "mobile";
    return "desktop";
  };

  const basePayload = (type, payload = {}) => ({
    type,
    visitorId,
    sessionId,
    owner: isOwner(),
    page: window.location.href,
    referrer: document.referrer,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight
    },
    device: {
      category: deviceCategory(),
      touch: navigator.maxTouchPoints > 0,
      memory: Number(navigator.deviceMemory || 0),
      cores: Number(navigator.hardwareConcurrency || 0)
    },
    payload
  });

  const send = (type, payload = {}, useBeacon = false) => {
    if (isOwner() && type !== "owner_check") return;
    const body = JSON.stringify(basePayload(type, payload));
    if (useBeacon && navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon(ENDPOINT, blob);
      return;
    }
    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: useBeacon
    }).catch(() => {});
  };

  const checkOwnerParam = async () => {
    const ownerToken = new URL(window.location.href).searchParams.get("owner");
    if (!ownerToken) return;
    try {
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "owner_check", ownerToken })
      });
      const data = await response.json();
      if (data.owner) setOwner();
    } catch {
      // If validation fails, do not mark this browser as owner.
    } finally {
      cleanOwnerParam();
    }
  };

  const currentShot = () => {
    const body = document.body;
    if (body.dataset.shotFive === "active") return "contact";
    if (body.dataset.shotFour === "active") return "game";
    if (body.dataset.shotBreak === "active") return "gallery-to-game-transition";
    if (body.dataset.shotThree === "active") return "video-gallery";
    if (body.dataset.sceneKind) return `opening-${body.dataset.sceneKind}`;
    return "opening";
  };

  let lastShot = "";
  const trackShotIfChanged = () => {
    const shot = currentShot();
    if (shot && shot !== lastShot) {
      lastShot = shot;
      send("shot_view", { shot, progress: window.scrollY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight) });
    }
  };

  const trackContactClick = (event) => {
    const link = event.target.closest?.(".contact-link");
    if (!link) return;
    send("contact_click", {
      label: link.innerText || link.getAttribute("aria-label") || "contact",
      href: link.href
    });
  };

  const init = async () => {
    await checkOwnerParam();
    if (isOwner()) return;

    send("session_start", { shot: currentShot() });
    trackShotIfChanged();

    const observer = new MutationObserver(trackShotIfChanged);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-scene-kind", "data-shot-three", "data-shot-break", "data-shot-four", "data-shot-five"]
    });

    window.addEventListener("hayotzer:video-open", (event) => {
      send("video_open", event.detail || {});
    });
    window.addEventListener("hayotzer:game-complete", (event) => {
      send("game_complete", event.detail || {});
    });
    document.addEventListener("click", trackContactClick, true);

    window.setInterval(() => {
      send("heartbeat", {
        shot: currentShot(),
        durationMs: Date.now() - STARTED_AT
      });
    }, 30000);

    window.addEventListener("pagehide", () => {
      send("session_end", {
        shot: currentShot(),
        durationMs: Date.now() - STARTED_AT
      }, true);
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
