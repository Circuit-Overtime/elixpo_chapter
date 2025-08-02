document.getElementById("cutBtn").addEventListener("click", () => {
    document.querySelector(".FirstRowSecondLayoutInnovate .imageTilePremiereImage").style.background = "url(https://firebasestorage.googleapis.com/v0/b/videolize-3563f.appspot.com/o/cut.png?alt=media&token=e635effd-b95f-47bb-80fb-96726de1ebf1)";
    document.querySelector(".FirstRowSecondLayoutInnovate .imageTilePremiereImage").style.backgroundSize = "cover";
    document.getElementById("textPronounce").innerHTML = `Cut <b>/kʌt/</b>`;
    if(document.getElementById("textMeaning").innerHTML != "divide into pieces")
    {
        typeWriterEffectHTML("textMeaning", "divide into pieces");
    }  
})

document.getElementById("litBtn").addEventListener("click", () => {
    document.getElementById("textPronounce").innerHTML = `Lit <b>/lɪt/</b>`;
    document.querySelector(".FirstRowSecondLayoutInnovate .imageTilePremiereImage").style.background = "url(https://firebasestorage.googleapis.com/v0/b/videolize-3563f.appspot.com/o/lit.png?alt=media&token=b13c79d7-b725-4930-9ffe-db9b5b576c76)";
    document.querySelector(".FirstRowSecondLayoutInnovate .imageTilePremiereImage").style.backgroundSize = "cover";
    document.getElementById("textPronounce").innerHTML = `Lit <b>/lɪt/</b>`;
    if(document.getElementById("textMeaning").innerHTML != "exciting arrangement")
    {
        typeWriterEffectHTML("textMeaning", "exciting arrangement");
    } 
})

document.getElementById("setBtn").addEventListener("click", () => {
    document.querySelector(".FirstRowSecondLayoutInnovate .imageTilePremiereImage").style.background = "url(https://firebasestorage.googleapis.com/v0/b/videolize-3563f.appspot.com/o/set.png?alt=media&token=6769e988-e3e6-45c3-9ce0-cbe9322215e1)";
    document.querySelector(".FirstRowSecondLayoutInnovate .imageTilePremiereImage").style.backgroundSize = "cover";
    document.getElementById("textPronounce").innerHTML = `Set <b>/sɛt/</b>`;
    if(document.getElementById("textMeaning").innerHTML != "put or make specific")
    {
        typeWriterEffectHTML("textMeaning", "put or make specific");
    }
})

document.getElementById("Colorgrade").addEventListener("click", () => {
    if(document.getElementById("ColorgradeText").innerHTML == "Analogous")
    {
        document.getElementById("ColorgradeText").innerHTML = "Moody";
    }
    else
    {
        document.getElementById("ColorgradeText").innerHTML = "Analogous";
    }
})