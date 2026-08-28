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
    const weather = await fetch("/weather?nocache=" + Date.now()).then(r => r.json());

    let temp = null;

    if (weather?.observations?.[0]) {
      const obs = weather.observations[0];
      temp = obs?.imperial?.temp ?? null;

    } else if (weather?.current) {
      temp = weather.current.temp ?? null;
    }

    console.log("Observatory temp:", temp);

    document.getElementById("observatoryTemp").textContent =
      `${temp ?? "--"}°`;

  } catch (error) {
    console.error("Observatory temp error:", error);
    document.getElementById("observatoryTemp").textContent = "--°";
  }
}

updateObservatoryTemp();
setInterval(updateObservatoryTemp, 300000);