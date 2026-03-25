// Handle all data fetching and dynamic updates for your app
document.addEventListener("DOMContentLoaded", () => {
  // Fetch Weather Data
  async function loadWeather() {
    try {
      const response = await fetch("/weather");
      const data = await response.json();
      const obs = data.observations[0];
      
      if (obs) {
        const temp = Math.round(obs.imperial.temp);
        const wind = Math.round(obs.imperial.windSpeed);
        const humidity = obs.humidity;

        document.getElementById("cosmicWeather").innerHTML = `
          🌡 ${temp}°F  
          💧 ${humidity}%  
          🌬 ${wind} mph
        `;
      } else {
        document.getElementById("cosmicWeather").innerText = "Weather data unavailable";
      }
    } catch (err) {
      console.error("Weather fetch failed:", err);
      document.getElementById("cosmicWeather").innerText = "Observatory offline";
    }
  }

  loadWeather();
  setInterval(loadWeather, 600000); // Update every 10 minutes

  // Fetch Aurora Moon Stats (or world stats)
  async function loadWorldStats() {
    try {
      const response = await fetch("/data/aurora-moon-data.json");
      const data = await response.json();

      document.getElementById("worldStats").innerHTML = `
        🐾 Pokémon caught: ${data.pokemon_caught}<br>
        🌀 PokéStops spun: ${data.pokestops_spun}<br>
        ⚔️ Raids won: ${data.raids_won}<br>
        🥚 Eggs hatched: ${data.eggs_hatched}<br><br>

        📦 Packs opened: ${data.packs_opened}<br>
        ✨ Rare cards: ${data.rare_cards}<br>
        ⭐ EX cards: ${data.ex_cards}<br><br>

        🌿 Park cleanups: ${data.park_cleanups}<br>
        🚰 Hydrants cleared: ${data.hydrant_clear}<br>
        🌀 Drains cleared: ${data.drain_clear}<br>
        🗑 Trash bags collected: ${data.trash_bags}<br>
        🕊 Lifebirds seen: ${data.lifebirds}
      `;
    } catch (err) {
      document.getElementById("worldStats").innerText = "World telemetry offline";
    }
  }

  loadWorldStats();
  setInterval(loadWorldStats, 30000); // Update every 30 seconds

  // Fetch Habit Data (habits.json)
  async function loadHabits() {
    try {
      const response = await fetch("/data/habits.json");
      const data = await response.json();

      document.getElementById("habitsStats").innerHTML = `
        🧹 Park Cleanups: ${data.park_cleanups}<br>
        🚰 Hydrants Cleared: ${data.hydrant_clear}<br>
        🗑 Trash Bags Collected: ${data.trash_bags}<br>
        💪 Volunteer Hours: ${data.volunteer_hours}
      `;
    } catch (err) {
      console.error("Habits fetch failed:", err);
      document.getElementById("habitsStats").innerText = "Habit data unavailable";
    }
  }

  loadHabits();
  setInterval(loadHabits, 60000); // Update every 60 seconds

  // Date setup
  let now = new Date();
  document.getElementById("date").innerText = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  // Handle dynamic mission update
  const source = new EventSource("/taskstream");
  source.onmessage = (event) => {
    const data = JSON.parse(event.data);
    const task = data.task;
    const text = document.getElementById("taskText");
    const complete = document.getElementById("completeText");

    // Handle task completion animation
    if (task === "✨ All missions complete ✨") {
      complete.classList.remove("showComplete");
      void complete.offsetWidth; // Reset animation
      complete.classList.add("showComplete");

      setTimeout(() => {
        complete.classList.remove("showComplete");
      }, 2000);
    }

    // Update task text
    text.textContent = task;
  };

  // Build Timeline for the Day
  function buildTimeline() {
    const timeline = document.getElementById("timeline");
    let start = 8;
    let end = 22;

    for (let h = start; h <= end; h++) {
      for (let m = 0; m < 60; m += 30) {
        if (h === 22 && m > 0) break;

        let hour = h > 12 ? h - 12 : h;
        let ampm = h >= 12 ? "PM" : "AM";

        let label = `${hour}:${m === 0 ? "00" : "30"} ${ampm}`;
        let id = `t_${h}_${m}`;

        let saved = localStorage.getItem(id) || "";

        let row = document.createElement("div");

        row.innerHTML = `
          <div class="timeLabel">${label}</div>
          <input class="timeInput" id="${id}" value="${saved}">
        `;

        timeline.appendChild(row);

        setTimeout(() => {
          let input = document.getElementById(id);
          input.addEventListener("input", () => {
            localStorage.setItem(id, input.value);
          });
        }, 0);
      }
    }
  }

  buildTimeline();

  // Highlight current time slot
  function highlightCurrentSlot() {
    let now = new Date();
    let h = now.getHours();
    let m = now.getMinutes() < 30 ? 0 : 30;
    let id = `t_${h}_${m}`;
    let el = document.getElementById(id);
    if (el) {
      el.classList.add("nowSlot");
    }
  }

  setTimeout(highlightCurrentSlot, 300);
});