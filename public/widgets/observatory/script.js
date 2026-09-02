async function loadObservatory(){


    try {


        const response = await fetch(
            "/observatory?nocache=" + Date.now()
        );


        if(!response.ok){

            throw new Error("Observatory unavailable");

        }


        const data = await response.json();



        const calendar = data.calendar || {
    current: {
        emoji: "🌙",
        title: "Quiet Orbit",
        subtitle: "No active event"
    },
    next: {
        emoji: "✨",
        title: "Clear Skies",
        subtitle: "No upcoming event"
    }
};


document.getElementById("currentEmoji").textContent =
    calendar.current.emoji;

document.getElementById("currentTitle").textContent =
    calendar.current.title;

document.getElementById("currentSubtitle").textContent =
    calendar.current.subtitle;



document.getElementById("nextEmoji").textContent =
    calendar.next.emoji;

document.getElementById("nextTitle").textContent =
    calendar.next.title;

document.getElementById("nextSubtitle").textContent =
    calendar.next.subtitle;


    }


    catch(error){


        console.error(error);


        document.getElementById("currentTitle").textContent =
            "Signal Lost";


        document.getElementById("nextTitle").textContent =
            "Awaiting Orbit";


    }


}





loadObservatory();


setInterval(loadObservatory,60000);

async function updateObservatoryTemp() {
  try {

    const weather = await fetch(
      "/weather?nocache=" + Date.now()
    ).then(r => r.json());

    let tempF = null;
    let tempC = null;


    // ------------------------------------------------------------
    // 🌡️ WEATHER UNDERGROUND / OBSERVATION FORMAT
    // ------------------------------------------------------------

    if (weather?.observations?.[0]) {

      const obs = weather.observations[0];

      tempF = obs?.imperial?.temp ?? null;

      // Use metric value if the API already provides it
      tempC = obs?.metric?.temp ?? null;


    // ------------------------------------------------------------
    // 🌡️ FALLBACK WEATHER FORMAT
    // ------------------------------------------------------------

    } else if (weather?.current) {

      tempF = weather.current.temp ?? null;

    }


    // ------------------------------------------------------------
    // 🌍 CALCULATE CELSIUS IF NEEDED
    // ------------------------------------------------------------

    if (tempF !== null && tempC === null) {

      tempC = Math.round(
        (tempF - 32) * 5 / 9
      );

    }


    console.log(
      "Observatory temp:",
      tempF,
      tempC
    );


    // ------------------------------------------------------------
    // ✨ DISPLAY
    // ------------------------------------------------------------

    const tempElement =
      document.getElementById("observatoryTemp");


    if (tempF !== null) {

      tempElement.textContent =
        `${Math.round(tempF)}°F • ${Math.round(tempC)}°C`;

    } else {

      tempElement.textContent =
        "--°F • --°C";

    }


  } catch (error) {

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


updateObservatoryTemp();

setInterval(
  updateObservatoryTemp,
  300000
);