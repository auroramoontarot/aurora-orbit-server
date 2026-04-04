require("dotenv").config();

const express = require("express");
const path = require("path");
const fs = require("fs");
const fetch = require("node-fetch");
const xml2js = require("xml2js");
const ical = require("node-ical");
const tmi = require("tmi.js");   // ✅ MUST be here

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
/* -------------------------
   TWITCH CHAT RELAY
------------------------- */

const TWITCH_CHANNEL = "auroramoontarot";

const twitchClient = new tmi.Client({
  channels: [TWITCH_CHANNEL]
});

let chatClients = [];

twitchClient.connect()
  .then(() => console.log("✨ Twitch chat relay connected"))
  .catch(err => console.error("Twitch relay connect error:", err));

app.get("/chatstream", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive"
  });

  res.write(`data: ${JSON.stringify({ type: "status", text: "connected" })}\n\n`);

  chatClients.push(res);

  req.on("close", () => {
    chatClients = chatClients.filter(client => client !== res);
  });
});

let lastAstreaAutoAt = 0;
const ASTREA_AUTO_COOLDOWN_MS = 12 * 60 * 1000; // 12 minutes

function canTriggerAstreaAuto() {
  return Date.now() - lastAstreaAutoAt >= ASTREA_AUTO_COOLDOWN_MS;
}

function markAstreaAutoTriggered() {
  lastAstreaAutoAt = Date.now();
}

function broadcastChat(payload) {
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  chatClients.forEach(client => client.write(data));
}

twitchClient.on("message", (channel, tags, message, self) => {
  if (self) return;

  const username = (tags.username || "").toLowerCase();
  const isBroadcaster =
    !!(tags.badges && tags.badges.broadcaster) ||
    username === TWITCH_CHANNEL;

  broadcastChat({
    type: "message",
    user: tags["display-name"] || tags.username || "Moonbeam",
    username,
    text: message,
    mod: !!tags.mod,
    subscriber: !!tags.subscriber,
    broadcaster: isBroadcaster
  });
});

function stripCommand(message, command) {
  return String(message || "")
    .trim()
    .replace(new RegExp(`^!${command}\\s*`, "i"), "")
    .trim();
}

function speakOverlay(text, mode = "astrea") {
  const cleanText = String(text || "").trim();
  if (!cleanText) return;

  broadcastChat({
    type: mode === "aurora" ? "aurora" : "astrea",
    text: cleanText,
    mode
  });
}


/* -------------------------
   FILE PATHS
------------------------- */

const DATA_DIR = path.join(__dirname, "public", "data");

const WEATHER_CACHE_DATA = path.join(DATA_DIR, "weather-cache.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const AURORA_MOON_DATA = path.join(DATA_DIR, "aurora-moon-data.json");
const AURORA_TASK_DATA = path.join(DATA_DIR, "aurora-task.json");
const AURORA_HABITS_DATA = path.join(DATA_DIR, "aurora-habits.json");
const AURORA_QUESTS_DATA = path.join(DATA_DIR, "aurora-quests.json");
const MEDIA_DATA = path.join(DATA_DIR, "media.json");
const TAROT_DATA = path.join(DATA_DIR, "tarot.json");
const QUOTES_DATA = path.join(DATA_DIR, "quotes.json");
const SPOTIFY_AUTH_DATA = path.join(DATA_DIR, "spotify-auth.json");
const SPOTIFY_STATE_DATA = path.join(DATA_DIR, "spotify-state.json");
const SPOTIFY_AUTO_DATA = path.join(DATA_DIR, "spotify-auto.json");

/* -------------------------
   HELPERS
------------------------- */

function readJsonFile(filePath, fallback = {}) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Read JSON failed:", filePath, err.message);
    return fallback;
  }
}

