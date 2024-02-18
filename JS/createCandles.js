

const firebaseConfig = {
    apiKey: "AIzaSyDMhQHacKgiUGqOHaPzJ9qhKT2rdH5Rlt4",
    authDomain: "birthday-1340e.firebaseapp.com",
    projectId: "birthday-1340e",
    storageBucket: "birthday-1340e.appspot.com",
    messagingSenderId: "714776227684",
    appId: "1:714776227684:web:6b573288215ab6c4091471"
  };

  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);   
  const db = firebase.firestore();




const candleCount = 20;
const candleWidth = 16; // Width of each candle
const candleHeight = 50; // Height of each candle
let overlap = false;
const confettiCount = 600;
// Function to generate random non-overlapping positions

// Calculate the available horizontal space for candles
const availableSpace = 310 - 10; // Maximum left position - Minimum left position
const spaceBetweenCandles = availableSpace / (candleCount - 1); // Calculate spacing between candles

function createCandles(n)
{
    for (let i = 0; i < n; i++) {
        const randomColor = "#" + Math.floor(Math.random() * 16777215).toString(16);
        const animationDelay = Math.floor(Math.random() * (3 - 1 + 1)) + 1;
        
        const candleElement = document.createElement("div");
        candleElement.classList.add("candle");
        candleElement.innerHTML = `<div class="flame" style="animation: flicker ${animationDelay}s ease-in-out alternate infinite;"></div>`;
        candleElement.style.opacity = "0"
        
        // Calculate left position
        const left = 20 + i * spaceBetweenCandles;
        candleElement.style.left = left + "px";
        candleElement.style.background = randomColor;
        // Randomize top position between -20 and 10
        const top = Math.floor(Math.random() * (5 - (-10) + 1)) + (-10);
        candleElement.style.top = top + "px";
        
        document.getElementById("cake").appendChild(candleElement);
        
    }
    for(let i = 0; i < n; i++)
    {
        const transitionDelay = Math.floor(Math.random() * (1 - 0.2 + 0.2)) + 0.2;
        document.querySelectorAll(".candle").forEach(elm => {
            document.querySelectorAll("."+elm.classList[0])[i].style.animationDelay = transitionDelay+"s";
            document.querySelectorAll("."+elm.classList[0])[i].style.animation = "appearBlur 1s linear forwards";

        })
    }
}


function blowCandles() {
    const visibleFlames = document.querySelectorAll(".flame:not(.hidden)");

    if (visibleFlames.length === 0) return; // No visible flames to blow

    // Calculate the nearest exponent of 2 to the number of visible flames
    const n = Math.pow(2, Math.ceil(Math.log2(visibleFlames.length)));

    // Shuffle the array of visible flames to randomize the blowing order
    const shuffledFlames = Array.from(visibleFlames);
    shuffledFlames.sort(() => Math.random() - 0.5);

    // Iterate over the shuffled array and hide flames in the first n positions
    for (let i = 0; i < n/2 && i < shuffledFlames.length; i++) {
        shuffledFlames[i].classList.add("hidden");
    }
}

for(let m = 0; m < confettiCount; m++)
{
    confettiElm = `<div class="confetti-piece"></div>`;
    document.querySelector(".confetti").innerHTML += confettiElm;
}


function typeWriterErrorHTML(idOfTextHolder, textToType, speed) {
    var i = 0;
    var speed = speed || 25; // Default speed if not provided
    document.getElementById(idOfTextHolder).innerHTML = "";
    function type() {
        if (i < textToType.length) {
            document.getElementById(idOfTextHolder).innerHTML += textToType.charAt(i);
            i++;
            setTimeout(type, speed);
        }
         if(i == textToType.length )
         {
            document.getElementById("reloadSite").style.opacity = "1";
            document.getElementById("reloadSite").style.pointerEvents = "all";
         }
    }
    type(); // Call the function to start the typing effect
}

db.collection("links").doc(sessionStorage.getItem("birthdayLinkDetails")).get().then((doc) => {

    createCandles(doc.data().age);
  })


  window.onload = e =>
  {
    if((sessionStorage.getItem("birthdayAgeNumber") != null) || (sessionStorage.getItem("birthdayLinkDetails") != null))
    {
        createCandles(sessionStorage.getItem("birthdayAgeNumber"));
    }
    else 
    {
        location.replace("linkRedirecrt.html");
    }
  }

  document.getElementById("reloadSite").addEventListener("click", () => {
    location.reload();
  })


  document.getElementById("githubRedirect").addEventListener("click", () =>{
    location.href = ("https://github.com/Circuit-Overtime/Birthday");
  })

  document.getElementById("createCardRedirect").addEventListener("click", () =>{
    location.replace("birthdayCard.html");
  })
  document.getElementById("instagramRedirect").addEventListener("click", () =>{
    location.href = ("https://www.instagram.com/_b00lean_/");
  })