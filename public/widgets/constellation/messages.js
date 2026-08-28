/* ===================================
   PROJECT CONSTELLATION
   Message Library
   Aurora Moon Tarot Stream Widget
=================================== */


constellationMessages = {

    follow: [

        "✨ A new star has entered the constellation.",

        "🌙 A new light has appeared in the night sky.",

        "⭐ The constellation grows brighter with a new arrival.",

        "💜 A new Moonbeam has found their way to Aurora Moon Haven."

    ],


    subscriber: [

        "🌌 A new star has chosen a place among the constellations.",

        "💜 A little more magic has been added to the galaxy.",

        "✨ The constellation shines a little brighter tonight."

    ],


    resub: [

        "🌙 A familiar star returns to the constellation.",

        "✨ The signal reconnects and the stars glow warmly.",

        "💜 Another orbit around the moon together."

    ],


    raid: [

        "🌌 Travelers have arrived from another galaxy.",

        "✨ A cosmic wave has reached Aurora Moon Haven.",

        "🌙 New visitors have entered the observatory."

    ],


    cheer: [

        "✨ A little sparkle traveled across the stars.",

        "🌙 The constellation glows a little brighter."

    ],


    gift: [

        "💜 A gift of stardust has appeared in the constellation.",

        "✨ Extra moonlight has been shared among the stars."

    ],


    star: [

        "⭐ A tiny win has become a new star in the sky.",

        "✨ A new memory sparkles in the constellation.",

        "🌙 Another little light has joined the story."

    ]

};



/*
    Picks a random message from a category
*/

function getConstellationMessage(type) {

    const messages =
        constellationMessages[type];


    if (!messages || messages.length === 0) {

        return "✨ A new signal has appeared in the constellation.";

    }


    return messages[
        Math.floor(
            Math.random() * messages.length
        )
    ];

}