function writeJsonFile(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function updateMoonData(mutator) {
  const data = readJsonFile(AURORA_MOON_DATA, {});
  const updated = mutator({ ...data }) || data;
  writeJsonFile(AURORA_MOON_DATA, updated);
  return updated;
}

function cleanHtmlText(str = "") {
  return String(str)
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function getCurrentGoodreadsBook() {
  const rssUrl = process.env.GOODREADS_RSS_URL;

  if (!rssUrl) {
    return null;
  }

  const response = await fetch(rssUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Goodreads RSS HTTP ${response.status}`);
  }

  const xml = await response.text();

  return await new Promise((resolve, reject) => {
    xml2js.parseString(xml, { explicitArray: false }, (err, result) => {
      if (err) {
        reject(err);
        return;
      }

      const channel = result?.rss?.channel;
      const items = channel?.item
        ? (Array.isArray(channel.item) ? channel.item : [channel.item])
        : [];

      if (!items.length) {
        resolve(null);
        return;
      }

      const first = items[0];

      const title = cleanHtmlText(first?.title || "");
      const author =
        cleanHtmlText(first?.author_name || first?.["author_name"] || "") ||
        cleanHtmlText(first?.book_author_name || "");

      if (!title) {
        resolve(null);
        return;
      }

      resolve({
        title,
        author: author || "",
      });
    });
  });
}

function getRandomQuote() {
  const data = readJsonFile(QUOTES_DATA, { quotes: [] });
  const list = Array.isArray(data.quotes) ? data.quotes : [];

  if (!list.length) return "☕ Coffee time, Moonbeam.";

  return list[Math.floor(Math.random() * list.length)];
}

const coffeeCareMessages = [
  "💧 Moonbeam check-in: sip some water, soften your shoulders, and unclench your jaw.",
  "🌙 Gentle reminder: breathe deep, roll your shoulders, and refill your cup.",
  "✨ Coffee break care moment: stretch a little, hydrate a little, be kind to your body.",
  "💜 Spoonie pause: jaw unclenched? shoulders down? water nearby?",
  "☕ Reset check: posture, breath, water, vibes."
];

const coffeeCozyMessages = [
  "☕ Moonbeam coffee break in progress... cozy vibes only.",
  "🌌 Stars Hollow energy restored. Resume softness at your own pace.",
  "✨ Tiny break. Tiny reset. Tiny stardust refill.",
  "🌙 Refill your cup, reset your sparkle.",
  "💫 Cozy pause unlocked."
];

const coffeeBmcMessages = [
  "☕ Fuel the mission ✨ Support the stream with a little caffeine magic: https://buymeacoffee.com/auroramoontarot 💜",
  "☕ If you'd like to toss a little stardust into the cup, you can do so here: https://buymeacoffee.com/auroramoontarot ✨",
  "💜 Cozy corner support link: https://buymeacoffee.com/auroramoontarot — thank you for helping keep the lights glowing.",
  "☕ Moonbeam coffee break magic lives here too: https://buymeacoffee.com/auroramoontarot ✨"
];

let lastFollowupType = null;

function getCoffeeFollowupMessage() {
  const roll = Math.random();
  let type;

  if (roll < 0.10) type = "none";
  else if (roll < 0.40) type = "bmc";
  else if (roll < 0.80) type = "care";
  else type = "cozy";

if (type === lastFollowupType && type !== "none") {
  // fallback to a different type instead of recursion
  if (type === "bmc") type = "care";
  else if (type === "care") type = "cozy";
  else if (type === "cozy") type = "bmc";
}

  lastFollowupType = type;

  if (type === "none") return null;
  if (type === "bmc") return randomItem(coffeeBmcMessages);
  if (type === "care") return randomItem(coffeeCareMessages);
  return randomItem(coffeeCozyMessages);
}

// --- THOUGHT BUBBLE STATE ---
let thoughtBubbleState = {
  text: "",
  visible: false,
  source: "manual",
  updatedAt: Date.now()
};

const thoughtBubbleClients = new Set();

let thoughtBubbleTimeout = null;

function setThoughtBubble(update = {}) {
  thoughtBubbleState = {
    ...thoughtBubbleState,
    ...update,
    updatedAt: Date.now()
  };

  broadcastThoughtBubble();
}
function broadcastThoughtBubble() {
  const payload = `data: ${JSON.stringify(thoughtBubbleState)}\n\n`;
  for (const client of thoughtBubbleClients) {
    client.write(payload);
  }
}

function scheduleThoughtBubbleClear(ms = 0) {
  if (thoughtBubbleTimeout) clearTimeout(thoughtBubbleTimeout);

  if (ms > 0) {
    thoughtBubbleTimeout = setTimeout(() => {
      setThoughtBubble({
        text: "",
        visible: false,
        source: "timeout"
      });
    }, ms);
  }
}

// --- THOUGHT BUBBLE ROUTES ---

app.get("/thought-bubble", (req, res) => {
  res.json(thoughtBubbleState);
});

app.post("/thought-bubble", (req, res) => {
  const text = String(req.body?.text || "").trim();
  const visible = req.body?.visible !== false;
  const durationMs = Number(req.body?.durationMs || 0);

  setThoughtBubble({
    text,
    visible,
    source: req.body?.source || "manual"
  });

  scheduleThoughtBubbleClear(durationMs);

  res.json({ ok: true, state: thoughtBubbleState });
});

app.post("/thought-bubble/hide", (req, res) => {
  setThoughtBubble({
    visible: false,
    source: "manual-hide"
  });
  res.json({ ok: true, state: thoughtBubbleState });
});

app.post("/thought-bubble/clear", (req, res) => {
  setThoughtBubble({
    text: "",
    visible: false,
    source: "manual-clear"
  });
  res.json({ ok: true, state: thoughtBubbleState });
});

app.get("/thought-bubble/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  res.write(`data: ${JSON.stringify(thoughtBubbleState)}\n\n`);
  thoughtBubbleClients.add(res);

  const keepAlive = setInterval(() => {
    res.write(": keepalive\n\n");
  }, 25000);

  req.on("close", () => {
    clearInterval(keepAlive);
    thoughtBubbleClients.delete(res);
  });
});

const astreaAutoLines = [
  "Signal steady. The stars feel close tonight.",
  "A soft transmission moves through the shuttle.",
  "Cosmic systems humming. Moonbeams, you are received.",
  "The window is quiet, but the signal is alive.",
  "A gentle shift moves through the night sky.",
  "Stardust levels holding steady. All is well.",
  "The frequency is calm tonight.",
  "Transmission stable. Cozy mode remains engaged."
];

let lastMoonPhaseAnnounced = "";

const moonPhaseLines = {
  "new moon": [
    "Luna has gone dark. A new cycle begins.",
    "The new moon is here. Quiet beginnings are unfolding.",
    "Luna has entered her new moon phase. Fresh energy gathers in the dark."
  ],
  "waxing crescent": [
    "Luna is waxing crescent now. A little light is returning.",
    "The crescent grows. Gentle momentum is building.",
    "Luna is gathering light again."
  ],
  "first quarter": [
    "Luna has reached first quarter. Momentum is taking shape.",
    "The moon stands at first quarter. Movement is building.",
    "Luna has entered first quarter. The signal feels sharper tonight."
  ],
  "waxing gibbous": [
    "Luna is waxing gibbous. Energy is growing fuller.",
    "The moon is swelling toward fullness.",
    "Luna is nearly full now. The field feels brightening."
  ],
  "full moon": [
    "Luna is full. The whole shuttle feels illuminated tonight.",
    "Full moon energy is here. The signal is shining brightly.",
    "Luna has reached fullness. The night feels wide awake."
  ],
  "waning gibbous": [
    "Luna is waning gibbous now. The release has begun.",
    "The full glow is softening. Luna is waning gibbous.",
    "Luna has begun to wane. The light is still generous."
  ],
  "last quarter": [
    "Luna has reached last quarter. Reflection and release move together.",
    "The moon is at last quarter. A turning point has arrived.",
    "Luna stands at last quarter. The signal is shifting."
  ],
  "waning crescent": [
    "Luna is waning crescent now. Rest is approaching.",
    "The moon is thinning toward dark again.",
    "Luna is in her waning crescent phase. Quiet closure is near."
  ]
};

function normalizeMoonPhase(phase = "") {
  return String(phase || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function triggerAstreaAuto(reason = "auto") {
  if (!canTriggerAstreaAuto()) return false;

  const quietForMs = Date.now() - lastChatActivityAt;

  // only speak automatically if chat has been fairly quiet
  if (quietForMs < 3 * 60 * 1000) {
    return false;
  }

  const line = randomItem(astreaAutoLines);
  if (!line) return false;

  markAstreaAutoTriggered();
  speakOverlay(line, "astrea");
  console.log(`🛰 Astrea auto (${reason}):`, line);
  return true;
}

setInterval(() => {
  triggerAstreaAuto("interval");
}, 4 * 60 * 1000);

async function checkMoonPhaseTrigger() {
  try {
    const response = await fetch(`http://localhost:${PORT}/moonphase`);

    if (!response.ok) {
      throw new Error(`Moonphase HTTP ${response.status}`);
    }

    const data = await response.json();
    const phase = normalizeMoonPhase(data?.phase || "");

    if (!phase) return false;
    if (phase === lastMoonPhaseAnnounced) return false;

    lastMoonPhaseAnnounced = phase;

    const lines = moonPhaseLines[phase];
    if (!Array.isArray(lines) || !lines.length) return false;

    const line = randomItem(lines);
    speakOverlay(line, "astrea");
    markAstreaAutoTriggered();

    console.log("🌙 Luna phase trigger:", phase, "-", line);
    return true;
  } catch (err) {
    console.error("Moon phase trigger error:", err.message);
    return false;
  }
}

setInterval(() => {
  checkMoonPhaseTrigger();
}, 10 * 60 * 1000);

setTimeout(() => {
  checkMoonPhaseTrigger();
}, 8000);

app.get("/setmoonphase", (req, res) => {
  try {
    const phase = String(req.query.phase || "").trim();
    const updated = { phase };

    writeJsonFile(path.join(DATA_DIR, "moon-phase.json"), updated);
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error("Set moonphase error:", err);
    res.status(500).json({ success: false, error: "Failed to set moonphase" });
  }
});

/* -------------------------
   WORLD STREAM (SSE)
------------------------- */

const worldClients = [];

app.get("/worldstream", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  res.write("\n");
  worldClients.push(res);

  req.on("close", () => {
    const index = worldClients.indexOf(res);
    if (index !== -1) {
      worldClients.splice(index, 1);
    }
  });
});

function broadcastWorldEvent(data) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;

  worldClients.forEach((client) => {
    try {
      client.write(payload);
    } catch (err) {
      console.error("Worldstream write failed:", err.message);
    }
  });
}

