/* ===================================
   PROJECT CONSTELLATION
   Cosmic Effects
   Aurora Moon Tarot Stream Widget
=================================== */


const constellationEffects = {


    /*
        Creates a small burst of stars
    */

    starBurst() {

        const layer = document.getElementById("effect-layer");

        if (!layer) return;


        for (let i = 0; i < 20; i++) {

            const star = document.createElement("div");

            star.className = "constellation-star";


            star.style.left =
                Math.random() * 100 + "%";

            star.style.top =
                Math.random() * 100 + "%";


            star.style.animationDelay =
                Math.random() * 0.5 + "s";


            layer.appendChild(star);


            setTimeout(() => {

                star.remove();

            }, 2000);

        }

    },



    /*
        Gentle glow pulse
    */

    glowPulse() {

        const alert =
            document.getElementById("constellation-alert");


        if (!alert) return;


        alert.classList.add("cosmic-pulse");


        setTimeout(() => {

            alert.classList.remove("cosmic-pulse");

        }, 1200);

    },



    /*
        Full welcome effect
    */

    welcome() {

        this.starBurst();

        this.glowPulse();

    }


};