document.getElementById("photoshopMockup").addEventListener("click", (e) => {
    console.log(e.target.id)
    if(e.target.id == "colorChange1")
    {
        if (!((document.getElementById("tileforPSBacklit").classList.contains("effect")) && document.getElementById("tileforPSBacklitParticles").classList.contains("effect")))
        {
            document.getElementById("wandVisuMagicThree").style.animation = "shake 1s linear forwards";
            document.getElementById("tileforPSBacklit").classList.add("effect");
            document.getElementById("tileforPSBacklitParticles").classList.add("effect");
            document.getElementById("tileforPSBacklit").style.opacity = "1";
            document.getElementById("tileforPSBacklitParticles").style.opacity = "1";
            setTimeout(() => {
                document.getElementById("wandVisuMagicThree").style.animation = "";
            }, 800);
        }
        document.getElementById("tileforPSBacklit").style.background = "#ec3262";
    }
    else if(e.target.id == "colorChange2")
    {
        if (!((document.getElementById("tileforPSBacklit").classList.contains("effect")) && document.getElementById("tileforPSBacklitParticles").classList.contains("effect")))
        {
            document.getElementById("wandVisuMagicThree").style.animation = "shake 1s linear forwards";
            document.getElementById("tileforPSBacklit").classList.add("effect");
            document.getElementById("tileforPSBacklitParticles").classList.add("effect");
            document.getElementById("tileforPSBacklit").style.opacity = "1";
            document.getElementById("tileforPSBacklitParticles").style.opacity = "1";
            setTimeout(() => {
                document.getElementById("wandVisuMagicThree").style.animation = "";
            }, 800);
        }
        document.getElementById("tileforPSBacklit").style.background = "#32f29f";
    }

    else if((document.getElementById("tileforPSBacklit").classList.contains("effect")) && document.getElementById("tileforPSBacklitParticles").classList.contains("effect"))
    {
    document.getElementById("wandVisuMagicThree").style.animation = "shake 1s linear forwards";
    setTimeout(() => {
        document.getElementById("wandVisuMagicThree").style.animation = "";
    }, 800);
    document.getElementById("tileforPSBacklit").classList.remove("effect");
    document.getElementById("tileforPSBacklitParticles").classList.remove("effect");
    document.getElementById("tileforPSBacklit").style.opacity = "0";
    document.getElementById("tileforPSBacklitParticles").style.opacity = "0";
    }
    else
    {
        document.getElementById("tileforPSBacklit").style.background = "#5411da";
        document.getElementById("wandVisuMagicThree").style.animation = "shake 1s linear forwards";
        document.getElementById("tileforPSBacklit").classList.add("effect");
        document.getElementById("tileforPSBacklitParticles").classList.add("effect");
        document.getElementById("tileforPSBacklit").style.opacity = "1";
        document.getElementById("tileforPSBacklitParticles").style.opacity = "1";
        setTimeout(() => {
            document.getElementById("wandVisuMagicThree").style.animation = "";
        }, 800);
    }
    
})

