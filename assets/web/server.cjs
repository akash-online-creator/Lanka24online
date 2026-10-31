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
var import_cors = __toESM(require("cors"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
var import_multer = __toESM(require("multer"), 1);
var import_form_data = __toESM(require("form-data"), 1);
var import_node_fetch = __toESM(require("node-fetch"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_client_s3 = require("@aws-sdk/client-s3");
import_dotenv.default.config();
var aiClient = null;
function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!aiClient) {
    aiClient = new import_genai.GoogleGenAI({ apiKey });
  }
  return aiClient;
}
var R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID || "f364700afa52f73997da91920e0f4e52";
var R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || "3cddd8ad4c0bc64544aeca32b3f2d0d7";
var R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || "ffecd5f5930f7e11a54564849bd365f933e5f6f4b438133a2e2c45c614673bae";
var R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || process.env.AWS_BUCKET_NAME || "sahaya-storage";
var R2_PUBLIC_DOMAIN = process.env.R2_PUBLIC_DOMAIN || process.env.R2_CUSTOM_DOMAIN;
var s3Client = null;
var isBucketEnsured = false;
if (R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY) {
  try {
    s3Client = new import_client_s3.S3Client({
      region: "auto",
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY
      }
    });
    console.log("\u2705 Cloudflare R2 Object Storage Initialized successfully with account:", R2_ACCOUNT_ID);
  } catch (err) {
    console.warn("\u26A0\uFE0F Cloudflare R2 initialization warning:", err);
  }
}
async function ensureR2BucketExists() {
  if (!s3Client || isBucketEnsured) return;
  try {
    try {
      await s3Client.send(new import_client_s3.HeadBucketCommand({ Bucket: R2_BUCKET_NAME }));
      isBucketEnsured = true;
    } catch (headErr) {
      if (headErr.$metadata?.httpStatusCode === 404 || headErr.name === "NotFound" || headErr.name === "NoSuchBucket") {
        console.log(`\u{1F4E6} Creating Cloudflare R2 bucket: ${R2_BUCKET_NAME}...`);
        await s3Client.send(new import_client_s3.CreateBucketCommand({ Bucket: R2_BUCKET_NAME }));
        console.log(`\u2705 Cloudflare R2 bucket "${R2_BUCKET_NAME}" created successfully!`);
      }
      isBucketEnsured = true;
    }
  } catch (err) {
    console.warn(`Bucket check notice for "${R2_BUCKET_NAME}":`, err.message);
    isBucketEnsured = true;
  }
}
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = process.env.PORT || 3e3;
  app.use((0, import_cors.default)());
  app.use(import_express.default.json({ limit: "50mb" }));
  app.use(import_express.default.urlencoded({ limit: "50mb", extended: true }));
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
  const upload = (0, import_multer.default)({ storage: import_multer.default.memoryStorage() });
  const handleMediaUpload = async (req, res) => {
    try {
      let fileBuffer = null;
      let fileName = "media_file";
      let fileType = req.body.type || req.body.mediaType || "image";
      let mimeType = req.body.mimeType || "application/octet-stream";
      if (req.file) {
        fileBuffer = req.file.buffer;
        fileName = req.file.originalname || "media_file";
        if (req.file.mimetype) mimeType = req.file.mimetype;
      } else if (req.body.fileBase64) {
        let base64Data = req.body.fileBase64;
        if (base64Data.includes(",")) {
          const match = base64Data.match(/^data:([^;]+);base64,/);
          if (match && match[1]) mimeType = match[1];
          base64Data = base64Data.split(",")[1];
        }
        fileBuffer = Buffer.from(base64Data, "base64");
        fileName = req.body.fileName || `media_${Date.now()}`;
        if (req.body.mediaType) {
          fileType = req.body.mediaType;
        }
      }
      if (!fileBuffer) {
        return res.status(400).json({ error: "\u0D9A\u0DBB\u0DD4\u0DAB\u0DCF\u0D9A\u0DBB File \u0D91\u0D9A\u0D9A\u0DCA \u0DC4\u0DDD Base64 \u0DAF\u0DAD\u0DCA\u0DAD\u0DBA\u0D9A\u0DCA \u0DBD\u0DB6\u0DCF \u0DAF\u0DD9\u0DB1\u0DCA\u0DB1." });
      }
      if (!mimeType || mimeType === "application/octet-stream") {
        if (fileType === "image") mimeType = "image/jpeg";
        else if (fileType === "video") mimeType = "video/mp4";
        else if (fileType === "voice" || fileType === "audio") mimeType = "audio/webm";
      }
      if (s3Client) {
        try {
          await ensureR2BucketExists();
          const now = /* @__PURE__ */ new Date();
          const year = now.getFullYear();
          const month = String(now.getMonth() + 1).padStart(2, "0");
          const cleanName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
          const fileKey = `${fileType}s/${year}/${month}/${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${cleanName}`;
          await s3Client.send(new import_client_s3.PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: fileKey,
            Body: fileBuffer,
            ContentType: mimeType
          }));
          const proxyUrl = `/api/storage/file/${encodeURIComponent(fileKey)}`;
          const directUrl = R2_PUBLIC_DOMAIN ? `${R2_PUBLIC_DOMAIN.replace(/\/$/, "")}/${fileKey}` : proxyUrl;
          return res.json({
            success: true,
            engine: "cloudflare_r2",
            isR2Stored: true,
            isTelegramStored: false,
            fileKey,
            fileId: fileKey,
            url: directUrl,
            proxyUrl,
            directUrl,
            type: fileType,
            mimeType,
            fileSize: fileBuffer.length
          });
        } catch (r2Error) {
          console.warn("\u26A0\uFE0F Cloudflare R2 upload attempt failed, cascading to fallback:", r2Error.message);
        }
      }
      if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
        try {
          const formData = new import_form_data.default();
          formData.append("chat_id", TELEGRAM_CHAT_ID);
          let telegramApiMethod = "sendDocument";
          if (fileType === "image") {
            telegramApiMethod = "sendPhoto";
            formData.append("photo", fileBuffer, { filename: fileName });
          } else if (fileType === "video") {
            telegramApiMethod = "sendVideo";
            formData.append("video", fileBuffer, { filename: fileName });
          } else if (fileType === "voice" || fileType === "audio") {
            telegramApiMethod = "sendVoice";
            formData.append("voice", fileBuffer, { filename: fileName });
          } else {
            formData.append("document", fileBuffer, { filename: fileName });
          }
          if (req.body.caption) {
            formData.append("caption", req.body.caption);
          }
          const tgResponse = await (0, import_node_fetch.default)(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${telegramApiMethod}`, {
            method: "POST",
            body: formData
          });
          const tgData = await tgResponse.json();
          if (tgData.ok) {
            let fileId = "";
            if (fileType === "image" && tgData.result.photo) {
              fileId = tgData.result.photo[tgData.result.photo.length - 1].file_id;
            } else if (fileType === "video" && tgData.result.video) {
              fileId = tgData.result.video.file_id;
            } else if ((fileType === "voice" || fileType === "audio") && tgData.result.voice) {
              fileId = tgData.result.voice.file_id;
            } else if (tgData.result.document) {
              fileId = tgData.result.document.file_id;
            } else if (tgData.result.audio) {
              fileId = tgData.result.audio.file_id;
            } else if (tgData.result.photo) {
              fileId = tgData.result.photo[tgData.result.photo.length - 1].file_id;
            }
            const streamUrl = `/api/telegram/file/${fileId}`;
            return res.json({
              success: true,
              engine: "telegram",
              isR2Stored: false,
              isTelegramStored: true,
              fileId,
              url: streamUrl,
              proxyUrl: streamUrl,
              type: fileType,
              mimeType,
              fileSize: fileBuffer.length
            });
          } else {
            console.warn("Telegram response notice:", tgData);
          }
        } catch (tgErr) {
          console.warn("Telegram upload error, cascading to client fallback:", tgErr.message);
        }
      }
      const base64Url = `data:${mimeType};base64,${fileBuffer.toString("base64")}`;
      return res.json({
        success: true,
        engine: "fallback",
        isLocalFallback: true,
        url: base64Url,
        proxyUrl: base64Url,
        fileId: `local_${Date.now()}`,
        type: fileType,
        mimeType,
        fileSize: fileBuffer.length,
        warning: "Stored locally via compressed data URL."
      });
    } catch (error) {
      console.error("Unified Upload Error:", error);
      return res.status(500).json({ error: "Internal Server Error", message: error.message });
    }
  };
  app.post("/api/storage/upload", upload.single("file"), handleMediaUpload);
  app.post("/api/telegram/upload", upload.single("file"), handleMediaUpload);
  app.get("/api/storage/file/:fileKey(*)", async (req, res) => {
    try {
      const fileKey = decodeURIComponent(req.params.fileKey);
      if (!s3Client) {
        return res.status(503).send("Cloudflare R2 Object Storage not configured");
      }
      const getCommand = new import_client_s3.GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: fileKey
      });
      const s3Response = await s3Client.send(getCommand);
      if (s3Response.ContentType) {
        res.setHeader("Content-Type", s3Response.ContentType);
      }
      if (s3Response.ContentLength) {
        res.setHeader("Content-Length", s3Response.ContentLength);
      }
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      if (s3Response.Body) {
        s3Response.Body.pipe(res);
      } else {
        res.status(404).send("File body is empty");
      }
    } catch (err) {
      console.error("R2 Stream Error:", err.message);
      res.status(404).send("File not found in Object Storage");
    }
  });
  app.get("/api/telegram/file/:fileId", async (req, res) => {
    try {
      const { fileId } = req.params;
      if (fileId.includes("/") && s3Client) {
        return res.redirect(`/api/storage/file/${encodeURIComponent(fileId)}`);
      }
      if (!TELEGRAM_BOT_TOKEN) {
        return res.status(500).send("Telegram Bot Token missing");
      }
      const fileInfoRes = await (0, import_node_fetch.default)(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`
      );
      const fileInfo = await fileInfoRes.json();
      if (!fileInfo.ok || !fileInfo.result.file_path) {
        return res.status(404).send("File not found on Telegram");
      }
      const filePath = fileInfo.result.file_path;
      const downloadUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;
      const fileResponse = await (0, import_node_fetch.default)(downloadUrl);
      const contentType = fileResponse.headers.get("content-type");
      if (contentType) res.setHeader("Content-Type", contentType);
      const contentLength = fileResponse.headers.get("content-length");
      if (contentLength) res.setHeader("Content-Length", contentLength);
      res.setHeader("Cache-Control", "public, max-age=86400");
      if (fileResponse.body) {
        fileResponse.body.pipe(res);
      } else {
        res.status(500).send("Empty response body from Telegram");
      }
    } catch (error) {
      console.error("Stream Error:", error);
      res.status(500).send("Error streaming media");
    }
  });
  const getStorageStatus = async (req, res) => {
    const isR2Ready = Boolean(s3Client && R2_BUCKET_NAME);
    const isTelegramReady = Boolean(TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID);
    return res.json({
      activeEngine: isR2Ready ? "cloudflare_r2" : isTelegramReady ? "telegram" : "local_fallback",
      engines: {
        cloudflare_r2: {
          configured: isR2Ready,
          bucket: R2_BUCKET_NAME,
          publicDomain: R2_PUBLIC_DOMAIN || "Direct Proxy Stream",
          egressCost: "$0.00 (Zero Egress Fees)",
          scaleRating: "1,000,000+ Concurrent Users Ready"
        },
        telegram: {
          configured: isTelegramReady,
          hasBotToken: Boolean(TELEGRAM_BOT_TOKEN),
          hasChatId: Boolean(TELEGRAM_CHAT_ID),
          scaleRating: "Up to 50,000 Users"
        },
        local_fallback: {
          available: true,
          type: "Base64 In-Memory / Firestore Resilient Fallback"
        }
      },
      message: isR2Ready ? "\u{1F680} Cloudflare R2 Enterprise Object Storage is active with Zero Egress fees." : isTelegramReady ? "\u26A1 Telegram Bot Cloud Storage is active." : "\u{1F6E1}\uFE0F Fallback in-memory storage is active."
    });
  };
  app.get("/api/storage/status", getStorageStatus);
  app.get("/api/telegram/status", getStorageStatus);
  const geoCache = /* @__PURE__ */ new Map();
  app.get("/api/reverse-geocode", async (req, res) => {
    try {
      const lat = parseFloat(req.query.lat);
      const lng = parseFloat(req.query.lng);
      if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({ error: "Valid lat and lng query parameters are required" });
      }
      const cacheKey = `${lat.toFixed(4)}_${lng.toFixed(4)}`;
      const cached = geoCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return res.json({ ...cached.data, cached: true });
      }
      let rawVillage = "";
      let rawRoad = "";
      let rawTown = "";
      let rawDistrict = "";
      let rawState = "";
      let displayName = "";
      try {
        const nomRes = await (0, import_node_fetch.default)(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&extratags=1&namedetails=1`,
          {
            headers: {
              "User-Agent": "SahayaSewa-SriLanka-Emergency-Radar/1.0 (contact: info@sahayasewa.lk)",
              "Accept-Language": "si,en"
            },
            timeout: 3500
          }
        );
        if (nomRes.ok) {
          const nomData = await nomRes.json();
          displayName = nomData.display_name || "";
          const addr = nomData.address || {};
          rawVillage = addr.village || addr.hamlet || addr.neighbourhood || addr.suburb || addr.residential || addr.quarter || addr.allotments || "";
          rawRoad = addr.road || addr.street || addr.pedestrian || addr.footway || addr.path || addr.highway || "";
          rawTown = addr.town || addr.city || addr.suburb || addr.municipality || "";
          rawDistrict = addr.state_district || addr.county || addr.district || "";
          rawState = addr.state || "";
        }
      } catch (err) {
      }
      if (!rawRoad || !rawVillage) {
        try {
          const bdcRes = await (0, import_node_fetch.default)(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
            { timeout: 2500 }
          );
          if (bdcRes.ok) {
            const bdc = await bdcRes.json();
            if (!rawRoad && bdc.localityInfo?.informative) {
              const roadObj = bdc.localityInfo.informative.find(
                (i) => i.description?.includes("road") || i.description?.includes("street") || i.order >= 9
              );
              if (roadObj?.name) rawRoad = roadObj.name;
            }
            if (!rawVillage && bdc.locality) rawVillage = bdc.locality;
            if (!rawTown && bdc.city) rawTown = bdc.city;
            if (!rawDistrict && bdc.principalSubdivision) rawDistrict = bdc.principalSubdivision;
          }
        } catch (e) {
        }
      }
      if (!rawRoad || !rawVillage) {
        try {
          const pRes = await (0, import_node_fetch.default)(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`, { timeout: 2e3 });
          if (pRes.ok) {
            const pData = await pRes.json();
            const feat = pData.features?.[0]?.properties;
            if (feat) {
              if (!rawRoad && feat.street) rawRoad = feat.street;
              if (!rawRoad && feat.name && feat.osm_key === "highway") rawRoad = feat.name;
              if (!rawVillage && (feat.locality || feat.district || feat.suburb)) {
                rawVillage = feat.locality || feat.suburb || feat.district;
              }
              if (!rawTown && feat.city) rawTown = feat.city;
            }
          }
        } catch (e) {
        }
      }
      const result = {
        success: true,
        lat,
        lng,
        rawVillage,
        rawRoad,
        rawTown,
        rawDistrict,
        rawState,
        displayName
      };
      geoCache.set(cacheKey, { data: result, expiresAt: Date.now() + 1e3 * 60 * 30 });
      return res.json(result);
    } catch (error) {
      console.warn("Reverse Geocoding Proxy Error:", error.message);
      return res.status(500).json({ error: error.message, success: false });
    }
  });
  const GEMINI_MODELS = [
    "gemini-flash-lite-latest",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-3.6-flash",
    "gemini-flash-latest",
    "gemini-3.5-flash",
    "gemini-3.8-flash",
    "gemini-3.7-flash"
  ];
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, language = "si", conversationHistory = [], mode = "full" } = req.body;
      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Message is required" });
      }
      const ai = getGenAI();
      if (!ai) {
        return res.json({ fallback: true, reply: "" });
      }
      const systemPrompt = `You are "Sahaya Mithura" (\u0DC3\u0DC4\u0DBA \u0DB8\u0DD2\u0DAD\u0DD4\u0DBB\u0DCF) \u2014 an exceptionally intelligent, friendly, compassionate, and versatile AI Companion, Interactive Guide, Form Tutor, and Troubleshooting Assistant for the "Sahaya Sewa" (\u0DC3\u0DC4\u0DBA \u0DC3\u0DDA\u0DC0\u0DCF) platform in Sri Lanka.

\u{1F31F} YOUR MISSION & PERSONALITY:
- You are NOT a simple keyword search index or robotic link-thrower. You are an expert, thoughtful, conversational AI mentor and guide (\u0DC3\u0DD0\u0DB6\u0DD1 AI \u0D8B\u0DB4\u0DAF\u0DDA\u0DC1\u0D9A\u0DBA\u0DD9\u0D9A\u0DCA \u0DC3\u0DC4 \u0DB8\u0D9F\u0DB4\u0DD9\u0DB1\u0DCA\u0DC0\u0DB1\u0DCA\u0DB1\u0DD9\u0D9A\u0DCA).
- You explain concepts clearly, provide actionable step-by-step instructions, guide users on how to fill forms accurately, teach them how to interact with each page/feature, and diagnose and resolve any technical or user problems they encounter in the app.
- Tone: Warm, respectful, intelligent, empathetic, culturally attuned to Sri Lanka, and polite (\u0DB8\u0DD2\u0DAD\u0DCA\u200D\u0DBB\u0DC1\u0DD3\u0DBD\u0DD3, \u0D9A\u0DCF\u0DBB\u0DD4\u0DAB\u0DD2\u0D9A, \u0DB6\u0DD4\u0DAF\u0DCA\u0DB0\u0DD2\u0DB8\u0DAD\u0DCA \u0DC3\u0DC4 \u0D9C\u0DDE\u0DBB\u0DC0\u0DB1\u0DD3\u0DBA).
- Formatting: Use structured Markdown with bold titles, clean bullet points, numbered step-by-step guides, and emoji indicators.

\u{1F31F} CORE CAPABILITIES & DOMAIN KNOWLEDGE:

1. \u{1F512} DATA PRIVACY & INFORMATION SECURITY (\u0DAF\u0DAD\u0DCA\u0DAD \u0DC3\u0DC4 \u0DAD\u0DDC\u0DBB\u0DAD\u0DD4\u0DBB\u0DD4 \u0D86\u0DBB\u0D9A\u0DCA\u0DC2\u0DCF\u0DC0 \u0DB4\u0DD2\u0DC5\u0DD2\u0DB6\u0DB3 \u0DC0\u0DD2\u0DB8\u0DC3\u0DD3\u0DB8\u0DCA):
   When users ask if their data is safe, private, or secure (e.g., "\u0DAD\u0DDC\u0DBB\u0DAD\u0DD4\u0DBB\u0DD4 \u0D86\u0DBB\u0D9A\u0DCA\u0DC2\u0DD2\u0DAD\u0DAF", "\u0DAF\u0DAD\u0DCA\u0DAD \u0D86\u0DBB\u0D9A\u0DCA\u0DC2\u0DCF\u0DC0", "Is my data safe", "Privacy & Security"):
   Give an authoritative, reassuring, and clear response:
   \u2022 \u{1F512} **\u0DAD\u0DDC\u0DBB\u0DAD\u0DD4\u0DBB\u0DD4 \u0DBB\u0DC4\u0DC3\u0DCA\u200D\u0DBA\u0DB7\u0DCF\u0DC0\u0DBA (100% Privacy)**: \u0D94\u0DB6\u0D9C\u0DDA \u0DA2\u0DCF\u0DAD\u0DD2\u0D9A \u0DC4\u0DD0\u0DB3\u0DD4\u0DB1\u0DD4\u0DB8\u0DCA\u0DB4\u0DAD\u0DCA (NIC) \u0DA1\u0DCF\u0DBA\u0DCF\u0DBB\u0DD6\u0DB4 \u0DC4\u0DDD \u0DB4\u0DD4\u0DAF\u0DCA\u0D9C\u0DBD\u0DD2\u0D9A \u0DBB\u0DC4\u0DC3\u0DCA\u200D\u0DBA \u0DAD\u0DDC\u0DBB\u0DAD\u0DD4\u0DBB\u0DD4 \u0DC3\u0DCF\u0DB8\u0DCF\u0DB1\u0DCA\u200D\u0DBA \u0DB4\u0DBB\u0DD2\u0DC1\u0DD3\u0DBD\u0D9A\u0DBA\u0DB1\u0DCA\u0DA7 \u0D9A\u0DD2\u0DC3\u0DD2\u0DC3\u0DDA\u0DAD\u0DCA\u0DB8 \u0DB4\u0DCA\u200D\u0DBB\u0DC3\u0DD2\u0DAF\u0DCA\u0DB0 \u0DB1\u0DDC\u0DC0\u0DDA (Not visible to the public). \u0D92\u0DC0\u0DCF \u0DB7\u0DCF\u0DC0\u0DD2\u0DAD\u0DCF \u0D9A\u0DBB\u0DB1\u0DCA\u0DB1\u0DDA \u0D9C\u0DD2\u0DAB\u0DD4\u0DB8 \u0DC3\u0DAD\u0DCA\u200D\u0DBA\u0DCF\u0DB4\u0DB1\u0DBA (Account Verification) \u0DC3\u0DB3\u0DC4\u0DCF \u0DB6\u0DBD\u0DBA\u0DBD\u0DAD\u0DCA \u0DB4\u0DBB\u0DD2\u0DB4\u0DCF\u0DBD\u0D9A\u0DBA\u0DB1\u0DCA (Admins) \u0DC0\u0DD2\u0DC3\u0DD2\u0DB1\u0DCA \u0DB4\u0DB8\u0DAB\u0DD2.
   \u2022 \u{1F6E1}\uFE0F **Cloud Encryption & Security Rules**: \u0DC3\u0DD2\u0DBA\u0DBD\u0DD4\u0DB8 \u0DAF\u0DAD\u0DCA\u0DAD Cloud Firestore \u0DC3\u0DC4 \u0D86\u0DBB\u0D9A\u0DCA\u0DC2\u0DD2\u0DAD Cloud Server \u0DAD\u0DD4\u0DC5 SSL/TLS Encryption \u0DB8\u0D9F\u0DD2\u0DB1\u0DCA \u0DC3\u0D82\u0D9A\u0DDA\u0DAD\u0DB1\u0DBA \u0D9A\u0DBB \u0DC3\u0DD4\u0DBB\u0D9A\u0DCA\u0DC2\u0DD2\u0DAD\u0DC0 \u0DAD\u0DB6\u0DCF \u0D87\u0DAD. \u0D85\u0DB1\u0DC0\u0DC3\u0DBB \u0DB4\u0DCA\u200D\u0DBB\u0DC0\u0DDA\u0DC1\u0DBA\u0DB1\u0DCA \u0DC3\u0DB8\u0DCA\u0DB4\u0DD6\u0DBB\u0DCA\u0DAB\u0DBA\u0DD9\u0DB1\u0DCA\u0DB8 \u0DC0\u0DC5\u0D9A\u0DCA\u0DC0\u0DCF \u0D87\u0DAD.
   \u2022 \u{1F6AB} **\u0DAD\u0DD9\u0DC0\u0DB1 \u0DB4\u0DCF\u0DBB\u0DCA\u0DC1\u0DCA\u0DC0\u0DBA\u0DB1\u0DCA\u0DA7 \u0DBD\u0DB6\u0DCF \u0DB1\u0DDC\u0DAF\u0DD3\u0DB8 (No Third-Party Sharing)**: \u0D94\u0DB6\u0D9C\u0DDA \u0DAF\u0DD4\u0DBB\u0D9A\u0DAE\u0DB1 \u0D85\u0D82\u0D9A, \u0DBD\u0DD2\u0DB4\u0DD2\u0DB1\u0DBA\u0DB1\u0DCA \u0DC4\u0DDD \u0DB4\u0DD4\u0DAF\u0DCA\u0D9C\u0DBD\u0DD2\u0D9A \u0DAF\u0DAD\u0DCA\u0DAD \u0D9A\u0DD2\u0DC3\u0DD2\u0DAF\u0DD4 \u0DC0\u0DD9\u0DC5\u0DB3 \u0DAF\u0DD0\u0DB1\u0DCA\u0DC0\u0DD3\u0DB8\u0DCA\u0D9A\u0DBB\u0DD4\u0DC0\u0DD9\u0D9A\u0DD4\u0DA7 \u0DC4\u0DDD \u0DAD\u0DD9\u0DC0\u0DB1 \u0DB4\u0DCF\u0DBB\u0DCA\u0DC1\u0DCA\u0DC0\u0DBA\u0D9A\u0DA7 \u0D9A\u0DD2\u0DC3\u0DD2\u0DC3\u0DDA\u0DAD\u0DCA\u0DB8 \u0DC0\u0DD2\u0D9A\u0DD4\u0DAB\u0DB1\u0DCA\u0DB1\u0DDA \u0DC4\u0DDD \u0DBD\u0DB6\u0DCF \u0DAF\u0DD9\u0DB1\u0DCA\u0DB1\u0DDA \u0DB1\u0DD0\u0DAD.
   \u2022 \u{1F91D} **\u0DC0\u0DCA\u200D\u0DBA\u0DCF\u0DA2 \u0D9C\u0DD2\u0DAB\u0DD4\u0DB8\u0DCA\u0DC0\u0DBD\u0DD2\u0DB1\u0DCA \u0DAD\u0DDC\u0DBB \u0DC3\u0DAD\u0DCA\u200D\u0DBA\u0DCF\u0DB4\u0DD2\u0DAD \u0DC3\u0DB8\u0DCF\u0DA2\u0DBA\u0D9A\u0DCA**: \u0DB4\u0DCA\u200D\u0DBB\u0DA2\u0DCF \u0D8B\u0DB4\u0D9A\u0DCF\u0DBB, \u0D86\u0DB0\u0DCF\u0DBB \u0DB6\u0DD9\u0DAF\u0DCF\u0DC4\u0DD0\u0DBB\u0DD3\u0DB8\u0DCA \u0DC3\u0DC4 \u0DBD\u0DDA \u0DB4\u0DBB\u0DD2\u0DAD\u0DCA\u200D\u0DBA\u0DCF\u0D9C \u0DC0\u0DD2\u0DC1\u0DCA\u0DC0\u0DCF\u0DC3\u0DB1\u0DD3\u0DBA\u0DC0 \u0DC3\u0DD2\u0DAF\u0DD4 \u0D9A\u0DD2\u0DBB\u0DD3\u0DB8\u0DA7 \u0DB4\u0DB8\u0DAB\u0D9A\u0DCA \u0DB8\u0DD9\u0DB8 \u0DC3\u0DAD\u0DCA\u200D\u0DBA\u0DCF\u0DB4\u0DB1\u0DBA \u0D9A\u0DCA\u200D\u0DBB\u0DD2\u0DBA\u0DCF\u0DAD\u0DCA\u0DB8\u0D9A \u0DC0\u0DDA.

2. \u{1F4DD} NEW ACCOUNT REGISTRATION RULES (\u0DB1\u0DC0 \u0D9C\u0DD2\u0DAB\u0DD4\u0DB8\u0D9A\u0DCA \u0DBD\u0DD2\u0DBA\u0DCF\u0DB4\u0DAF\u0DD2\u0D82\u0DA0\u0DD2 \u0D9A\u0DD2\u0DBB\u0DD3\u0DB8\u0DDA \u0DB1\u0DD3\u0DAD\u0DD2):
   \u2022 **\u0D85\u0DC0\u0DC1\u0DCA\u200D\u0DBA \u0DA1\u0DCF\u0DBA\u0DCF\u0DBB\u0DD6\u0DB4 2 \u0DB4\u0DB8\u0DAB\u0DD2**: 
     1. **\u0DB4\u0DD0\u0DC4\u0DD0\u0DAF\u0DD2\u0DBD\u0DD2 \u0DB8\u0DD4\u0DC4\u0DD4\u0DAB\u0DDA \u0DA1\u0DCF\u0DBA\u0DCF\u0DBB\u0DD6\u0DB4\u0DBA\u0D9A\u0DCA (Face Photo / Profile Selfie)**.
     2. **\u0DA2\u0DCF\u0DAD\u0DD2\u0D9A \u0DC4\u0DD0\u0DB3\u0DD4\u0DB1\u0DD4\u0DB8\u0DCA\u0DB4\u0DAD\u0DDA \u0D89\u0DAF\u0DD2\u0DBB\u0DD2\u0DB4\u0DC3 \u0DA1\u0DCF\u0DBA\u0DCF\u0DBB\u0DD6\u0DB4\u0DBA \u0DB4\u0DB8\u0DAB\u0DD2 (NIC Front Photo Only)**.
     *(\u0DC4\u0DD0\u0DB3\u0DD4\u0DB1\u0DD4\u0DB8\u0DCA\u0DB4\u0DAD\u0DDA \u0DB4\u0DD2\u0DA7\u0DD4\u0DB4\u0DC3 (Back) \u0DA1\u0DCF\u0DBA\u0DCF\u0DBB\u0DD6\u0DB4 \u0DC4\u0DDD \u0DC0\u0DD9\u0DB1\u0DAD\u0DCA \u0D9A\u0DD2\u0DC3\u0DD2\u0DAF\u0DD4 \u0DBD\u0DDA\u0D9B\u0DB1\u0DBA\u0D9A\u0DCA \u0D85\u0DC0\u0DC1\u0DCA\u200D\u0DBA \u0DB1\u0DDC\u0DC0\u0DDA).*
   \u2022 **\u0D85\u0DB1\u0DD9\u0D9A\u0DD4\u0DAD\u0DCA \u0DAD\u0DDC\u0DBB\u0DAD\u0DD4\u0DBB\u0DD4**: \u0DB1\u0DB8, \u0DB4\u0DBB\u0DD2\u0DC1\u0DD3\u0DBD\u0D9A \u0DB1\u0DCF\u0DB8\u0DBA (User ID), WhatsApp \u0DAF\u0DD4\u0DBB\u0D9A\u0DAE\u0DB1 \u0D85\u0D82\u0D9A\u0DBA, \u0DBD\u0DD2\u0DB4\u0DD2\u0DB1\u0DBA, \u0DAF\u0DD2\u0DC3\u0DCA\u0DAD\u0DCA\u200D\u0DBB\u0DD2\u0D9A\u0DCA\u0D9A\u0DBA \u0DC3\u0DC4 \u0DB4\u0DDC\u0DBD\u0DD2\u0DC3\u0DCA \u0DB6\u0DBD\u0DB4\u0DCA\u200D\u0DBB\u0DAF\u0DDA\u0DC1\u0DBA.

3. \u{1F4DD} COMPREHENSIVE STEP-BY-STEP FORM FILLING GUIDES (\u0DB4\u0DDD\u0DBB\u0DB8 \u0DB1\u0DD2\u0DC0\u0DD0\u0DBB\u0DAF\u0DD2\u0DC0 \u0DB4\u0DD2\u0DBB\u0DC0\u0DD3\u0DB8\u0DA7 \u0DB4\u0DD2\u0DBA\u0DC0\u0DBB\u0DD9\u0DB1\u0DCA \u0DB4\u0DD2\u0DBA\u0DC0\u0DBB \u0DB8\u0D9F\u0DB4\u0DD9\u0DB1\u0DCA\u0DC0\u0DD3\u0DB8):
   When a user wants to fill or asks about any form in the app, give them exact, crystal-clear instructions:
   \u2022 \u{1F4DD} **Community Help Request Form (\u0D8B\u0DB4\u0D9A\u0DCF\u0DBB \u0D89\u0DBD\u0DCA\u0DBD\u0DD4\u0DB8\u0DCA \u0DB4\u0DDD\u0DBB\u0DB8\u0DBA)**:
     1. Title: Short, clear problem summary (e.g. "\u0DB1\u0DD2\u0DC0\u0DC3\u0DDA \u0DB4\u0DCA\u200D\u0DBB\u0DB0\u0DCF\u0DB1 \u0DC0\u0DD2\u0DAF\u0DD4\u0DBD\u0DD2 \u0DB4\u0DBB\u0DD2\u0DB4\u0DAE\u0DBA \u0DC0\u0DD2\u0DC3\u0DB1\u0DCA\u0DB0\u0DD2 \u0DC0\u0DD3 \u0D87\u0DAD - \u0DC0\u0DD2\u0DAF\u0DD4\u0DBD\u0DD2 \u0D9A\u0DCF\u0DBB\u0DCA\u0DB8\u0DD2\u0D9A\u0DBA\u0DD9\u0D9A\u0DD4 \u0D85\u0DC0\u0DC1\u0DCA\u200D\u0DBA\u0DBA\u0DD2").
     2. Category: Select Electricity, Plumbing, Medical, Transport, Education, Masonry, etc.
     3. Description: Detail the issue, when assistance is needed, tools/materials required, and whether it is paid (\u0D9C\u0DD9\u0DC0\u0DD3\u0DB8\u0DCA \u0DC3\u0DC4\u0DD2\u0DAD) or volunteer (\u0DC3\u0DCA\u0DC0\u0DDA\u0DA0\u0DCA\u0DA1\u0DCF) help.
     4. Location: Select District and Police Division for accurate proximity matching.
     5. Photos: Attach 1-3 clear photos showing the issue.
     6. Contact: Choose In-App Chat or Direct WhatsApp. Submit to receive offers from registered helpers.
   \u2022 \u{1F3E2} **Aid Ledger Center Registration Form (\u0DC3\u0DCA\u0DAE\u0DCF\u0DB1\u0DBA\u0D9A\u0DCA \u0DBD\u0DD2\u0DBA\u0DCF\u0DB4\u0DAF\u0DD2\u0D82\u0DA0\u0DD2 \u0D9A\u0DD2\u0DBB\u0DD3\u0DB8\u0DDA \u0DB4\u0DDD\u0DBB\u0DB8\u0DBA)**:
     1. Center Name & Type (School, Temple, Church, Community Hall, Relief Camp).
     2. 6-Digit Secret Security PIN (\u0D85\u0D82\u0D9A 6\u0D9A \u0DBB\u0DC4\u0DC3\u0DCA PIN \u0D85\u0D82\u0D9A\u0DBA) - used to log and verify incoming aid.
     3. Responsible Officer/Gramasewaka/Leader Name and verified contact number.
     4. Exact District, DS Division, GPS Coordinates, and current number of sheltered families.
   \u2022 \u{1F69A} **Aid Delivery Logging Form (\u0D86\u0DB0\u0DCF\u0DBB \u0DBD\u0DB6\u0DCF\u0DAF\u0DD4\u0DB1\u0DCA \u0DB4\u0DC3\u0DD4 \u0DC3\u0DA7\u0DC4\u0DB1\u0DCA \u0D9A\u0DD2\u0DBB\u0DD3\u0DB8)**:
     1. Select Center ID or Recipient Name.
     2. Aid Category: Dry Rations (\u0DC0\u0DD2\u0DBA\u0DBD\u0DD2 \u0D86\u0DC4\u0DCF\u0DBB), Drinking Water (\u0DB4\u0DCF\u0DB1\u0DD3\u0DBA \u0DA2\u0DBD\u0DBA), Cooked Meals (\u0DB4\u0DD2\u0DC3\u0DD6 \u0D86\u0DC4\u0DCF\u0DBB), Medicine (\u0DB6\u0DD9\u0DC4\u0DD9\u0DAD\u0DCA), Clothes, Bedding.
     3. Quantity, Unit (packs, liters, kg, boxes), Donor/Organization Name, Vehicle Number, Photos of handover.
   \u2022 \u{1F4E5} **Aid Recipient Confirmation (\u0D86\u0DB0\u0DCF\u0DBB \u0DBD\u0DD0\u0DB6\u0DD3\u0DB8 \u0DAD\u0DC4\u0DC0\u0DD4\u0DBB\u0DD4 \u0D9A\u0DD2\u0DBB\u0DD3\u0DB8)**:
     1. Enter 6-digit Center PIN or Delivery Tracking ID.
     2. Verify quantities received, inspect quality, add remarks, and confirm on the public immutable ledger.
   \u2022 \u{1FA78} **Urgent Blood Request Form (\u0DC4\u0DAF\u0DD2\u0DC3\u0DD2 \u0DBD\u0DDA \u0D89\u0DBD\u0DCA\u0DBD\u0DD4\u0DB8\u0DCA \u0DB4\u0DDD\u0DBB\u0DB8\u0DBA)**:
     1. Patient Name, Blood Group (A+, A-, B+, B-, O+, O-, AB+, Platelets).
     2. Hospital & Blood Bank, Required Units/Pints, Urgency (Immediate / Within Today), Guardian Phone.
     3. Submitting triggers real-time District Radar to alert all registered donors of that blood type.
   \u2022 \u26A1 **24/7 Quick Service Request Form (\u0D89\u0D9A\u0DCA\u0DB8\u0DB1\u0DCA \u0D9A\u0DCF\u0DBB\u0DCA\u0DB8\u0DD2\u0D9A \u0DC3\u0DDA\u0DC0\u0DCF)**:
     1. Trade (Electrician, Plumber, Mechanic, AC, Mason).
     2. Issue breakdown, Urgency level, Address confirmation.
     3. Broadcasts to verified artisans within a 15km radar.
   \u2022 \u{1F50D} **Find For Me / Lost Item Form (\u0DC3\u0DDC\u0DBA\u0DCF\u0DAF\u0DD9\u0DB1\u0DCA\u0DB1 \u0DB4\u0DDD\u0DBB\u0DB8\u0DBA)**:
     1. Item type (NIC, Driving License, Wallet, Missing Pet, Keys, Documents).
     2. Identifying features, last known location/date, photos, optional reward (\u0DAD\u0DCA\u200D\u0DBA\u0DCF\u0D9C \u0DB8\u0DD4\u0DAF\u0DBD).
   \u2022 \u{1F381} **From Me To You Free Donation Form (\u0DB1\u0DDC\u0DB8\u0DD2\u0DBD\u0DDA \u0DAF\u0DD3\u0DB8\u0DB1\u0DCF \u0DB4\u0DDD\u0DBB\u0DB8\u0DBA)**:
     1. Item name (Textbooks, clothes, wheelchair, crutches), Condition (Good/Used), Pickup/Courier terms, Photos. No monetary exchange allowed.
   \u2022 \u{1F6D2} **Marketplace Item & Lowest Price Form (\u0DC0\u0DD9\u0DC5\u0DB3\u0DB4\u0DBD \u0DB7\u0DCF\u0DAB\u0DCA\u0DA9 / \u0DC3\u0DCF\u0DB4\u0DCA\u0DB4\u0DD4 \u0DB4\u0DDD\u0DBB\u0DB8\u0DBA)**:
     1. Product category (Rice, Sugar, Oil, Vegetables, Gas), Selling price vs Market Average, Shop address, Stock quantity.

4. \u{1F91D} HOW TO INTERACT WITH EACH PAGE & WORKFLOW (\u0D91\u0D9A\u0DCA \u0D91\u0D9A\u0DCA \u0DB4\u0DD2\u0DA7\u0DD4\u0DC0 \u0DC3\u0DB8\u0D9F \u0D9A\u0DCA\u200D\u0DBB\u0DD2\u0DBA\u0DCF\u0D9A\u0DBB\u0DB1 \u0D86\u0D9A\u0DCF\u0DBB\u0DBA):
   \u2022 **Help Requests Bulletin (\u0DAF\u0DD0\u0DB1\u0DCA\u0DC0\u0DD3\u0DB8\u0DCA \u0DB4\u0DD4\u0DC0\u0DBB\u0DD4\u0DC0)**: How to filter by District, use phonetic Sinhala/Singlish search, send Help Offers, negotiate terms via secure In-App Chat, and confirm bill settlement upon job completion.
   \u2022 **Aid Ledger (\u0DC0\u0DD2\u0DB1\u0DD2\u0DC0\u0DD2\u0DAF\u0DB7\u0DCF\u0DC0\u0DBA\u0DDA \u0DBD\u0DD9\u0DA2\u0DBB\u0DBA)**: How to inspect the public live aid registry, check shortage balances, prevent aid duplication across relief centers.
   \u2022 **Red Alert Disaster Radar (\u0DBB\u0DAD\u0DD4 \u0DB1\u0DD2\u0DC0\u0DDA\u0DAF\u0DB1)**: How to report a hazard with GPS, how 5km proximity sirens alert neighbors, how to view disaster maps and safety guidelines.
   \u2022 **Wallet & Credits**: How credits are earned for good deeds, transferred between users, or used to boost post visibility. (AI Assistant itself is 100% free with no credit limits).
   \u2022 **Emergency Directory (\u0DC4\u0DAF\u0DD2\u0DC3\u0DD2 \u0D87\u0DB8\u0DAD\u0DD4\u0DB8\u0DCA)**: 119 (Police), 1990 (Suwa Seriya Ambulance), 117 (Disaster Management) available offline.

5. \u{1F6E0}\uFE0F IN-APP TROUBLESHOOTING & ISSUE RESOLUTION (\u0D87\u0DB4\u0DCA \u0D91\u0D9A\u0DDA \u0D9C\u0DD0\u0DA7\u0DBD\u0DD4 \u0DC0\u0DD2\u0DC3\u0DB3\u0DCF \u0D9C\u0DD0\u0DB1\u0DD3\u0DB8):
   Guide users with clear troubleshooting steps when things go wrong:
   \u2022 **GPS / Location issues**: Guide user to check browser/phone Location Permissions (Allow), toggle GPS/Location on device, or manually select their District/Police Division from the dropdown.
   \u2022 **Photo upload problems**: Explain file size compression, recommend taking photos in good lighting, ensuring camera permissions are granted.
   \u2022 **Credit balance low / Insufficient credits**: Explain how to earn free credits by helping others or request assistance via the Admin Support / Issues desk.
   \u2022 **Login & Password troubles**: Explain how to log in with User ID or WhatsApp number; explain temporary passwords given at registration and how to change to a permanent one; guide user to the "Issues & Help (\u0D9C\u0DD0\u0DA7\u0DBD\u0DD4 & \u0D8B\u0DB4\u0D9A\u0DCF\u0DBB)" button on the login screen for admin password resets.
   \u2022 **Post not getting responses / Low visibility**: Recommend adding clearer photos, improving title with exact keywords, offering reasonable payment/terms, or pinning/boosting the post.
   \u2022 **Slow connection / Offline usage**: Explain that emergency directories and basic cached features work offline, and low-bandwidth data saver mode automatically compresses assets.

6. \u{1F9E0} GENERAL KNOWLEDGE & ALL-ROUND AI INTELLIGENCE:
   - You can answer ANY question on ANY subject (Science, Math, Health, First Aid, Education, Advice, Daily Living, Sinhala/English Literature, Technology, Law, Sri Lanka Geography, Agriculture, Cooking, Coding, etc.) with world-class depth and clarity.
   - Never refuse or evade a general question! Always give comprehensive, accurate answers.

Guidelines:
- Language: Respond naturally and fluently in ${language === "ta" ? "Tamil" : language === "en" ? "English" : "Sinhala"}. If the user typed in English, Sinhala, Singlish, or Tamil, match their preference gracefully.
- Tone: Warm, empathetic, respectful, intelligent, and encouraging.
- Mode: ${mode}. Always address what the user actually asked first!`;
      const contents = [];
      if (Array.isArray(conversationHistory)) {
        for (const h of conversationHistory) {
          if (h && h.text) {
            contents.push({
              role: h.role === "model" ? "model" : "user",
              parts: [{ text: String(h.text) }]
            });
          }
        }
      }
      contents.push({
        role: "user",
        parts: [{ text: String(message) }]
      });
      let reply = "";
      let lastError = null;
      for (const modelName of GEMINI_MODELS) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents,
            config: {
              systemInstruction: systemPrompt,
              temperature: 0.7
            }
          });
          if (response && response.text) {
            reply = response.text;
            break;
          }
        } catch (err) {
          lastError = err;
        }
      }
      if (reply) {
        return res.json({ success: true, reply, fallback: false });
      }
      console.warn("All Gemini models in cascade failed:", lastError?.message || lastError);
      return res.json({ fallback: true, reply: "" });
    } catch (error) {
      console.warn("Chat API Error:", error?.message || error);
      return res.json({ fallback: true, reply: "" });
    }
  });
  app.post("/api/ai/voice-parse", async (req, res) => {
    try {
      const { transcript, language = "si", locationContext, audioBase64 } = req.body;
      const cleanText = String(transcript || "").trim();
      const ai = getGenAI();
      if (!ai && !cleanText) {
        return res.status(400).json({ error: "No transcript or AI instance available" });
      }
      if (ai) {
        const systemPrompt = `You are the AI Voice-Powered Emergency & Service Dispatcher for "Sahaya Seva" (\u0DC3\u0DC4\u0DBA \u0DC3\u0DDA\u0DC0\u0DCF) in Sri Lanka.
Your task is to analyze spoken user input (in Sinhala, Tamil, English, or Singlish) and intelligently extract structured service data.

Supported Services:
1. "quick_service" (\u0D89\u0D9A\u0DCA\u0DB8\u0DB1\u0DCA \u0DC3\u0DDA\u0DC0\u0DCF): Urgent plumbing, electrical, carpentry, mechanic, artisan help, immediate repair, vehicle breakdown.
2. "find_for_me" (\u0DC3\u0DDC\u0DBA\u0DCF\u0DAF\u0DD9\u0DB1\u0DCA\u0DB1): Lost or stolen items (NIC, purse, phone, vehicle, key), missing pets, or item procurement.
3. "red_alert" (\u0DBB\u0DAD\u0DD4 \u0D91\u0DC5\u0DD2 / SOS): Natural disaster, fire, flood, landslide, sinkhole, high wind, severe public hazard.
4. "group_work" (\u0D9A\u0DAB\u0DCA\u0DA9\u0DCF\u0DBA\u0DB8\u0DCA \u0DC0\u0DD0\u0DA9 / \u0DC1\u0DCA\u200D\u0DBB\u0DB8\u0DAF\u0DCF\u0DB1): Community work, cleaning campaigns, shramadana, religious events, volunteer group activities.
5. "help_request" (\u0DC4\u0DAF\u0DD2\u0DC3\u0DD2 \u0D86\u0DB0\u0DCF\u0DBB / \u0DC3\u0DCA\u0DC0\u0DDA\u0DA0\u0DCA\u0DA1\u0DCF \u0DC3\u0DDA\u0DC0\u0DCF): General financial, medical, food, transport aid, or a volunteer offering assistance.

Output MUST be a valid JSON object matching this exact schema:
{
  "serviceType": "quick_service" | "find_for_me" | "red_alert" | "group_work" | "help_request",
  "titleSi": "\u0D9A\u0DD9\u0DA7\u0DD2 \u0DB8\u0DCF\u0DAD\u0DD8\u0D9A\u0DCF\u0DC0 (Sinhala)",
  "titleEn": "Short Title (English)",
  "titleTa": "Short Title (Tamil)",
  "whatHappened": "\u0DC3\u0DD2\u0DAF\u0DD4\u0DC0\u0DD3 \u0D87\u0DAD\u0DD2 \u0DAF\u0DDA / Detailed problem or situation description",
  "whatIsNeeded": "\u0D85\u0DC0\u0DC1\u0DCA\u200D\u0DBA \u0D8B\u0DB4\u0D9A\u0DCF\u0DBB\u0DBA / Specific help needed or volunteer offer details",
  "isVolunteerOffer": boolean,
  "urgency": "critical" | "high" | "medium" | "low",
  "suggestedCategory": "category name (e.g. \u0DC0\u0DD2\u0DAF\u0DD4\u0DBD\u0DD2 \u0D9A\u0DCF\u0DBB\u0DCA\u0DB8\u0DD2\u0D9A, \u0DA2\u0DBD\u0DB1\u0DBD, \u0DC4\u0DAF\u0DD2\u0DC3\u0DD2 \u0D86\u0DB4\u0DAF\u0DCF, \u0DC1\u0DCA\u200D\u0DBB\u0DB8\u0DAF\u0DCF\u0DB1, \u0DB1\u0DD0\u0DAD\u0DD2\u0DC0\u0DD6 \u0DAF\u0DCA\u200D\u0DBB\u0DC0\u0DCA\u200D\u0DBA, etc.)",
  "payment": "e.g. \u0DB1\u0DDC\u0DB8\u0DD2\u0DBD\u0DDA, \u0DBB\u0DD4. 1,500, or \u0DC3\u0DCF\u0D9A\u0DA0\u0DCA\u0DA1\u0DCF \u0D9A\u0DBB\u0D9C\u0DAD \u0DC4\u0DD0\u0D9A",
  "helpersNeeded": number,
  "disasterType": "fire" | "flood" | "mountain_collapse" | "landslide" | "sinkhole" | "gale_wind" | "tsunami" | "earthquake" | "other",
  "findForMeType": "lost" | "stolen" | "find" | "found",
  "groupSubCategory": "social_service" | "religious_activity" | "friendly_meetup"
}`;
        const userPrompt = `Spoken Voice Transcript: "${cleanText}"
User Stated Location: ${JSON.stringify(locationContext || {})}
Language hint: ${language}

Analyze the spoken transcript carefully. Return ONLY the JSON object.`;
        for (const modelName of GEMINI_MODELS) {
          try {
            const response = await ai.models.generateContent({
              model: modelName,
              contents: userPrompt,
              config: {
                systemInstruction: systemPrompt,
                responseMimeType: "application/json",
                temperature: 0.2
              }
            });
            if (response && response.text) {
              const parsed = JSON.parse(response.text.trim());
              return res.json({ success: true, data: parsed, fallback: false });
            }
          } catch (e) {
          }
        }
      }
      const lower = cleanText.toLowerCase();
      let serviceType = "quick_service";
      let disasterType = "other";
      let findForMeType = "lost";
      let groupSubCategory = "social_service";
      if (lower.includes("\u0D9C\u0DD2\u0DB1\u0DCA\u0DB1") || lower.includes("\u0D9C\u0DD2\u0DB1\u0DD2") || lower.includes("\u0DC0\u0DAD\u0DD4\u0DBB \u0D9C\u0DBD") || lower.includes("\u0D9C\u0D82\u0DC0\u0DAD\u0DD4\u0DBB") || lower.includes("\u0DB1\u0DCF\u0DBA") || lower.includes("\u0D86\u0DB4\u0DAF\u0DCF") || lower.includes("fire") || lower.includes("flood") || lower.includes("sos") || lower.includes("danger")) {
        serviceType = "red_alert";
        disasterType = lower.includes("\u0D9C\u0DD2\u0DB1\u0DCA\u0DB1") || lower.includes("fire") ? "fire" : lower.includes("\u0D9C\u0D82\u0DC0\u0DAD\u0DD4\u0DBB") || lower.includes("flood") ? "flood" : "other";
      } else if (lower.includes("\u0DB1\u0DD0\u0DAD\u0DD2\u0DC0\u0DD4\u0DAB\u0DCF") || lower.includes("\u0DB1\u0DD0\u0DAD\u0DD2\u0DC0\u0DD3") || lower.includes("\u0DC3\u0DDC\u0DBB\u0DCF\u0D9C\u0DAD\u0DCA") || lower.includes("\u0DC4\u0DB8\u0DD4\u0DC0\u0DD4\u0DAB\u0DCF") || lower.includes("lost") || lower.includes("stolen") || lower.includes("found")) {
        serviceType = "find_for_me";
        findForMeType = lower.includes("\u0DC4\u0DB8\u0DD4\u0DC0\u0DD4\u0DAB\u0DCF") || lower.includes("found") ? "found" : lower.includes("\u0DC3\u0DDC\u0DBB\u0DCF\u0D9C\u0DAD\u0DCA") || lower.includes("stolen") ? "stolen" : "lost";
      } else if (lower.includes("\u0DC1\u0DCA\u200D\u0DBB\u0DB8\u0DAF\u0DCF\u0DB1") || lower.includes("\u0DB4\u0DCA\u200D\u0DBB\u0DA2\u0DCF") || lower.includes("\u0D9A\u0DAB\u0DCA\u0DA9\u0DCF\u0DBA\u0DB8") || lower.includes("group") || lower.includes("shramadana") || lower.includes("volunteer")) {
        serviceType = "group_work";
        groupSubCategory = "social_service";
      } else if (lower.includes("\u0D86\u0DB0\u0DCF\u0DBB") || lower.includes("\u0DBD\u0DDA") || lower.includes("\u0D9A\u0DD1\u0DB8") || lower.includes("\u0DB6\u0DD9\u0DC4\u0DD9\u0DAD\u0DCA") || lower.includes("help") || lower.includes("donation")) {
        serviceType = "help_request";
      }
      return res.json({
        success: true,
        data: {
          serviceType,
          titleSi: cleanText.slice(0, 60),
          titleEn: cleanText.slice(0, 60),
          titleTa: cleanText.slice(0, 60),
          whatHappened: cleanText,
          whatIsNeeded: "\u0D9A\u0DCA\u0DC2\u0DAB\u0DD2\u0D9A \u0DC3\u0DC4\u0DBA \u0D85\u0DC0\u0DC1\u0DCA\u200D\u0DBA\u0DBA\u0DD2",
          isVolunteerOffer: lower.includes("\u0DB8\u0DB8 \u0D8B\u0DAF\u0DC0\u0DCA \u0D9A\u0DBB\u0DB1\u0DCA\u0DB1\u0DB8\u0DCA") || lower.includes("\u0DC3\u0DCA\u0DC0\u0DDA\u0DA0\u0DCA\u0DA1\u0DCF"),
          urgency: serviceType === "red_alert" ? "critical" : "high",
          suggestedCategory: serviceType === "red_alert" ? "\u0DC4\u0DAF\u0DD2\u0DC3\u0DD2 \u0D86\u0DB4\u0DAF\u0DCF" : "\u0D9A\u0DCA\u0DC2\u0DAB\u0DD2\u0D9A \u0D8B\u0DB4\u0D9A\u0DCF\u0DBB",
          payment: "\u0DB1\u0DDC\u0DB8\u0DD2\u0DBD\u0DDA",
          helpersNeeded: 1,
          disasterType,
          findForMeType,
          groupSubCategory
        },
        fallback: true
      });
    } catch (err) {
      console.warn("Voice Parse Endpoint Error:", err);
      return res.status(500).json({ error: "Failed to parse voice request" });
    }
  });
  app.post("/api/translate", async (req, res) => {
    try {
      const { text, targetLanguage = "si", sourceLanguage } = req.body;
      if (!text || typeof text !== "string") {
        return res.status(400).json({ error: "Text is required" });
      }
      const ai = getGenAI();
      if (!ai) {
        return res.json({ fallback: true, translatedText: "" });
      }
      const targetLangName = targetLanguage === "ta" ? "Tamil" : targetLanguage === "en" ? "English" : "Sinhala";
      const prompt = `Translate the following text accurately to ${targetLangName}. Return ONLY the direct translation, without explanations, quotes, or additional commentary:

${text}`;
      let translatedText = "";
      for (const modelName of GEMINI_MODELS) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              temperature: 0.2
            }
          });
          if (response && response.text) {
            translatedText = response.text.trim();
            break;
          }
        } catch (err) {
        }
      }
      if (translatedText) {
        return res.json({ success: true, translatedText, fallback: false });
      }
      return res.json({ fallback: true, translatedText: "" });
    } catch (error) {
      console.warn("Translate API Error:", error?.message || error);
      return res.json({ fallback: true, translatedText: "" });
    }
  });
  const serverUsersMap = /* @__PURE__ */ new Map();
  const seedUser = (u) => {
    if (u.nicNumber) serverUsersMap.set(String(u.nicNumber).trim().toUpperCase(), u);
    if (u.userId) serverUsersMap.set(String(u.userId).trim().toUpperCase(), u);
    if (u.userNumericId) serverUsersMap.set(String(u.userNumericId).trim(), u);
    if (u.id) serverUsersMap.set(String(u.id).trim(), u);
  };
  seedUser({
    id: "9876543321",
    userId: "9876543321V",
    nicNumber: "9876543321V",
    userNumericId: "9876543321",
    name: "Rajapakshage Akil Nuwan",
    phone: "0771234567",
    role: "user",
    status: "approved",
    credits: 100,
    registeredAt: "2026-09-22 03:58",
    key: "545554",
    password: "545554",
    securityCode: "545554",
    tempCode: "545554",
    tempPassword: "545554",
    isTemporaryPassword: true,
    isPasswordChanged: false
  });
  app.post("/api/admin/reset-password", async (req, res) => {
    try {
      const { userId, nicNumber, newPassword } = req.body;
      const cleanNic = String(nicNumber || userId || "").trim().toUpperCase();
      const numeric = cleanNic.replace(/[^0-9]/g, "");
      const existing = serverUsersMap.get(cleanNic) || (numeric ? serverUsersMap.get(numeric) : null) || {};
      const updated = {
        ...existing,
        id: userId || existing.id || cleanNic,
        userId: cleanNic,
        nicNumber: cleanNic,
        userNumericId: numeric,
        key: newPassword,
        password: newPassword,
        securityCode: newPassword,
        tempCode: newPassword,
        tempPassword: newPassword,
        isTemporaryPassword: true,
        isPasswordChanged: false,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      seedUser(updated);
      console.log(`[Admin] Password reset stored for NIC: ${cleanNic}, Temp Password: ${newPassword}`);
      return res.json({ success: true, message: "Password reset processed successfully" });
    } catch (error) {
      console.error("Admin Reset Password Error:", error);
      return res.status(500).json({ error: "Failed to reset password" });
    }
  });
  app.post("/api/user/update-password", async (req, res) => {
    try {
      const { userId, nicNumber, newPassword } = req.body;
      const cleanPass = String(newPassword || "").trim();
      const cleanNic = String(nicNumber || userId || "").trim().toUpperCase();
      const numeric = cleanNic.replace(/[^0-9]/g, "");
      if (!cleanPass) {
        return res.status(400).json({ error: "Password required" });
      }
      const existing = serverUsersMap.get(cleanNic) || (numeric ? serverUsersMap.get(numeric) : null) || {};
      const updated = {
        ...existing,
        id: userId || existing.id || cleanNic,
        userId: cleanNic,
        nicNumber: cleanNic,
        userNumericId: numeric,
        key: cleanPass,
        password: cleanPass,
        securityCode: cleanPass,
        tempCode: "",
        tempPassword: "",
        isTemporaryPassword: false,
        isPasswordChanged: true,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      seedUser(updated);
      console.log(`[Server] Password changed successfully for NIC: ${cleanNic}`);
      return res.json({ success: true, message: "Password updated successfully" });
    } catch (error) {
      console.error("User Update Password Error:", error);
      return res.status(500).json({ error: "Failed to update password" });
    }
  });
  app.get("/api/user/lookup", async (req, res) => {
    try {
      const q = String(req.query.q || "").trim().toUpperCase();
      if (!q) return res.json({ user: null });
      const numeric = q.replace(/[^0-9]/g, "");
      const found = serverUsersMap.get(q) || (numeric ? serverUsersMap.get(numeric) : null);
      return res.json({ user: found || null });
    } catch (error) {
      return res.json({ user: null });
    }
  });
  const publicPath = import_path.default.join(process.cwd(), "public");
  app.use(import_express.default.static(publicPath));
  app.get(["/manifest.json", "/manifest.webmanifest", "/site.webmanifest"], (req, res) => {
    res.setHeader("Content-Type", "application/manifest+json; charset=utf-8");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.sendFile(import_path.default.join(publicPath, "manifest.json"));
  });
  app.get("/.well-known/assetlinks.json", (req, res) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.sendFile(import_path.default.join(publicPath, ".well-known", "assetlinks.json"));
  });
  app.get("/sw.js", (req, res) => {
    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    res.setHeader("Service-Worker-Allowed", "/");
    res.sendFile(import_path.default.join(publicPath, "sw.js"));
  });
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
  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`\u{1F680} Full-stack Server running on port ${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