const client = new tmi.Client({
  options: { debug: false },
  identity: {
    username: process.env.BOT_USERNAME,
    password: process.env.BOT_OAUTH
  },
  channels: [process.env.CHANNEL_NAME]
});

client.connect();

function sendToChat(message) {
  if (!message) return;

  client.say(process.env.CHANNEL_NAME, message).catch((err) => {
    console.error("Chat send failed:", err.message);
  });
}

client.on("connected", () => {
  console.log("✨ Astrea connected to chat");
});

client.on("disconnected", (reason) => {
  console.log("⚠️ Astrea disconnected:", reason);
});

client.on("reconnect", () => {
  console.log("🔄 Astrea reconnecting...");
});

client.on("error", (err) => {
  console.error("TMI error:", err);
});

const BROADCASTER_USERNAME = "auroramoontarot"; // your actual Twitch chat username in lowercase

let lastChatActivityAt = Date.now();
let hasSentFirstSignal = false;

client.on("message", (channel, tags, message, self) => {
  if (self) return;

  const username = (tags?.username || "").toLowerCase();
  const cleanMessage = String(message || "").trim();
  const lowerMessage = cleanMessage.toLowerCase();

  lastChatActivityAt = Date.now();

  // --- COMMANDS ---
  if (lowerMessage.startsWith("!astrea")) {
    const text = stripCommand(cleanMessage, "astrea");

    if (text) {
      speakOverlay(text, "astrea");
      markAstreaAutoTriggered();
      console.log("🛰 Astrea command:", text);
    }
    return;
  }

  if (lowerMessage.startsWith("!aurora")) {
    const text = stripCommand(cleanMessage, "aurora");

    if (text) {
      speakOverlay(text, "aurora");
      console.log("🌙 Aurora command:", text);
    }
    return;
  }

  // --- YOUR THOUGHT BUBBLE ---
  if (username === BROADCASTER_USERNAME && !cleanMessage.startsWith("!")) {
    setThoughtBubble({
      text: cleanMessage,
      visible: true,
      source: "twitch"
    });

    scheduleThoughtBubbleClear(25000);
  }

  // --- FIRST SIGNAL MOMENT ---
  if (!hasSentFirstSignal && canTriggerAstreaAuto()) {
    hasSentFirstSignal = true;

    setTimeout(() => {
      if (canTriggerAstreaAuto()) {
        const firstSignal = randomItem([
          "Signal received. Welcome, Moonbeams.",
          "Transmission online. The shuttle is listening.",
          "A new signal has entered the field.",
          "Cosmic frequency locked. You are received."
        ]);

        speakOverlay(firstSignal, "astrea");
        markAstreaAutoTriggered();
        console.log("🛰 Astrea first signal:", firstSignal);
      }
    }, 1500);
  }
});

/* -------------------------
   ASTREA / AURORA TTS
------------------------- */

app.post("/tts", async (req, res) => {
  try {
    const { text, voice, mode } = req.body || {};

    const cleanText = String(text || "").trim();
    if (!cleanText) {
      return res.status(400).json({ error: "No text provided" });
    }

    if (!process.env.ELEVENLABS_API_KEY) {
      return res.status(500).json({ error: "Missing ELEVENLABS_API_KEY in .env" });
    }

    const voiceMap = {
      astrea: process.env.ASTREA_VOICE_ID,
      aurora: process.env.AURORA_VOICE_ID
    };

    const selectedVoiceId =
      voice ||
      voiceMap[String(mode || "").toLowerCase()] ||
      process.env.ASTREA_VOICE_ID;

    if (!selectedVoiceId) {
      return res.status(500).json({ error: "Missing voice ID in .env or request body" });
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.8,
            style: 0.35,
            use_speaker_boost: true
          }
        })
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("ElevenLabs HTTP error:", response.status, errText);
      return res.status(500).json({
        error: `ElevenLabs request failed (${response.status})`
      });
    }

    const audioBuffer = await response.buffer();

    res.set("Content-Type", "audio/mpeg");
    res.send(audioBuffer);

  } catch (err) {
    console.error("TTS error:", err);
    res.status(500).json({ error: "TTS failed" });
  }
});

/* -------------------------
   QUICK SPEAK TEST
------------------------- */

