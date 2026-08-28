const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");
const SunCalc = require("suncalc");


/* -------------------------
   FILE PATHS
------------------------- */

const OBSERVATORY_DATA = path.join(
    __dirname,
    "..",
    "public",
    "data",
    "observatory.json"
);



/* -------------------------
   LOCATION
   Update if needed
------------------------- */

const LOCATION = {
    lat: 44.948,
    lon: -93.348
};



/* -------------------------
   HELPERS
------------------------- */

function extractEmoji(title = "") {

    const match = title.match(/^\S+/);

    return match ? match[0] : "✨";

}



function formatTimeDifference(target){

    const now = new Date();

    const diff = new Date(target) - now;

    const minutes = Math.floor(diff / 60000);


    if(minutes <= 0){
        return "now";
    }


    if(minutes < 60){
        return `${minutes}m`;
    }


    const hours = Math.floor(minutes / 60);

    const remaining = minutes % 60;


    if(remaining === 0){
        return `${hours}h`;
    }


    return `${hours}h ${remaining}m`;

}



function getMoonPhaseName(phase){

    if(phase < 0.03 || phase > 0.97)
        return "New Moon";

    if(phase < 0.22)
        return "Waxing Crescent";

    if(phase < 0.28)
        return "First Quarter";

    if(phase < 0.47)
        return "Waxing Gibbous";

    if(phase < 0.53)
        return "Full Moon";

    if(phase < 0.72)
        return "Waning Gibbous";

    if(phase < 0.78)
        return "Last Quarter";

    return "Waning Crescent";

}



function getSkyMode(now, sun){

    if(now >= sun.dawn && now < sun.sunrise){
        return "dawn";
    }

    if(now >= sun.sunrise && now < sun.sunset){
        return "day";
    }

    if(now >= sun.sunset && now < sun.dusk){
        return "dusk";
    }

    return "night";

}



/* -------------------------
   CALENDAR OBSERVATORY
------------------------- */

async function getCalendarState(){

    const response = await fetch(
        "http://localhost:3000/calendar"
    );


    const events = await response.json();


    const now = new Date();


    const current = events.find(event => {

        const start =
            new Date(event.start).getTime();

        const end =
            new Date(event.end).getTime();


        return (
            now.getTime() >= start &&
            now.getTime() <= end
        );

    });



    const next = events
        .filter(event => {

            return new Date(event.start) > now;

        })
        .sort((a,b)=>{

            return (
                new Date(a.start) -
                new Date(b.start)
            );

        })[0];



    return {

        current: current ? {

            emoji:
                extractEmoji(current.title),

            title:
                current.title.replace(/^\S+\s*/, ""),

            subtitle:
                `Ends in ${formatTimeDifference(current.end)}`

        } : {

            emoji:"🌙",

            title:"Quiet Orbit",

            subtitle:"No active event"

        },


        next: next ? {

            emoji:
                extractEmoji(next.title),

            title:
                next.title.replace(/^\S+\s*/, ""),

            subtitle:
                `Begins in ${formatTimeDifference(next.start)}`

        } : {

            emoji:"✨",

            title:"Clear Skies",

            subtitle:"No more scheduled events"

        }

    };

}



/* -------------------------
   CELESTIAL OBSERVATORY
------------------------- */

function getSkyState(){

    const now = new Date();


    const sun = SunCalc.getTimes(
        now,
        LOCATION.lat,
        LOCATION.lon
    );


    const moon =
        SunCalc.getMoonIllumination(now);


    const moonPosition =
        SunCalc.getMoonPosition(
            now,
            LOCATION.lat,
            LOCATION.lon
        );


    const moonTimes =
        SunCalc.getMoonTimes(
            now,
            LOCATION.lat,
            LOCATION.lon
        );



    return {

        sky: {

            mode:
                getSkyMode(now, sun),

            isGoldenHour:
                now >= sun.goldenHour &&
                now <= sun.goldenHourEnd,


            isBlueHour:
                now >= sun.dusk &&
                now <= sun.night,


            isTwilight:
                now >= sun.dawn &&
                now <= sun.dusk

        },


        sun: {

            sunrise:
                sun.sunrise,

            sunset:
                sun.sunset,

            solarNoon:
                sun.solarNoon,

            dawn:
                sun.dawn,

            dusk:
                sun.dusk,

            goldenHour:
                sun.goldenHour,

            goldenHourEnd:
                sun.goldenHourEnd

        },


        moon: {

            phase:
                getMoonPhaseName(moon.phase),

            illumination:
                Math.round(
                    moon.fraction * 100
                ),

            visible:
                moonPosition.altitude > 0,

            altitude:
                moonPosition.altitude,

            rise:
                moonTimes.rise || null,

            set:
                moonTimes.set || null

        },


        magic: {

            auroraChance: 0,

            meteorShower:false,

            specialEvent:null

        }

    };

}



/* -------------------------
   MAIN OBSERVATORY
------------------------- */

async function getObservatory(){

    let calendar;

try {
    calendar = await getCalendarState();
} catch (err) {
    console.error("Calendar Observatory failed:", err.message);

    calendar = {
        current: {
            emoji: "🌙",
            title: "Quiet Orbit",
            subtitle: "Calendar unavailable"
        },
        next: {
            emoji: "✨",
            title: "Clear Skies",
            subtitle: "No upcoming event"
        }
    };
}


    const celestial =
        getSkyState();


    const observatory = {

        updated:
            new Date().toISOString(),


        calendar,

        ...celestial

    };



    fs.writeFileSync(
        OBSERVATORY_DATA,
        JSON.stringify(
            observatory,
            null,
            2
        )
    );



    return observatory;

}



module.exports = {
    getObservatory
};