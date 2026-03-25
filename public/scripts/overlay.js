let lastPressure = null;
let latestWeather = null;
let rssContent = null;
let currentHabitEnergy = 3;

/* -------------------------
   HELPERS
------------------------- */

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function setHTML(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

async function loadHabitEnergy() {
  try {
    const res = await fetch("/data/aurora-habits.json?nocache=" + Date.now());
    if (!res.ok) throw new Error("Failed to fetch habit energy");

    const data = await res.json();

    if (typeof data.energy !== "undefined") {
      currentHabitEnergy = Number(data.energy) || 3;
    } else {
      currentHabitEnergy = 3;
    }

    if (latestWeather) {
      updateSpoonStatus(latestWeather);
    }
  } catch (err) {
    console.log("Habit energy fetch failed:", err);
    currentHabitEnergy = 3;
  }
}

/* -------------------------
   SPOONIE ENERGY
------------------------- */

function updateSpoonStatus(weather = {}) {
  const now = new Date();
  const hour = now.getHours();

  let energy = 8;
  let focus = 3;
  let pain = 1;
  let hydration = 4;

  const { temp = 0, humidity = 0, wind = 0, pressureTrend = 0 } = weather;

  /* WEATHER + PRESSURE EFFECTS */
  if (temp > 90) { energy -= 3; focus -= 1; hydration += 2; }
  if (temp < 20) { energy -= 2; pain += 1; }
  if (humidity > 80) { energy -= 2; pain += 1; }
  if (wind > 20) { pain += 1; }
  if (pressureTrend < -0.05) { pain += 2; energy -= 1; focus -= 1; }

  /* MOON EFFECTS */
  if (window.currentMoonPhase) {
    if (window.currentMoonPhase.includes("Full")) { energy -= 1; focus -= 1; }
    if (window.currentMoonPhase.includes("New")) { focus += 1; }
  }

  /* TIME OF DAY EFFECTS */
  if (hour > 21 || hour < 6) { energy -= 2; focus -= 1; }

  /* YOUR REAL SPOON ENERGY INPUT */
  if (currentHabitEnergy === 1) {
    energy -= 3;
    focus -= 1;
    pain += 1;
  } else if (currentHabitEnergy === 2) {
    energy -= 2;
    focus -= 1;
  } else if (currentHabitEnergy === 3) {
    /* neutral */
  } else if (currentHabitEnergy === 4) {
    energy += 1;
    focus += 1;
  } else if (currentHabitEnergy === 5) {
    energy += 2;
    focus += 1;
    pain -= 1;
  }

  energy = Math.max(1, Math.min(12, energy));
  focus = Math.max(1, Math.min(5, focus));
  pain = Math.max(1, Math.min(5, pain));
  hydration = Math.max(1, Math.min(6, hydration));

  const spoonEl = document.getElementById("spoons");
  if (spoonEl) {
    spoonEl.innerHTML =
      `🥄 Energy: ${"🥄".repeat(energy)}<br>` +
      `🧠 Focus: ${"🧠".repeat(focus)}<br>` +
      `🔥 Pain: ${"🔥".repeat(pain)}<br>` +
      `💧 Hydration: ${"💧".repeat(hydration)}<br>` +
      `✨ Self Check: ${"●".repeat(currentHabitEnergy)}${"○".repeat(5 - currentHabitEnergy)}`;
  }
}

/* -------------------------
   CLOCK
------------------------- */

function updateClock() {
  const now = new Date();
  setText("clock", now.toLocaleTimeString());
}

updateClock();
setInterval(updateClock, 1000);

/* -------------------------
   WEATHER
------------------------- */

async function loadWeather() {
  try {
    const res = await fetch("/weather");
    if (!res.ok) throw new Error("Failed to fetch weather");

    const data = await res.json();
    if (!data.observations || !data.observations.length) {
      console.log("No weather observations returned");
      return;
    }

    const obs = data.observations[0];
    const imperial = obs.imperial || {};

    const temp = Math.round(imperial.temp || 0);
    const feels = Math.round(imperial.heatIndex || imperial.windChill || temp);
    const humidity = obs.humidity || 0;
    const wind = Math.round(imperial.windSpeed || 0);
    const gust = Math.round(imperial.windGust || 0);
    const windDir = obs.winddir || 0;
    const pressure = imperial.pressure || 0;
    const rain = imperial.precipTotal || 0;

    let pressureTrend = 0;
    if (lastPressure !== null) {
      pressureTrend = pressure - lastPressure;
    }
    lastPressure = pressure;

    latestWeather = { temp, humidity, wind, pressureTrend };
    updateSpoonStatus(latestWeather);

    setText("temp", `${temp}°F`);
    setText("conditions", `Feels like ${feels}°`);
    setText("humidity", `Humidity: ${humidity}%`);
    setText("wind", `Wind: ${wind} mph (Gust ${gust})`);
    setText("pressure", `Pressure: ${pressure} in`);
    setText("rain", `Rain Today: ${rain} in`);
    setText("winddir", `Direction: ${windDir}°`);

    const alert = document.getElementById("stormAlert");
    if (alert) {
      if (pressureTrend < -0.08) {
        alert.textContent = "⚡ Rapid Pressure Drop — Storm Possible";
        alert.classList.add("active");
      } else {
        alert.classList.remove("active");
      }
    }
  } catch (err) {
    console.log("Weather fetch failed:", err);
    setText("temp", "--");
    setText("conditions", "Weather unavailable");
  }
}

loadWeather();
setInterval(loadWeather, 600000);
loadHabitEnergy();
setInterval(loadHabitEnergy, 60000);

/* -------------------------
   MOON PHASE
------------------------- */

function moonPhase(){

let lp=2551443;
let new_moon=new Date(1970,0,7,20,35,0);
let phase=((Date.now()-new_moon)/1000)%lp;
let percent=phase/lp;

if(percent<.03||percent>.97)return "🌑 New Moon";
if(percent<.22)return "🌒 Waxing Crescent";
if(percent<.28)return "🌓 First Quarter";
if(percent<.47)return "🌔 Waxing Gibbous";
if(percent<.53)return "🌕 Full Moon";
if(percent<.72)return "🌖 Waning Gibbous";
if(percent<.78)return "🌗 Last Quarter";

return "🌘 Waning Crescent";

}

document.getElementById("moon").innerText=moonPhase();

/* -------------------------
   HEBREW / COSMIC CALENDAR
------------------------- */

function loadHebrewSky() {
  try {
    const now = new Date();

    const hebrewDate = now.toLocaleDateString(
      "en-u-ca-hebrew",
      { day: "numeric", month: "long", year: "numeric" }
    );

    setText("hebrewMonth", `🕯 ${hebrewDate}`);

    let nextHoliday = "";
    if (hebrewDate.includes("Adar")) nextHoliday = "🎭 Purim season";
    else if (hebrewDate.includes("Nisan")) nextHoliday = "🕊 Passover season";
    else if (hebrewDate.includes("Tishri")) nextHoliday = "🍎 High Holy Days season";
    else if (hebrewDate.includes("Kislev")) nextHoliday = "🕎 Hanukkah season";

    setText("nextHoliday", nextHoliday || "✨ Quiet sacred skies");

    updateShabbatTimer();
  } catch (err) {
    console.log("Hebrew calendar load failed:", err);
    setText("hebrewMonth", "Hebrew sky unavailable");
    setText("shabbatTimer", "");
    setText("nextHoliday", "");
  }
}

function updateShabbatTimer() {
  const now = new Date();
  const day = now.getDay();

  let target = new Date(now);

  if (day < 5) {
    target.setDate(now.getDate() + (5 - day));
    target.setHours(18, 0, 0, 0);
  } else if (day === 5) {
    target.setHours(18, 0, 0, 0);
    if (now > target) {
      setText("shabbatTimer", "🕯 Shabbat has begun");
      return;
    }
  } else if (day === 6) {
    target.setHours(19, 30, 0, 0);
    if (now < target) {
      setText("shabbatTimer", "🌙 Shabbat ends tonight");
      return;
    } else {
      target.setDate(now.getDate() + 6);
      target.setHours(18, 0, 0, 0);
    }
  } else {
    target.setDate(now.getDate() + ((12 - day) % 7));
    target.setHours(18, 0, 0, 0);
  }

  const diff = target - now;
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);

  let text = "🕯 Shabbat in ";
  if (days > 0) text += `${days}d `;
  if (hours > 0 || days > 0) text += `${hours}h `;
  text += `${mins}m`;

  setText("shabbatTimer", text);
}

