/* ===================================
   PROJECT CONSTELLATION
   Main Controller
   Aurora Moon Tarot Stream Widget
=================================== */


const alertWindow =
    document.getElementById("constellation-alert");

const alertTitle =
    document.getElementById("alert-title");

const alertMessage =
    document.getElementById("alert-message");

const alertImage =
    document.getElementById("alert-image");



/*
    Show the constellation alert
*/

function showConstellationAlert(data) {


    const name =
        data.name || "Moonbeam";


    const message =
        data.message ||
        getConstellationMessage("follow", name);



    alertTitle.textContent =
        name;


    alertMessage.textContent =
        message;



    if (data.img) {

        alertImage.style.backgroundImage =
            `url(${data.img})`;

        alertImage.style.backgroundSize =
            "cover";

        alertImage.style.backgroundPosition =
            "center";

    }



    alertWindow.style.opacity = "1";


    alertWindow.style.transform =
        "translate(-50%, -50%) scale(1)";



    constellationEffects.welcome();



    setTimeout(() => {

        hideConstellationAlert();

    }, 7000);

}



/*
    Hide alert
*/

function hideConstellationAlert() {


    alertWindow.style.opacity = "0";


    alertWindow.style.transform =
        "translate(-50%, -50%) scale(.9)";

}



/*
    Aurora Moon Haven Constellation Stream
    Connects to Astrea's server
*/


constellationSource =
    new EventSource(
        "http://localhost:3000/constellationstream"
    );


constellationSource.onopen = () => {

    console.log(
        "✨ Constellation signal connected"
    );

};


constellationSource.onmessage = (event) => {

    try {

        const data =
            JSON.parse(event.data);


        console.log(
            "🌌 Constellation received:",
            data
        );


        if (data.type === "status") {
            return;
        }


        showConstellationAlert({

            name:
                data.user || "Moonbeam",


            message:
                data.message ||
                getConstellationMessage(
                    data.type,
                    data.user
                ),


            img:
                data.img || ""

        });


    } catch (err) {

        console.error(
            "Constellation message error:",
            err
        );

    }

};


constellationSource.onerror = (err) => {

    console.error(
        "🌙 Constellation signal lost:",
        err
    );

};