// relationshipMessages.js

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ----------------------
// 💜 BOO BREAK
// ----------------------
const booMessages = [
  "💜 Boo break activated... Jacob has stolen the streamer for a cozy cosmic reset 🌙",
  "🌙 Boo break in progress... Moonbeam energy is temporarily offline for love purposes ✨",
  "💫 Stardust pause initiated... Jacob and Aurora have entered soft mode 💜",
  "👻 BOO BREAK: The universe has scheduled a cuddle break. Please stand by 🌌",
  "💜 Cosmo reports: streamer has been gently relocated for emotional maintenance ✨",
  "🌙 Aurora is currently in a sanctioned Boo Break™. Stardust levels stabilizing...",
  "💫 Love detour detected. Stream temporarily powered by hugs 💜",
  "👻 Moonbeams, your streamer is currently in a romantic subroutine 🌙"
];

function boo() {
  return randomItem(booMessages);
}

// ----------------------
// 🌙 BACK FROM BOO BREAK
// ----------------------
const backMessages = [
  "✨ BOO BREAK COMPLETE ✨ Aurora has returned to the Moonbeams 💜 Stardust operations resumed 🌙",
  "🌙 RETURN TO OBSERVATORY 🌙 Status: ONLINE | Boo Level: SATISFIED 💕 Thanks for keeping the cosmos stable ✨",
  "💜 BACK FROM BOO BREAK 💜 Jacob has released the streamer back into the wild 🌙",
  "✨ Cosmic reconnection complete. The Boo Break has ended safely 💜",
  "🌙 Transmission restored. Love mode still slightly active 💫",
  "💜 The streamer has returned from cuddle orbit. All systems nominal ✨"
];

function back() {
  return randomItem(backMessages);
}

// ----------------------
// 💫 DATE COMMAND
// ----------------------
const dateMessages = [
  "💫 Cosmic date night initiated... candles replaced with starlight 🌙",
  "🌙 It’s a date. The universe has cleared your schedule ✨",
  "💜 Somewhere between stars and silence, a date is happening...",
  "✨ Romantic subsystem online: engaged 💫",
  "🌌 Tonight’s forecast: 100% chance of soft feelings 💜"
];

function date() {
  return randomItem(dateMessages);
}

// ----------------------
// 🚢 SHIP COMMAND
// ----------------------
const shipMessages = [
  "🚢 The stars have checked compatibility... results: dangerously aligned 💜",
  "🌙 Cosmic ship detected. Hull integrity: strong, vibes: stronger ✨",
  "💫 Astrological verdict: you two are literally a constellation together",
  "🚢 Relationship engine engaged... stardust fusion imminent 💜",
  "🌌 The universe has approved this ship. No appeals accepted."
];

function ship() {
  return randomItem(shipMessages);
}

// ----------------------
// 💋 KISS COMMAND
// ----------------------
const kissMessages = [
  "💋 Stardust kiss delivered directly from the cosmic stacks 💜",
  "🌙 A soft kiss floats through the void and lands perfectly ✨",
  "💫 Cosmo approved: kiss successfully transmitted 💋",
  "💜 One (1) gentle kiss has been deposited into your timeline",
  "🌌 The stars briefly pause to witness this kiss ✨"
];

function kiss() {
  return randomItem(kissMessages);
}

// ----------------------
// EXPORTS
// ----------------------
module.exports = {
  boo,
  back,
  date,
  ship,
  kiss
};