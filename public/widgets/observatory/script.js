/* ============================================================
   🌙 AURORA MOON HAVEN — OBSERVATORY
   ============================================================ */


/* -------------------------
   CURRENT ORBIT ROTATION
------------------------- */

let currentOrbitIndex = 0;

let currentOrbitTimer = null;

let currentOrbitEvents = [];



function showCurrentOrbit(){

    if(
        !Array.isArray(currentOrbitEvents) ||
        !currentOrbitEvents.length
    ){

        return;

    }


    if(
        currentOrbitIndex >=
        currentOrbitEvents.length
    ){

        currentOrbitIndex = 0;

    }


    const event =
        currentOrbitEvents[currentOrbitIndex];


    document.getElementById(
        "currentEmoji"
    ).textContent =
        event.emoji || "🌙";


    document.getElementById(
        "currentTitle"
    ).textContent =
        event.title || "Quiet Orbit";


    document.getElementById(
        "currentSubtitle"
    ).textContent =
        event.subtitle || "";

}



function displayCurrentOrbit(events){

    /* -------------------------
       BACKWARDS COMPATIBILITY

       If the server ever sends a
       single object instead of an
       array, turn it into an array.
    ------------------------- */

    if(!Array.isArray(events)){

        events = events
            ? [events]
            : [];

    }



    if(!events.length){

        events = [

            {
                emoji: "🌙",
                title: "Quiet Orbit",
                subtitle: "No active event"
            }

        ];

    }



    currentOrbitEvents = events;


    if(
        currentOrbitIndex >=
        currentOrbitEvents.length
    ){

        currentOrbitIndex = 0;

    }



    showCurrentOrbit();



    /* -------------------------
       CLEAR OLD ROTATION TIMER
    ------------------------- */

    if(currentOrbitTimer){

        clearInterval(
            currentOrbitTimer
        );

        currentOrbitTimer = null;

    }



    /* -------------------------
       ROTATE ONLY WHEN MULTIPLE
       EVENTS ARE ACTIVE
    ------------------------- */

    if(
        currentOrbitEvents.length > 1
    ){

        currentOrbitTimer =
            setInterval(() => {

                currentOrbitIndex =
                    (
                        currentOrbitIndex + 1
                    ) %
                    currentOrbitEvents.length;


                showCurrentOrbit();

            }, 8000);

    }

}



/* -------------------------
   LOAD OBSERVATORY
------------------------- */

async function loadObservatory(){


    try {


        const response = await fetch(
            "/observatory?nocache=" +
            Date.now()
        );


        if(!response.ok){

            throw new Error(
                "Observatory unavailable"
            );

        }


        const data =
            await response.json();



        const calendar =
            data.calendar || {

                current: [

                    {
                        emoji: "🌙",
                        title: "Quiet Orbit",
                        subtitle: "No active event"
                    }

                ],

                next: {
                    emoji: "✨",
                    title: "Clear Skies",
                    subtitle: "No upcoming event"
                }

            };



        /* -------------------------
           CURRENT ORBIT
        ------------------------- */

        displayCurrentOrbit(
            calendar.current
        );



        /* -------------------------
           NEXT CONSTELLATION
        ------------------------- */

        const next =
            calendar.next || {

                emoji: "✨",
                title: "Clear Skies",
                subtitle: "No upcoming event"

            };


        document.getElementById(
            "nextEmoji"
        ).textContent =
            next.emoji || "✨";


        document.getElementById(
            "nextTitle"
        ).textContent =
            next.title ||
            "Clear Skies";


        document.getElementById(
            "nextSubtitle"
        ).textContent =
            next.subtitle ||
            "No upcoming event";


    }


    catch(error){


        console.error(
            "Observatory error:",
            error
        );


        displayCurrentOrbit([

            {
                emoji: "🌙",
                title: "Signal Lost",
                subtitle: "Observatory unavailable"
            }

        ]);


        document.getElementById(
            "nextEmoji"
        ).textContent =
            "✨";


        document.getElementById(
            "nextTitle"
        ).textContent =
            "Awaiting Orbit";


        document.getElementById(
            "nextSubtitle"
        ).textContent =
            "Trying again soon";


    }


}



/* -------------------------
   INITIAL LOAD
------------------------- */

loadObservatory();



/* -------------------------
   REFRESH CALENDAR
   Every 60 seconds
------------------------- */

setInterval(
    loadObservatory,
    60000
);



/* ============================================================
   🌡️ OBSERVATORY TEMPERATURE
   ============================================================ */

async function updateObservatoryTemp() {


    try {


        const response = await fetch(
            "/weather?nocache=" +
            Date.now()
        );


        if(!response.ok){

            throw new Error(
                "Weather unavailable"
            );

        }


        const weather =
            await response.json();


        let tempF = null;

        let tempC = null;



        /* -------------------------
           WEATHER UNDERGROUND /
           OBSERVATION FORMAT
        ------------------------- */

        if(
            weather?.observations?.[0]
        ) {


            const obs =
                weather.observations[0];


            tempF =
                obs?.imperial?.temp ??
                null;


            tempC =
                obs?.metric?.temp ??
                null;



        /* -------------------------
           FALLBACK WEATHER FORMAT
        ------------------------- */

        } else if(
            weather?.current
        ) {


            tempF =
                weather.current.temp ??
                null;

        }



        /* -------------------------
           CALCULATE CELSIUS
           IF NEEDED
        ------------------------- */

        if(
            tempF !== null &&
            tempC === null
        ) {


            tempC =
                Math.round(
                    (tempF - 32) *
                    5 / 9
                );

        }



        console.log(
            "Observatory temp:",
            tempF,
            tempC
        );



        /* -------------------------
           DISPLAY
        ------------------------- */

        const tempElement =
            document.getElementById(
                "observatoryTemp"
            );


        if(
            tempF !== null
        ) {


            tempElement.textContent =
                `${Math.round(tempF)}°F • ${Math.round(tempC)}°C`;


        } else {


            tempElement.textContent =
                "--°F • --°C";

        }


    }


    catch(error) {


        console.error(
            "Observatory temp error:",
            error
        );


        document.getElementById(
            "observatoryTemp"
        ).textContent =
            "--°F • --°C";

    }

}



/* -------------------------
   INITIAL WEATHER LOAD
------------------------- */

updateObservatoryTemp();



/* -------------------------
   REFRESH WEATHER
   Every 5 minutes
------------------------- */

setInterval(
    updateObservatoryTemp,
    300000
);