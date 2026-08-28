// relationship.js

function getRelationshipDays() {
    const startDate = new Date("2024-03-15"); // <-- your real date
    const now = new Date();

    const diff = now - startDate;

    return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function getShipLevel(days) {
    if (days < 30) return "New Moon 🌑";
    if (days < 100) return "Crescent 🌒";
    if (days < 365) return "Half Moon 🌓";
    return "Full Moon 🌕";
}

function getLoveRating(days) {
    return Math.min(5, Math.floor(days / 200) + 3); // playful scaling
}

module.exports = {
    getRelationshipDays,
    getShipLevel,
    getLoveRating
};