app.get("/speak", async (req, res) => {
  try {
    const text = String(req.query.text || "").trim();
    const mode = String(req.query.mode || "astrea").toLowerCase();

    if (!text) {
      return res.status(400).json({ error: "Missing text query param" });
    }

    const voiceMap = {
      astrea: process.env.ASTREA_VOICE_ID,
      aurora: process.env.AURORA_VOICE_ID
    };

    const selectedVoiceId = voiceMap[mode] || process.env.ASTREA_VOICE_ID;

    if (!process.env.ELEVENLABS_API_KEY) {
      return res.status(500).json({ error: "Missing ELEVENLABS_API_KEY in .env" });
    }

    if (!selectedVoiceId) {
      return res.status(500).json({ error: `Missing voice ID for mode: ${mode}` });
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.8,
            style: 0.35,
            use_speaker_boost: true
          }
        })
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("ElevenLabs /speak error:", response.status, errText);
      return res.status(500).json({
        error: `ElevenLabs request failed (${response.status})`
      });
    }

    const audioBuffer = await response.buffer();
    res.set("Content-Type", "audio/mpeg");
    res.send(audioBuffer);

  } catch (err) {
    console.error("Speak route error:", err);
    res.status(500).json({ error: "Speak failed" });
  }
});

/* -------------------------
   ASTREA TRANSMIT
------------------------- */

app.post("/astrea/transmit", (req, res) => {
  try {
    const text = String(req.body?.text || "").trim();

    if (text) {
      speakOverlay(text, "astrea");
      markAstreaAutoTriggered();
      return res.json({ success: true, text, mode: "astrea" });
    }

    const fallback = randomItem(astreaAutoLines);
    speakOverlay(fallback, "astrea");
    markAstreaAutoTriggered();

    res.json({ success: true, text: fallback, mode: "astrea" });
  } catch (err) {
    console.error("Astrea transmit error:", err);
    res.status(500).json({ success: false, error: "Failed to transmit" });
  }
});

/* -------------------------
   WEATHER
------------------------- */

app.get("/weather", async (req, res) => {
  try {
    const WEATHER_API_KEY = process.env.WU_API_KEY;

    if (!WEATHER_API_KEY) {
      throw new Error("Missing WU_API_KEY in .env");
    }

    const weatherStation =
      `https://api.weather.com/v2/pws/observations/current?stationId=KMNSTLOU35&format=json&units=e&apiKey=${WEATHER_API_KEY}`;

    const response = await fetch(weatherStation);

    if (!response.ok) {
      throw new Error(`Weather HTTP ${response.status}`);
    }

    const data = await response.json();

    // ✅ SAVE LAST GOOD WEATHER
    writeJsonFile(WEATHER_CACHE_DATA, {
      source: "wu-live",
      fetchedAt: new Date().toISOString(),
      data
    });

    res.json(data);

  } catch (err) {
    console.error("Weather fetch error:", err.message);

    // 🔁 FALLBACK TO CACHED WEATHER
    const cached = readJsonFile(WEATHER_CACHE_DATA, null);

    if (cached?.data?.observations?.length) {
      console.log("Using cached weather fallback");
      return res.json(cached.data);
    }

    res.status(500).json({
      error: "Weather fetch failed and no cache available"
    });
  }
});

app.get("/moonphase", (req, res) => {
  try {
    const data = readJsonFile(path.join(DATA_DIR, "moon-phase.json"), {});
    res.json({
      phase: data.phase || ""
    });
  } catch (err) {
    console.error("Moonphase route error:", err);
    res.status(500).json({ error: "Moonphase fetch failed" });
  }
});

/* -------------------------
   AURORA STREAM
------------------------- */

