require("dotenv").config();

const express = require("express");
const path = require("path");
const fs = require("fs");
const fetch = require("node-fetch");
const xml2js = require("xml2js");
const ical = require("node-ical");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

/* -------------------------
   FILE PATHS
------------------------- */

const DATA_DIR = path.join(__dirname, "public", "data");

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

const tmi = require("tmi.js");

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

client.on("message", (channel, tags, message, self) => {
  if (self) return;
});

client.on("reconnect", () => {
  console.log("🔄 Astrea reconnecting...");
});

client.on("error", (err) => {
  console.error("TMI error:", err);
});

/* -------------------------
   WEATHER
------------------------- */

app.get("/weather", async (req, res) => {
  try {
    const WEATHER_API_KEY = process.env.WU_API_KEY;

    if (!WEATHER_API_KEY) {
      return res.status(500).json({ error: "Missing WU_API_KEY in .env" });
    }

    const weatherStation =
      `https://api.weather.com/v2/pws/observations/current?stationId=KMNSTLOU35&format=json&units=e&apiKey=${WEATHER_API_KEY}`;

    const response = await fetch(weatherStation);

    if (!response.ok) {
      throw new Error(`Weather HTTP ${response.status}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("Weather fetch error:", err);
    res.status(500).json({ error: "Weather fetch failed" });
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
   404
------------------------- */

app.use((req, res) => {
  res.status(404).send("Not found");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});