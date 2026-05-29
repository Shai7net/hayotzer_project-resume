var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var app = (0, import_express.default)();
var PORT = 3e3;
var cachedVideos = [];
var isFetching = false;
async function scrapeVideos(handle) {
  try {
    const response = await fetch(`https://www.youtube.com/${handle}/videos`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      }
    });
    const html = await response.text();
    const videoIds = /* @__PURE__ */ new Set();
    const regex = /"videoId":"([a-zA-Z0-9_ -]{11})"/g;
    let match;
    while ((match = regex.exec(html)) !== null) {
      videoIds.add(match[1]);
    }
    return Array.from(videoIds);
  } catch (error) {
    console.error(`Error fetching videos for ${handle}:`, error);
    return [];
  }
}
async function updateVideoCache() {
  if (isFetching) return;
  isFetching = true;
  try {
    const [ids1, ids2] = await Promise.all([
      scrapeVideos("@shaitt1137"),
      scrapeVideos("@the88creator")
    ]);
    const combined = Array.from(/* @__PURE__ */ new Set([...ids1, ...ids2]));
    if (combined.length > 0) {
      cachedVideos = combined;
    }
  } catch (e) {
    console.error("Failed to update cache", e);
  } finally {
    isFetching = false;
  }
}
app.get("/api/videos", async (req, res) => {
  if (cachedVideos.length === 0) {
    await updateVideoCache();
  } else {
    updateVideoCache();
  }
  res.json({ videoIds: cachedVideos });
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
