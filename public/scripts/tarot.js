const tarotDeck = [
  { card: "The Fool", meaning: "new beginnings" },
  { card: "The Magician", meaning: "manifestation, power" },
  { card: "The High Priestess", meaning: "intuition, mystery" },
  { card: "The Empress", meaning: "creation, nurturing" },
  { card: "The Emperor", meaning: "authority, structure" },
  { card: "The Hierophant", meaning: "tradition, wisdom" },
  { card: "The Lovers", meaning: "union, choices" },
  { card: "The Chariot", meaning: "determination, victory" },
  { card: "Strength", meaning: "courage, patience" },
  { card: "The Hermit", meaning: "reflection, solitude" },
  { card: "Wheel of Fortune", meaning: "cycles, fate" },
  { card: "Justice", meaning: "balance, truth" },
  { card: "The Hanged Man", meaning: "perspective, surrender" },
  { card: "Death", meaning: "transformation" },
  { card: "Temperance", meaning: "balance, harmony" },
  { card: "The Devil", meaning: "attachment, temptation" },
  { card: "The Tower", meaning: "sudden change" },
  { card: "The Star", meaning: "hope, renewal" },
  { card: "The Moon", meaning: "intuition, illusion" },
  { card: "The Sun", meaning: "joy, vitality" },
  { card: "Judgement", meaning: "awakening" },
  { card: "The World", meaning: "completion, fulfillment" }
];

function normalizeTarotFilename(cardName) {
  return cardName
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9 ]/g, "")
    .trim()
    .replace(/\s+/g, "-") + ".png";
}

function getDailyTarot() {
  const today = new Date().toISOString().slice(0, 10);
  let seed = 0;

  for (let i = 0; i < today.length; i++) {
    seed += today.charCodeAt(i);
  }

  return tarotDeck[seed % tarotDeck.length];
}

function getRandomTarot() {
  return tarotDeck[Math.floor(Math.random() * tarotDeck.length)];
}

function displayTarot(useRandom = false) {
  const card = useRandom ? getRandomTarot() : getDailyTarot();

  const tarotCardEl = document.getElementById("tarotCard");
  const tarotMeaningEl = document.getElementById("tarotMeaning");
  const kodaReactionEl = document.getElementById("kodaReaction");

  const imageFile = normalizeTarotFilename(card.card);
  const imagePath = `/media/tarot/${imageFile}`;

  if (tarotCardEl) {
    tarotCardEl.innerHTML = `
      <img
        src="${imagePath}"
        alt="${card.card}"
        onerror="this.style.display='none'"
      >
      <div class="tarot-card-name">${card.card}</div>
    `;
  }

  if (tarotMeaningEl) {
    tarotMeaningEl.textContent = card.meaning;
  }

  if (kodaReactionEl) {
    kodaReactionEl.innerHTML = getKodaReaction(card.card);
  }
}

function getKodaReaction(cardName) {
  const reactions = {
    "The Fool": "Adventure time.",
    "The Magician": `<img class="koda-image" src="images/koda-travel.png"> says: You’ve got the magic today.`,
    "The High Priestess": `<img class="koda-image" src="images/koda-travel.png"> says: Trust the quiet knowing.`,
    "The Empress": `<img class="koda-image" src="images/koda-travel.png"> says: Softness is strength too.`,
    "The Emperor": `<img class="koda-image" src="images/koda-travel.png"> says: Build it steady.`,
    "The Hierophant": `<img class="koda-image" src="images/koda-travel.png"> says: Wisdom is circling close.`,
    "The Lovers": `<img class="koda-image" src="images/koda-travel.png"> says: Follow what feels aligned.`,
    "The Chariot": `<img class="koda-image" src="images/koda-travel.png"> says: Forward, Moonbeam.`,
    "Strength": `<img class="koda-image" src="images/koda-travel.png"> says: Gentle courage counts.`,
    "The Hermit": `<img class="koda-image" src="images/koda-travel.png"> says: Cozy reflection day.`,
    "Wheel of Fortune": `<img class="koda-image" src="images/koda-travel.png"> says: The skies are shifting.`,
    "Justice": `<img class="koda-image" src="images/koda-travel.png"> says: Truth has a clear tone.`,
    "The Hanged Man": `<img class="koda-image" src="images/koda-travel.png"> says: Pause. Look again.`,
    "Death": `<img class="koda-image" src="images/koda-travel.png"> says: Transformation is sacred.`,
    "Temperance": `<img class="koda-image" src="images/koda-travel.png"> says: Balance, sip by sip.`,
    "The Devil": `<img class="koda-image" src="images/koda-travel.png"> says: Unhook what drains you.`,
    "The Tower": `<img class="koda-image" src="images/koda-travel.png"> says: Big shifts, brighter path.`,
    "The Star": `<img class="koda-image" src="images/koda-travel.png"> says: Hope is glowing.`,
    "The Moon": `<img class="koda-image" src="images/koda-travel.png"> says: Mystery is part of the magic.`,
    "The Sun": `<img class="koda-image" src="images/koda-travel.png"> says: Golden energy today.`,
    "Judgement": `<img class="koda-image" src="images/koda-travel.png"> says: Wake up to your own light.`,
    "The World": `<img class="koda-image" src="images/koda-travel.png"> says: You made it full circle.`
  };

  return reactions[cardName] || `<img class="koda-image" src="images/koda-travel.png"> says: Koda is sniffing cosmic possibilities.`;
}

/* Make functions available globally if you want to use them elsewhere */
window.getDailyTarot = getDailyTarot;
window.getRandomTarot = getRandomTarot;
window.displayTarot = displayTarot;

window.addEventListener("DOMContentLoaded", () => {
  displayTarot(false);
});