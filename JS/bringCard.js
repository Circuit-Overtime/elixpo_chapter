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


document.getElementById("linkAccept").focus();
let index = 0,
    interval = 1000;

const rand = (min, max) => 
  Math.floor(Math.random() * (max - min + 1)) + min;

const animate = star => {
  star.style.setProperty("--star-left", `${rand(-10, 100)}%`);
  star.style.setProperty("--star-top", `${rand(-40, 80)}%`);

  star.style.animation = "none";
  star.offsetHeight;
  star.style.animation = "";
}

for(const star of document.getElementsByClassName("magic-starDir1")) {
  setTimeout(() => {
    animate(star);
    
    setInterval(() => animate(star), 1000);
  }, index++ * (interval / 3))
}
for(const star of document.getElementsByClassName("magic-starDir2")) {
    setTimeout(() => {
      animate(star);
      
      setInterval(() => animate(star), 1000);
    }, index++ * (interval / 3))
  }

  document.getElementById("fetchCard").addEventListener("click", () => {
    const cardSecret = document.getElementById("linkAccept").value.trim().toLowerCase();
    if(document.getElementById("linkAccept").value.trim() != "")
    {
      document.querySelector(".spinner").style.opacity = "1";
      document.getElementById("fetchCard").style.opacity = "0.4";
      document.getElementById("fetchCard").style.pointerEvents = "none";
  
      enteredUrl = document.getElementById("linkAccept").value.trim();
      db.collection("links").doc(cardSecret).get().then((doc) => {
        sessionStorage.setItem("birthdayLinkDetails", enteredUrl);
        sessionStorage.setItem("birthdayAgeNumber", doc.data().age);
        setTimeout(() => {
          document.querySelector(".spinner").style.opacity = "0";
          location.replace("wish.html");
        }, 1200);
      }) 
      .catch((error) => {
        document.querySelector(".spinner").style.opacity = "0";
        document.getElementById("fetchCard").style.opacity = "1";
        document.getElementById("fetchCard").style.pointerEvents = "all";
        document.getElementById("linkAccept").value =  "The entered code doesn't exist";
        setTimeout(() => {
          document.getElementById("linkAccept").value = "";
          document.getElementById("linkAccept").focus();
        }, 2500)
      });
    }
    else 
    {
      document.getElementById("linkAccept").setAttribute("placeholder", "Please Put a Valid Secret Code!");
      setTimeout(() => {
        document.getElementById("linkAccept").setAttribute("placeholder", "Paste or Write the Secret Card Code");
        document.getElementById("linkAccept").focus();
      }, 2500)
    }

  })


  document.getElementById("makeCardCard").addEventListener("click", () => {
    location.replace("birthdayCard.html")
  })


