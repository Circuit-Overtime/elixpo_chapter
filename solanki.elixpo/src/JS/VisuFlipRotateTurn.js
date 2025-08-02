document.getElementById("FirstRowFirstLayout").addEventListener("mouseover", () => {
    const animateStar= 
    {
        rotate : "270deg",
        opacity : 0,
    }
    document.getElementById("Tilestar2").animate(animateStar, { duration: 400, fill: "forwards" });
    document.getElementById("Tilestar2").style.left = "250px";
    document.getElementById("Tilestar1").style.left = "250px";
    setTimeout(() => {
        document.getElementById("Tilestar1").animate(animateStar, { duration: 400, fill: "forwards" });
    }, 200);
   
    document.querySelector(".FirstRowFirstLayout .iconTileSurf").style.transform = "translateX(0px)";
    document.getElementById("FirstRowFirstLayout").style.overflow = "visible";
})

document.getElementById("FirstRowFirstLayout").addEventListener("mouseout", () => {
    const animateStar= 
    {
        rotate : "0deg",
        opacity : 1,
    }
    document.getElementById("Tilestar2").animate(animateStar, { duration: 400, fill: "forwards" });
    document.getElementById("Tilestar2").style.left = "18%";
    document.getElementById("Tilestar1").style.left = "0px";
    setTimeout(() => {
        document.getElementById("Tilestar1").animate(animateStar, { duration: 400, fill: "forwards" });
    }, 200);
    document.getElementById("FirstRowFirstLayout").style.overflow = "hidden";
    document.querySelector(".FirstRowFirstLayout .iconTileSurf").style.transform = "translateX(-400px)";
})