loadHebrewSky();
setInterval(loadHebrewSky, 3600000);
setInterval(updateShabbatTimer, 60000);

/* -------------------------
   AURORA FORECAST
------------------------- */

async function loadAurora() {
  try {
    const res = await fetch("/aurastream");
    if (!res.ok) throw new Error("Failed to fetch aurora");
    const data = await res.json();
    if (!data) return;

    const kp = Number(data.kp || 0);
    setText("aurora", `Aurora KP: ${kp}`);

    document.body.classList.remove("aurora-low", "aurora-mid", "aurora-high");

    if (kp >= 6) {
      document.body.classList.add("aurora-high");
    } else if (kp >= 4) {
      document.body.classList.add("aurora-mid");
    } else {
      document.body.classList.add("aurora-low");
    }
  } catch (err) {
    console.log("Aurora fetch failed:", err);
  }
}

loadAurora();
setInterval(loadAurora, 600000);

/* -------------------------
   METEOR SHOWER ALERTS
------------------------- */

async function loadMeteorShowers() {
  try {
    const today = new Date();

    const meteorShowers = [
      { name: "Quadrantids", peak: "01-03" },
      { name: "Lyrids", peak: "04-22" },
      { name: "Eta Aquariids", peak: "05-05" },
      { name: "Perseids", peak: "08-12" },
      { name: "Draconids", peak: "10-08" },
      { name: "Orionids", peak: "10-21" },
      { name: "Leonids", peak: "11-17" },
      { name: "Geminids", peak: "12-14" }
    ];

    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    const todayStr = `${month}-${day}`;

    let message = "";
    meteorShowers.forEach(shower => {
      if (shower.peak === todayStr) {
        message = `🌠 Meteor Peak: ${shower.name}`;
      }
    });

    const auroraEl = document.getElementById("aurora");
    if (message && auroraEl && !auroraEl.textContent.includes(message)) {
      auroraEl.textContent += ` • ${message}`;
    }
  } catch (err) {
    console.log("Meteor alert error:", err);
  }
}