app.get("/aurastream", async (req, res) => {
  try {
    const response = await fetch(
      "https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json"
    );

    if (!response.ok) {
      throw new Error(`Aurora HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length < 2) {
      throw new Error("Aurora data format unexpected");
    }

    const latest = data[data.length - 1];
    const kp = Number(latest[1] || 0);

    res.json({ kp });
  } catch (err) {
    console.error("Aurora fetch error:", err);
    res.status(500).json({ error: "Aurora fetch failed" });
  }
});

/* -------------------------
   CALENDAR
------------------------- */

app.get("/calendar", async (req, res) => {
  try {
    const url =
      "https://calendar.google.com/calendar/ical/auroramoontarot%40gmail.com/public/basic.ics";

    const data = await ical.async.fromURL(url);

    const now = new Date();
    const futureWindow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
    const events = [];

    for (const key in data) {
      const ev = data[key];
      if (ev.type !== "VEVENT") continue;

      if (ev.rrule) {
        const dates = ev.rrule.between(now, futureWindow, true);

        dates.forEach((date) => {
          events.push({
            title: ev.summary || "Untitled event",
            start: date,
          });
        });
      } else if (ev.start && ev.start > now) {
        events.push({
          title: ev.summary || "Untitled event",
          start: ev.start,
        });
      }
    }

    events.sort((a, b) => new Date(a.start) - new Date(b.start));

    const seen = new Set();
    const deduped = events.filter((ev) => {
      const key = `${ev.title}|${new Date(ev.start).toISOString()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    res.json(deduped.slice(0, 3));
  } catch (err) {
    console.error("Calendar fetch error:", err);
    res.status(500).json({ error: "Calendar fetch failed" });
  }
});

/* -------------------------
   RSS
------------------------- */

app.get("/rss", async (req, res) => {
  try {
    const rssUrl = req.query.url;

    if (!rssUrl) {
      return res.status(400).json({ error: "Missing rss url" });
    }

    const response = await fetch(rssUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    if (!response.ok) {
      throw new Error(`RSS HTTP ${response.status} for ${rssUrl}`);
    }

    const xml = await response.text();

    xml2js.parseString(xml, { explicitArray: false }, (err, result) => {
      if (err) {
        console.error("Error parsing RSS feed:", rssUrl, err);
        return res.status(500).json({ error: "RSS feed parsing failed" });
      }

      const items = result?.rss?.channel?.item || result?.feed?.entry || [];
      const normalized = Array.isArray(items) ? items : [items];
      res.json(normalized.slice(0, 10));
    });
  } catch (err) {
    console.error("RSS fetch error:", err.message);
    res.status(500).json({ error: "RSS fetch failed" });
  }
});

/* -------------------------
   SPACE WEATHER ALERTS
------------------------- */

app.get("/spaceweather", async (req, res) => {
  try {
    const response = await fetch(
      "https://services.swpc.noaa.gov/products/alerts.json"
    );

    if (!response.ok) {
      throw new Error(`Space Weather HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error("Space weather data format unexpected");
    }

    const alerts = data
      .slice(0, 5)
      .map((item) => {
        const message = String(item.message || "").replace(/\r/g, "");
        const lines = message.split("\n").filter((line) => line.trim());

        const cleaned = lines.find(
          (line) =>
            !line.includes("Space Weather Message Code") &&
            !line.includes("Serial Number") &&
            !line.includes("Issue Time")
        );

        return {
          product_id: item.product_id || "",
          issue_datetime: item.issue_datetime || "",
          title: cleaned || lines[0] || "Space weather update",
        };
      })
      .filter((item) => item.title);

    res.json(alerts);
  } catch (err) {
    console.error("Space weather fetch error:", err);
    res.status(500).json({ error: "Space weather fetch failed" });
  }
});

/* -------------------------
   TAROT
------------------------- */

app.get("/tarot-current", (req, res) => {
  try {
    const data = readJsonFile(TAROT_DATA, { card: "" });
    res.json({
      card: data.card || "",
    });
  } catch (err) {
    console.error("Tarot load error:", err);
    res.status(500).json({ error: "Failed to load tarot card" });
  }
});

app.get("/set-tarot", (req, res) => {
  try {
    const card = String(req.query.card || "").trim();
    const updated = { card };
    writeJsonFile(TAROT_DATA, updated);
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error("Set tarot error:", err);
    res.status(500).json({ success: false, error: "Failed to set tarot card" });
  }
});

/* -------------------------
   DATA GET ROUTES
------------------------- */

app.get("/data/aurora-moon-data", (req, res) => {
  res.json(readJsonFile(AURORA_MOON_DATA, {}));
});

app.get("/data/aurora-task", (req, res) => {
  res.json(readJsonFile(AURORA_TASK_DATA, { task: "" }));
});

app.get("/data/aurora-habits", (req, res) => {
  res.json(readJsonFile(AURORA_HABITS_DATA, { energy: 3 }));
});

app.get("/data/aurora-quests", (req, res) => {
  res.json(readJsonFile(AURORA_QUESTS_DATA, { current: "", queue: [] }));
});

/* -------------------------
   SAVE ROUTES
------------------------- */

app.post("/save/aurora-moon-data", (req, res) => {
  try {
    const current = readJsonFile(AURORA_MOON_DATA, {});
    const updated = { ...current, ...req.body };

    writeJsonFile(AURORA_MOON_DATA, updated);

    if (
      typeof req.body.kodaX !== "undefined" ||
      typeof req.body.kodaY !== "undefined"
    ) {
      broadcastWorldEvent({
        type: "kodaMove",
        x: updated.kodaX ?? 50,
        y: updated.kodaY ?? 50,
      });
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error("Save aurora-moon-data error:", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to save aurora-moon-data" });
  }
});

app.post("/save/aurora-task", (req, res) => {
  try {
    writeJsonFile(AURORA_TASK_DATA, req.body || {});
    res.json({ success: true, data: req.body || {} });
  } catch (err) {
    console.error("Save aurora-task error:", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to save aurora-task" });
  }
});

app.post("/save/aurora-habits", (req, res) => {
  try {
    writeJsonFile(AURORA_HABITS_DATA, req.body || {});
    res.json({ success: true, data: req.body || {} });
  } catch (err) {
    console.error("Save aurora-habits error:", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to save aurora-habits" });
  }
});

app.post("/save/aurora-quests", (req, res) => {
  try {
    writeJsonFile(AURORA_QUESTS_DATA, req.body || {});
    res.json({ success: true, data: req.body || {} });
  } catch (err) {
    console.error("Save aurora-quests error:", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to save aurora-quests" });
  }
});

/* -------------------------
   SINGLE TASK WIDGET
------------------------- */

app.get("/task", (req, res) => {
  try {
    const data = readJsonFile(AURORA_TASK_DATA, { task: "" });
    res.json({ task: data.task || "" });
  } catch (err) {
    console.error("Task load error:", err);
    res.status(500).json({ error: "Failed to load task" });
  }
});

app.get("/settask", (req, res) => {
  try {
    const task = String(req.query.task || "").trim();
    const updated = { task };

    writeJsonFile(AURORA_TASK_DATA, updated);

    if (task) {
      const questData = readJsonFile(AURORA_QUESTS_DATA, {
        current: "",
        queue: []
      });

      questData.current = task;
      writeJsonFile(AURORA_QUESTS_DATA, questData);
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error("Set task error:", err);
    res.status(500).json({ success: false, error: "Failed to set task" });
  }
});

/* -------------------------
   QUEST CONTROL
------------------------- */

app.get("/quest", (req, res) => {
  try {
    const data = readJsonFile(AURORA_QUESTS_DATA, {
      current: "",
      queue: [],
    });

    res.json({
      current: data.current || "",
      queue: Array.isArray(data.queue) ? data.queue : [],
    });
  } catch (err) {
    console.error("Quest load error:", err);
    res.status(500).json({ error: "Failed to load quest data" });
  }
});

app.post("/reorderquests", (req, res) => {
  try {
    const currentData = readJsonFile(AURORA_QUESTS_DATA, {
      current: "",
      queue: [],
    });

    const newQueue = Array.isArray(req.body.queue)
      ? req.body.queue
      : currentData.queue;

    const updated = {
      current: currentData.current || "",
      queue: newQueue,
    };

    writeJsonFile(AURORA_QUESTS_DATA, updated);
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error("Reorder quests error:", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to reorder quests" });
  }
});

app.get("/newtask", (req, res) => {
  try {
    const task = String(req.query.task || "").trim();
    if (!task) {
      return res.status(400).json({ success: false, error: "Missing task" });
    }

    const data = readJsonFile(AURORA_QUESTS_DATA, {
      current: "",
      queue: []
    });

    const queue = Array.isArray(data.queue) ? data.queue : [];

    if (!data.current) {
      data.current = task;
      writeJsonFile(AURORA_TASK_DATA, { task: task });
    } else {
      queue.push(task);
      data.queue = queue;
    }

    writeJsonFile(AURORA_QUESTS_DATA, data);
    res.json({ success: true, data });
  } catch (err) {
    console.error("New task error:", err);
    res.status(500).json({ success: false, error: "Failed to add task" });
  }
});

app.get("/donetask", (req, res) => {
  try {
    const data = readJsonFile(AURORA_QUESTS_DATA, {
      current: "",
      queue: []
    });

    const queue = Array.isArray(data.queue) ? data.queue : [];
    data.current = queue.length ? queue.shift() : "✨ All missions complete ✨";
    data.queue = queue;

    writeJsonFile(AURORA_QUESTS_DATA, data);
    writeJsonFile(AURORA_TASK_DATA, { task: data.current });

    res.json({ success: true, data });
  } catch (err) {
    console.error("Done task error:", err);
    res.status(500).json({ success: false, error: "Failed to complete task" });
  }
});

app.get("/nexttask", (req, res) => {
  try {
    const data = readJsonFile(AURORA_QUESTS_DATA, {
      current: "",
      queue: []
    });

    const queue = Array.isArray(data.queue) ? data.queue : [];

    if (data.current && data.current !== "✨ All missions complete ✨") {
      queue.push(data.current);
    }

    data.current = queue.length ? queue.shift() : "✨ All missions complete ✨";
    data.queue = queue;

    writeJsonFile(AURORA_QUESTS_DATA, data);
    writeJsonFile(AURORA_TASK_DATA, { task: data.current });

    res.json({ success: true, data });
  } catch (err) {
    console.error("Next task error:", err);
    res.status(500).json({ success: false, error: "Failed to skip task" });
  }
});

app.get("/editquest", (req, res) => {
  try {
    const index = Number(req.query.index);
    const text = String(req.query.text || "").trim();

    if (!Number.isInteger(index) || !text) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid edit request" });
    }

    const data = readJsonFile(AURORA_QUESTS_DATA, {
      current: "",
      queue: [],
    });

    const queue = Array.isArray(data.queue) ? data.queue : [];

    if (index < 0 || index >= queue.length) {
      return res
        .status(400)
        .json({ success: false, error: "Quest index out of range" });
    }

    queue[index] = text;
    data.queue = queue;

    writeJsonFile(AURORA_QUESTS_DATA, data);
    res.json({ success: true, data });
  } catch (err) {
    console.error("Edit quest error:", err);
    res.status(500).json({ success: false, error: "Failed to edit quest" });
  }
});

/* -------------------------
   HABITS / ENERGY / AURA
------------------------- */

app.get("/habit", (req, res) => {
  try {
    const name = String(req.query.name || "").trim();
    if (!name) {
      return res
        .status(400)
        .json({ success: false, error: "Missing habit name" });
    }

    const data = readJsonFile(AURORA_HABITS_DATA, { energy: 3 });
    data[name] = !data[name];

    writeJsonFile(AURORA_HABITS_DATA, data);
    res.json({ success: true, data });
  } catch (err) {
    console.error("Habit toggle error:", err);
    res.status(500).json({ success: false, error: "Failed to toggle habit" });
  }
});

app.get("/energy", (req, res) => {
  try {
    const value = Number(req.query.value);
    if (!Number.isFinite(value)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid energy value" });
    }

    const data = readJsonFile(AURORA_HABITS_DATA, {});
    data.energy = value;

    writeJsonFile(AURORA_HABITS_DATA, data);
    res.json({ success: true, data });
  } catch (err) {
    console.error("Energy set error:", err);
    res.status(500).json({ success: false, error: "Failed to set energy" });
  }
});

app.get("/resetday", (req, res) => {
  try {
    const data = readJsonFile(AURORA_HABITS_DATA, {});
    const reset = {};

    Object.keys(data).forEach((key) => {
      if (key === "energy") {
        reset.energy = 3;
      } else {
        reset[key] = false;
      }
    });

    if (typeof reset.energy === "undefined") {
      reset.energy = 3;
    }

    writeJsonFile(AURORA_HABITS_DATA, reset);
    res.json({ success: true, data: reset });
  } catch (err) {
    console.error("Reset day error:", err);
    res.status(500).json({ success: false, error: "Failed to reset day" });
  }
});

app.get("/aura", (req, res) => {
  try {
    const name = String(req.query.name || "clear");

    broadcastWorldEvent({
      type: "aura",
      name,
    });

    res.json({ success: true, name });
  } catch (err) {
    console.error("Aura route error:", err);
    res.status(500).json({ success: false, error: "Failed to set aura" });
  }
});

/* -------------------------
   WORLD / POKEMON ACTIONS
------------------------- */

app.get("/pokemonCatch", (req, res) => {
  try {
    const updated = updateMoonData((data) => {
      data.pokemon_caught = (data.pokemon_caught || 0) + 1;
      return data;
    });

    broadcastWorldEvent({
      type: "wildPokemon",
      emoji: "🐦",
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error("Pokemon catch error:", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to update pokemon catch" });
  }
});

app.get("/pokestopSpin", (req, res) => {
  try {
    const updated = updateMoonData((data) => {
      data.pokestops_spun = (data.pokestops_spun || 0) + 1;
      return data;
    });

    broadcastWorldEvent({
      type: "moonbeam",
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error("Pokestop spin error:", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to update pokestop spin" });
  }
});

app.get("/raidWin", (req, res) => {
  try {
    const updated = updateMoonData((data) => {
      data.raids_won = (data.raids_won || 0) + 1;
      return data;
    });

    broadcastWorldEvent({
      type: "raidWin",
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error("Raid win error:", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to update raid win" });
  }
});

app.get("/eggHatch", (req, res) => {
  try {
    const updated = updateMoonData((data) => {
      data.eggs_hatched = (data.eggs_hatched || 0) + 1;
      return data;
    });

    broadcastWorldEvent({
      type: "wildPokemon",
      emoji: "🐣",
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error("Egg hatch error:", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to update egg hatch" });
  }
});

app.get("/packOpen", (req, res) => {
  try {
    const rarity = String(req.query.rarity || "normal");

    const updated = updateMoonData((data) => {
      data.packs_opened = (data.packs_opened || 0) + 1;

      if (rarity === "rare") {
        data.rare_cards = (data.rare_cards || 0) + 1;
      }

      if (rarity === "ex") {
        data.ex_cards = (data.ex_cards || 0) + 1;
      }

      return data;
    });

    broadcastWorldEvent({
      type: "packOpen",
      rarity,
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error("Pack open error:", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to update pack open" });
  }
});

/* -------------------------
   WORLD EVENT SHORTCUTS
------------------------- */

app.post("/worldevent", (req, res) => {
  try {
    broadcastWorldEvent(req.body || {});
    res.json({ success: true });
  } catch (err) {
    console.error("World event error:", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to send world event" });
  }
});

app.post("/worldevent/moonbeam", (req, res) => {
  try {
    broadcastWorldEvent({ type: "moonbeam" });
    res.json({ success: true });
  } catch (err) {
    console.error("Moonbeam event error:", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to send moonbeam event" });
  }
});

/* -------------------------
   STEWARDSHIP / NATURE SHORTCUTS
------------------------- */

app.get("/hydrantClear", (req, res) => {
  try {
    const updated = updateMoonData((data) => {
      data.hydrant_clear = (data.hydrant_clear || 0) + 1;
      return data;
    });

    broadcastWorldEvent({
      type: "hydrantClear",
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error("Hydrant clear error:", err);
    res.status(500).json({ success: false, error: "Failed to log hydrant clear" });
  }
});

app.get("/basinClear", (req, res) => {
  try {
    const updated = updateMoonData((data) => {
      data.drain_clear = (data.drain_clear || 0) + 1;
      return data;
    });

    broadcastWorldEvent({
      type: "basinClear",
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error("Basin clear error:", err);
    res.status(500).json({ success: false, error: "Failed to log basin clear" });
  }
});

app.get("/trashBag", (req, res) => {
  try {
    const amount = Math.max(1, Number(req.query.amount) || 1);

    const updated = updateMoonData((data) => {
      data.trash_bags = (data.trash_bags || 0) + amount;
      return data;
    });

    broadcastWorldEvent({
      type: "trashBag",
      amount,
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error("Trash bag error:", err);
    res.status(500).json({ success: false, error: "Failed to log trash bag" });
  }
});

app.get("/parkCleanup", (req, res) => {
  try {
    const updated = updateMoonData((data) => {
      data.park_cleanups = (data.park_cleanups || 0) + 1;
      return data;
    });

    broadcastWorldEvent({
      type: "parkCleanup",
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error("Park cleanup error:", err);
    res.status(500).json({ success: false, error: "Failed to log park cleanup" });
  }
});

app.get("/natureProject", (req, res) => {
  try {
    const updated = updateMoonData((data) => {
      data.nature_projects = (data.nature_projects || 0) + 1;
      return data;
    });

    broadcastWorldEvent({
      type: "natureProject",
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error("Nature project error:", err);
    res.status(500).json({ success: false, error: "Failed to log nature project" });
  }
});

app.get("/avaAdventure", (req, res) => {
  try {
    const updated = updateMoonData((data) => {
      data.ava_adventures = (data.ava_adventures || 0) + 1;
      return data;
    });

    broadcastWorldEvent({
      type: "avaAdventure",
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error("Ava adventure error:", err);
    res.status(500).json({ success: false, error: "Failed to log Ava adventure" });
  }
});

app.get("/addVolunteerHours", (req, res) => {
  try {
    const amount = Number(req.query.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ success: false, error: "Invalid volunteer amount" });
    }

    const updated = updateMoonData((data) => {
      data.volunteer_hours = (data.volunteer_hours || 0) + amount;
      return data;
    });

    broadcastWorldEvent({
      type: "volunteerHours",
      amount,
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error("Volunteer hours error:", err);
    res.status(500).json({ success: false, error: "Failed to log volunteer hours" });
  }
});

app.get("/addCeHours", (req, res) => {
  try {
    const amount = Number(req.query.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ success: false, error: "Invalid CE amount" });
    }

    const updated = updateMoonData((data) => {
      data.ce_hours = (data.ce_hours || 0) + amount;
      return data;
    });

    broadcastWorldEvent({
      type: "ceHours",
      amount,
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error("CE hours error:", err);
    res.status(500).json({ success: false, error: "Failed to log CE hours" });
  }
});

/* -------------------------
   WATCHING
------------------------- */

app.get("/watching", (req, res) => {
  try {
    const title = String(req.query.title || "").trim();
    const detail = String(req.query.detail || "").trim();

    const data = readJsonFile(MEDIA_DATA, {
      book: null,
      watching: null
    });

    data.watching = {
      title,
      detail
    };

    writeJsonFile(MEDIA_DATA, data);

    broadcastWorldEvent({
      type: "watching",
      title,
      detail
    });

    res.json({ success: true, data });
  } catch (err) {
    console.error("Watching update error:", err);
    res.status(500).json({ success: false });
  }
});

/* -------------------------
   MEDIA STATUS
------------------------- */

app.get("/media-status", async (req, res) => {
  try {
    const manual = readJsonFile(MEDIA_DATA, {
      book: null,
      watching: null,
    });

    let rssBook = null;

    try {
      rssBook = await getCurrentGoodreadsBook();
    } catch (err) {
      console.error("Goodreads RSS error:", err.message);
    }

    res.json({
      book: rssBook || manual.book || null,
      watching: manual.watching || null,
    });
  } catch (err) {
    console.error("Media status error:", err);
    res.json({
      book: null,
      watching: null,
    });
  }
});

app.get("/goodreads-rss", async (req, res) => {
  try {
    const book = await getCurrentGoodreadsBook();
    res.json(book || { title: null, author: null });
  } catch (err) {
    console.error("Goodreads RSS route error:", err);
    res.status(500).json({ error: "Goodreads RSS fetch failed" });
  }
});

let lastCoffeeBreakAt = 0;

app.post("/coffee-break", (req, res) => {
  try {
    const now = Date.now();

    if (now - lastCoffeeBreakAt < 20000) {
      return res.json({ success: true, skipped: true });
    }

    lastCoffeeBreakAt = now;

    const quote = getRandomQuote();
    const followup = getCoffeeFollowupMessage();

    console.log("☕ Coffee Break Triggered");
    console.log("Quote:", quote);
    console.log("Follow-up:", followup || "[none]");

    // 1. Gilmore quote
    setTimeout(() => {
      sendToChat(`✨ ${quote}`);
    }, 500);

    // 2. Random follow-up (with BMC delay tweak)
    if (followup) {
      const delay = followup.includes("buymeacoffee") ? 6500 : 5000;

      setTimeout(() => {
        sendToChat(followup);
      }, delay);
    }

    res.json({ success: true });

  } catch (err) {
    console.error("Coffee break error:", err);
    res.status(500).json({ success: false });
  }
});

let focusStartCount = 0;

app.post("/focus-start", (req, res) => {
  try {

    const now = new Date();
    const minute = now.getMinutes();

    // only fire at top of hour
    if (minute !== 0) {
      return res.json({ success: true, skipped: true });
    }

    focusStartCount++;

    // only every other valid trigger
    if (focusStartCount % 2 !== 0) {
      return res.json({ success: true, skipped: true });
    }

    const messages = [
      "🌙 Back to focus, Moonbeam.",
      "✨ Focus session engaged.",
      "💜 Gentle return — take it at your pace.",
      "🌌 Stardust aligned — back to mission.",
      "☕ Break complete — let’s drift back in."
    ];

    const message = randomItem(messages);

    const delay = 1500 + Math.random() * 1500;

    setTimeout(() => {
      sendToChat(message);
    }, delay);

    console.log("✨ Focus return message:", message);

    res.json({ success: true });

  } catch (err) {
    console.error("Focus start error:", err);
    res.status(500).json({ success: false });
  }
});

/* -------------------------
   SPOTIFY VIBE CONTROL
------------------------- */

function getSpotifyAuth() {
  return readJsonFile(SPOTIFY_AUTH_DATA, {
    access_token: "",
    refresh_token: "",
    expires_at: 0
  });
}

function saveSpotifyAuth(data) {
  writeJsonFile(SPOTIFY_AUTH_DATA, data);
}

function makeRandomState() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function refreshSpotifyAccessToken() {
  const auth = getSpotifyAuth();

  if (!auth.refresh_token) {
    throw new Error("Missing Spotify refresh token");
  }

  const body = new URLSearchParams();
  body.set("grant_type", "refresh_token");
  body.set("refresh_token", auth.refresh_token);

  const basic = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString("base64");

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: body.toString()
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Spotify refresh failed: ${response.status} ${errText}`);
  }

  const data = await response.json();

  const updated = {
    access_token: data.access_token,
    refresh_token: data.refresh_token || auth.refresh_token,
    expires_at: Date.now() + ((data.expires_in || 3600) * 1000) - 60000
  };

  saveSpotifyAuth(updated);
  return updated.access_token;
}

async function getSpotifyAccessToken() {
  const auth = getSpotifyAuth();

  if (auth.access_token && auth.expires_at && Date.now() < auth.expires_at) {
    return auth.access_token;
  }

  return await refreshSpotifyAccessToken();
}

async function spotifyApi(pathname, options = {}) {
  const accessToken = await getSpotifyAccessToken();

  const response = await fetch(`https://api.spotify.com/v1${pathname}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  if (response.status === 401) {
    const newToken = await refreshSpotifyAccessToken();

    return fetch(`https://api.spotify.com/v1${pathname}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${newToken}`,
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });
  }

  return response;
}

function getPlaylistUriForMode(mode) {
  const map = {
    cottage: process.env.SPOTIFY_PLAYLIST_COTTAGE,
    reiki: process.env.SPOTIFY_PLAYLIST_REIKI,
    stardust: process.env.SPOTIFY_PLAYLIST_STARDUST,
    night: process.env.SPOTIFY_PLAYLIST_NIGHT
  };

  return map[String(mode || "").toLowerCase()] || null;
}

app.get("/spotify/login", (req, res) => {
  try {
    const state = makeRandomState();
    writeJsonFile(SPOTIFY_STATE_DATA, { state });

    const params = new URLSearchParams({
      response_type: "code",
      client_id: process.env.SPOTIFY_CLIENT_ID,
      scope: [
        "user-modify-playback-state",
        "user-read-playback-state",
        "user-read-currently-playing"
      ].join(" "),
      redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
      state
    });

    res.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`);
  } catch (err) {
    console.error("Spotify login error:", err);
    res.status(500).send("Spotify login failed");
  }
});

app.get("/spotify/callback", async (req, res) => {
  try {
    const code = String(req.query.code || "");
    const state = String(req.query.state || "");
    const saved = readJsonFile(SPOTIFY_STATE_DATA, { state: "" });

    if (!code || !state || state !== saved.state) {
      return res.status(400).send("Spotify auth state mismatch");
    }

    const body = new URLSearchParams();
    body.set("grant_type", "authorization_code");
    body.set("code", code);
    body.set("redirect_uri", process.env.SPOTIFY_REDIRECT_URI);

    const basic = Buffer.from(
      `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
    ).toString("base64");

    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: body.toString()
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Spotify token exchange failed: ${response.status} ${errText}`);
    }

    const data = await response.json();

    saveSpotifyAuth({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + ((data.expires_in || 3600) * 1000) - 60000
    });

    res.send("Spotify connected successfully. You can close this tab.");
  } catch (err) {
    console.error("Spotify callback error:", err);
    res.status(500).send("Spotify callback failed");
  }
});

app.get("/spotify/devices", async (req, res) => {
  try {
    const response = await spotifyApi("/me/player/devices");
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (err) {
    console.error("Spotify devices error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch Spotify devices" });
  }
});

app.post("/spotify/play/:mode", async (req, res) => {
  try {
    const mode = String(req.params.mode || "").toLowerCase();
    const playlistUri = getPlaylistUriForMode(mode);

    if (!playlistUri) {
      return res.status(400).json({ success: false, error: `Unknown mode: ${mode}` });
    }

    const deviceId = req.body?.device_id || req.query?.device_id || undefined;

    const pathname = deviceId
      ? `/me/player/play?device_id=${encodeURIComponent(deviceId)}`
      : "/me/player/play";

    const response = await spotifyApi(pathname, {
      method: "PUT",
      body: JSON.stringify({
        context_uri: playlistUri
      })
    });

    if (!response.ok && response.status !== 204) {
      const text = await response.text();
      return res.status(response.status).json({
        success: false,
        error: text || `Spotify play failed with ${response.status}`
      });
    }

    res.json({
      success: true,
      mode,
      playlist: playlistUri,
      device_id: deviceId || "active-device"
    });
  } catch (err) {
    console.error("Spotify play mode error:", err);
    res.status(500).json({ success: false, error: "Failed to switch Spotify playlist" });
  }
});

app.get("/spotify/current", async (req, res) => {
  try {
    const response = await spotifyApi("/me/player/currently-playing");
    if (response.status === 204) {
      return res.json({ is_playing: false });
    }

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (err) {
    console.error("Spotify current track error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch current Spotify track" });
  }
});

/* -------------------------
   SPOTIFY AUTO STATE
------------------------- */

app.get("/spotify/auto", (req, res) => {
  try {
    const data = readJsonFile(SPOTIFY_AUTO_DATA, {
      enabled: false,
      lastMode: ""
    });

    res.json({
      enabled: !!data.enabled,
      lastMode: String(data.lastMode || "")
    });
  } catch (err) {
    console.error("Spotify auto state load error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to load Spotify auto state"
    });
  }
});

app.post("/spotify/auto", (req, res) => {
  try {
    const enabled = !!req.body?.enabled;
    const lastMode = String(req.body?.lastMode || "");

    const updated = {
      enabled,
      lastMode
    };

    writeJsonFile(SPOTIFY_AUTO_DATA, updated);

    res.json({
      success: true,
      data: updated
    });
  } catch (err) {
    console.error("Spotify auto state save error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to save Spotify auto state"
    });
  }
});

/* -------------------------
   404
------------------------- */

app.use((req, res) => {
  res.status(404).send("Not found");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});