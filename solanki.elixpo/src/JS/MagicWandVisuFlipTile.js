document.getElementById("FirstRowThirdLayout").addEventListener("mouseover", () => {
    document.querySelector(".flip-card-inner").style.transform = "rotateY(180deg)";
    document.querySelector(".flip-card-innerSmall").style.transform = "rotateY(180deg)";
})
document.getElementById("FirstRowThirdLayout").addEventListener("mouseout", () => {
    document.querySelector(".flip-card-inner").style.transform = "rotateY(0deg)";
    document.querySelector(".flip-card-innerSmall").style.transform = "rotateY(0deg)";
})