loadMeteorShowers();
setInterval(loadMeteorShowers, 86400000);

/* -------------------------
   ISS TRACKER
------------------------- */

async function loadISS() {
  try {
    const url = "https://api.wheretheiss.at/v1/satellites/25544";
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch ISS");
    const data = await res.json();

    const lat = Number(data.latitude || 0).toFixed(2);
    const lon = Number(data.longitude || 0).toFixed(2);

    animateISS(Date.now() / 1000 + 240);

    const moonEl = document.getElementById("moon");
    if (!moonEl) return;

    const moonText = moonEl.innerText || "";
    const parts = moonText.split("•").map(p => p.trim());

    moonEl.innerHTML =
      `${parts[0] || "🌙 Moon"} • ${parts[1] || ""}<br>🛰 ISS: ${lat}°, ${lon}°`;
  } catch (err) {
    console.log("ISS tracker error:", err);
  }
}

loadISS();
setInterval(loadISS, 3600000);

/* -------------------------
   ISS SKY ANIMATION
------------------------- */

function animateISS(riseTime) {
  const cosmic = document.getElementById("cosmic");
  if (!cosmic) return;
  if (document.getElementById("issIcon")) return;

  const now = Date.now() / 1000;

  if (riseTime - now < 300) {
    let iss = document.createElement("div");
    iss.id = "issIcon";
    iss.textContent = "🛰";
    iss.style.position = "absolute";
    iss.style.top = "10px";
    iss.style.left = "-40px";
    iss.style.fontSize = "20px";
    iss.style.transition = "left 60s linear";
    cosmic.appendChild(iss);

    setTimeout(() => {
      iss.style.left = cosmic.offsetWidth + "px";
    }, 100);

    setTimeout(() => {
      iss.remove();
    }, 62000);
  }
}

/* -------------------------
   GOOGLE CALENDAR COUNTDOWN
------------------------- */

function formatCountdown(date) {
  const now = new Date();
  const diff = date - now;

  if (diff <= 0) return "now";

  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);

  let text = "";
  if (days > 0) text += `${days}d `;
  if (hours > 0 || days > 0) text += `${hours}h `;
  text += `${mins}m`;

  return text;
}

async function loadCalendar() {
  try {
    const res = await fetch("/calendar");
    if (!res.ok) throw new Error("Failed to fetch calendar");

    const events = await res.json();
    let output = "";

    events.forEach(ev => {
      const date = new Date(ev.start);

      output += `
  <div class="calendar-event">
    <div class="event-name">✨ ${ev.title}</div>
    <div class="event-countdown">${formatCountdown(date)}</div>
  </div>
`;
    });

    if (!events.length) {
      output = "No upcoming missions";
    }

    setHTML("calendarPanel", output);

  } catch (err) {
    console.log("Calendar fetch failed:", err);
    setText("calendarPanel", "Celestial calendar offline");
  }
}

loadCalendar();
setInterval(loadCalendar, 600000);

/* -------------------------
   COSMIC ALERTS
------------------------- */

function getSpaceAlerts() {
  const alerts = [];
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDate();

  if (day === 14 || day === 15) {
    alerts.push("🌕 Full Moon energy peak tonight");
  }

  if (hour >= 22 || hour <= 4) {
    alerts.push("☄️ Best meteor visibility happening now");
  }

  if (Math.random() > 0.7) {
    alerts.push("🛰 Possible ISS flyover in your region tonight");
  }

  if (Math.random() > 0.8) {
    alerts.push("🌌 Aurora visibility possible at northern latitudes");
  }

  return alerts;
}

function cleanHeadline(text) {
  return String(text || "")
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeRssTitle(item) {
  if (!item) return "";

  if (typeof item.title === "string") {
    return cleanHeadline(item.title);
  }

  if (item.title && typeof item.title._ === "string") {
    return cleanHeadline(item.title._);
  }

  if (typeof item["atom:title"] === "string") {
    return cleanHeadline(item["atom:title"]);
  }

  if (item.title && typeof item.title === "object") {
    if (typeof item.title["#text"] === "string") {
      return cleanHeadline(item.title["#text"]);
    }
  }

  return "";
}

async function getSpaceWeatherAlerts() {
  try {
    const res = await fetch("/spaceweather");
    if (!res.ok) throw new Error("Failed to fetch space weather alerts");

    const items = await res.json();

    return items
      .map(item => cleanHeadline(item.title))
      .filter(Boolean)
      .slice(0, 5);

  } catch (err) {
    console.log("Space weather alerts failed:", err);
    return [];
  }
}

/* -------------------------
   RSS / HEADLINES
------------------------- */

const feeds = [
  "https://www.nasa.gov/rss/dyn/breaking_news.rss",
  "https://scatterstardust.com/feed/",
  "https://www.minnpost.com/feed/",
  "https://www.mprnews.org/topic/all-news/rss",
  "https://media.rss.com/status-coup-news/feed.xml",
  "https://feeds.npr.org/1002/rss.xml",
  "https://auroramoontarot.substack.com/feed",
  "https://danelah.substack.com/feed",
  "https://thedonlemonshow.substack.com/feed",
  "https://jollygoodginger.substack.com/feed"
];

async function fetchFeed(feed) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(`/rss?url=${encodeURIComponent(feed)}`, {
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!res.ok) throw new Error(`RSS route failed for ${feed}`);

    const items = await res.json();

    return items
      .map(normalizeRssTitle)
      .filter(Boolean)
      .filter(title => title.length > 8);
  } catch (err) {
    console.log("Feed failed completely:", feed, err);
    return [];
  }
}

async function loadHeadlines() {
  if (!rssContent) return;

  let seen = new Set();
  let headlines = [];

  const results = await Promise.allSettled(feeds.map(fetchFeed));

  results.forEach(result => {
    if (result.status === "fulfilled") {
      result.value.forEach(title => {
        const cleaned = cleanHeadline(title);

        if (!cleaned) return;
        if (seen.has(cleaned)) return;

        seen.add(cleaned);
        headlines.push(cleaned);
      });
    }
  });

  headlines.sort(() => Math.random() - 0.5);
  headlines = headlines.slice(0, 25);

  const cosmicAlerts = getSpaceAlerts();
  const spaceWeather = await getSpaceWeatherAlerts();

  let tickerHTML = "";

  spaceWeather.forEach(alert => {
    const cleaned = cleanHeadline(alert);

    if (cleaned.includes("Electron 2MeV Integral Flux")) return;
    if (cleaned.includes("Electron 2 MeV Integral Flux")) return;

    tickerHTML += `<span>☀️ ${cleaned}</span>`;
  });

  cosmicAlerts.forEach(alert => {
    tickerHTML += `<span>🚨 ${cleanHeadline(alert)}</span>`;
  });

  headlines.forEach(h => {
    tickerHTML += `<span>🛰️ ${cleanHeadline(h)}</span>`;
  });

  if (!tickerHTML) {
    tickerHTML = `<span>✨ Cosmic transmissions temporarily quiet...</span>`;
  }

  rssContent.innerHTML = tickerHTML + tickerHTML;
}

window.addEventListener("DOMContentLoaded", () => {
  rssContent = document.getElementById("rss-content");

  if (rssContent) {
    rssContent.innerHTML = "<span>✨ Gathering cosmic signals...</span>";
    loadHeadlines();
  }
});

setInterval(() => {
  if (rssContent) loadHeadlines();
}, 1200000);

/* -------------------------
   METEORS / STARDUST
------------------------- */

function meteorLoop() {
  const meteor = document.createElement("div");
  meteor.className = "shooting-star";

  meteor.style.left = Math.random() * window.innerWidth + "px";
  meteor.style.top = Math.random() * window.innerHeight * 0.3 + "px";

  document.body.appendChild(meteor);

  setTimeout(() => meteor.remove(), 1500);
  setTimeout(meteorLoop, 5000 + Math.random() * 8000);
}

function stardustLoop() {
  const dust = document.createElement("div");
  dust.className = "stardust";

  dust.style.left = Math.random() * window.innerWidth + "px";
  dust.style.top = Math.random() * window.innerHeight + "px";

  document.body.appendChild(dust);

  setTimeout(() => dust.remove(), 20000);
  setTimeout(stardustLoop, 4000 + Math.random() * 4000);
}

meteorLoop();
stardustLoop();